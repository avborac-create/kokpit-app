"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { ekonomiDuzenleyebilirMi } from "@/core/auth/finans-yetki";
import { pushGonder } from "@/core/bildirim/push";
import { duzeltmeOnaylayabilirMi } from "./duzeltme-onay";

const yuvarla = (n: number) => Math.round(n * 100) / 100;

function yenile(dosyaId?: string | null) {
  revalidatePath("/kokpit/hizli-veri-girisi/para-trafigi");
  revalidatePath("/kokpit/finans/para-havuzu");
  if (dosyaId) revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

// Herhangi bir personel gelen odemeyi kaydeder. Kayit TEYIT_BEKLIYOR baslar: cari hareket olusmaz,
// bakiyeye katilmaz; teyit yetkilisi (finans yetkilisi / yonetici) bankadan bakip teyit edince islenir.
export async function gelenOdemeKaydet(formData: FormData): Promise<{ hata?: string }> {
  try {
    const k = await mevcutKullanici();
    if (!k) throw new Error("Oturum bulunamadı.");
    const tutar = yuvarla(Number(String(formData.get("tutar") ?? "").replace(",", ".")));
    if (!Number.isFinite(tutar) || tutar <= 0) throw new Error("Tutar sıfırdan büyük olmalıdır.");
    const tarihHam = String(formData.get("tarih") ?? "");
    if (!tarihHam) throw new Error("Tarih zorunludur.");
    const belgeUrl = String(formData.get("belgeUrl") ?? "");
    const dekontSonra = formData.get("dekontSonra") === "1";
    if (!belgeUrl.startsWith("https://") && !dekontSonra) throw new Error("Önce dekontu yükleyin ya da “Dekontu sonra yükleyeceğim” kutusunu işaretleyin.");
    const dosyaId = String(formData.get("dosyaId") ?? "") || null;
    let musteriId: string | null = null;
    if (dosyaId) {
      const muvekkiller = await prisma.dosyaMuvekkili.findMany({ where: { dosyaId }, select: { musteriId: true } });
      if (muvekkiller.length === 1) musteriId = muvekkiller[0].musteriId;
    }
    const odeyen = String(formData.get("odeyenAdi") ?? "").trim().slice(0, 200) || null;
    const kayit = await prisma.gelenOdemeKaydi.create({
      data: {
        tarih: new Date(tarihHam),
        tutar,
        odeyenAdi: odeyen,
        aciklama: String(formData.get("aciklama") ?? "").trim().slice(0, 1000) || null,
        belgeUrl: belgeUrl.startsWith("https://") ? belgeUrl : null,
        belgeAd: String(formData.get("belgeAd") ?? "").slice(0, 200) || null,
        belgeTur: String(formData.get("belgeTur") ?? "").slice(0, 100) || null,
        dosyaId,
        musteriId,
        olusturanId: k.kullaniciId,
      },
      select: { id: true },
    });
    if (!belgeUrl.startsWith("https://")) {
      // Dekont sonra yuklenecek: kaydi girene bugun teslimli gorev ac; dekont eklenince otomatik kapanir.
      const bugun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
      await prisma.is.create({
        data: {
          baslik: `Dekont yükle: ${tutar.toLocaleString("tr-TR")} TL${odeyen ? ` — ${odeyen}` : ""}`.slice(0, 200),
          aciklama: "Gelen ödeme dekontsuz kaydedildi. Hızlı Veri Girişi › Para Trafiği Kaydet sayfasında ilgili kaydın altındaki “Dekontu yükle” düğmesiyle dekontu ekleyin; görev kendiliğinden kapanır.",
          sorumluId: k.kullaniciId,
          olusturanId: k.kullaniciId,
          kaynak: `odeme-dekont:${kayit.id}`,
          tur: "PARCA",
          sinif: "ANA",
          zamanBaskisi: "TESLIM",
          vade: new Date(bugun),
        },
      });
      revalidatePath("/kokpit/isler");
    }
    const yetkililer = await prisma.kullanici.findMany({ where: { aktifMi: true, finansYetkilisiMi: true, id: { not: k.kullaniciId } }, select: { id: true } });
    if (yetkililer.length > 0) {
      await pushGonder(
        yetkililer.map((x) => x.id),
        {
          baslik: "💰 Teyit bekleyen ödeme",
          metin: `${k.adSoyad}: ${tutar.toLocaleString("tr-TR")} TL${odeyen ? ` — ${odeyen}` : ""}`.slice(0, 180),
          url: "/kokpit/hizli-veri-girisi/para-trafigi",
          etiket: `odeme-${kayit.id}`,
        },
      );
    }
    yenile(dosyaId);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

// Dekontsuz girilmis kayda sonradan dekont ekler; ilgili "Dekont yukle" gorevini kapatir.
export async function gelenOdemeDekontEkle(id: string, belgeUrl: string, belgeAd: string, belgeTur: string): Promise<{ hata?: string }> {
  try {
    const k = await mevcutKullanici();
    if (!k) throw new Error("Oturum bulunamadı.");
    if (!belgeUrl.startsWith("https://")) throw new Error("Geçersiz dosya.");
    const o = await prisma.gelenOdemeKaydi.findUnique({ where: { id } });
    if (!o) throw new Error("Kayıt bulunamadı.");
    if (o.olusturanId !== k.kullaniciId && !(await ekonomiDuzenleyebilirMi())) throw new Error("Bu kayda dekont ekleme yetkiniz yok.");
    await prisma.gelenOdemeKaydi.update({ where: { id }, data: { belgeUrl, belgeAd: belgeAd.slice(0, 200), belgeTur: belgeTur.slice(0, 100) } });
    await prisma.is.updateMany({
      where: { kaynak: `odeme-dekont:${id}`, durum: { not: "TAMAMLANDI" } },
      data: { durum: "TAMAMLANDI", tamamlanmaTarihi: new Date(), guncellemeTarihi: new Date() },
    });
    revalidatePath("/kokpit/isler");
    yenile(o.dosyaId);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Eklenemedi." };
  }
}

// Teyit: yalniz finans yetkilisi/yonetici; kaydi giren kisi KENDI kaydini teyit edemez.
export async function gelenOdemeTeyitEt(id: string, musteriIdSecimi = ""): Promise<{ hata?: string }> {
  try {
    const k = await mevcutKullanici();
    if (!k || !(await ekonomiDuzenleyebilirMi())) throw new Error("Teyit için yetkiniz yok.");
    const o = await prisma.gelenOdemeKaydi.findUnique({ where: { id } });
    if (!o) throw new Error("Kayıt bulunamadı.");
    if (o.durum === "TEYIT_EDILDI") throw new Error("Bu ödeme zaten teyit edilmiş.");
    if (o.olusturanId === k.kullaniciId) throw new Error("Kaydı giren kişi kendi kaydını teyit edemez.");

    await prisma.$transaction(async (tx) => {
      let cariHareketId: string | null = null;
      let havuzGirisiId: string | null = null;
      const aciklama = `GELEN ÖDEME (teyitli)${o.odeyenAdi ? ` — ${o.odeyenAdi}` : ""}${o.aciklama ? ` — ${o.aciklama}` : ""}`;
      if (o.dosyaId) {
        const musteriId = o.musteriId ?? (musteriIdSecimi || null);
        if (!musteriId) throw new Error("Bu dosyanın birden fazla müvekkili var; teyitte müvekkili seçin.");
        if ((await tx.dosyaMuvekkili.count({ where: { dosyaId: o.dosyaId, musteriId } })) === 0) throw new Error("Seçilen müvekkil bu dosyaya ait değil.");
        const para = await tx.cariHesap.findFirst({ where: { paraHesabiMi: true, grup: "MUVEKKIL" } });
        if (!para) throw new Error("Para Trafiği hesabı bulunamadı.");
        const h = await tx.cariHareketi.create({
          data: { musteriId, dosyaId: o.dosyaId, hesapId: para.id, yon: "ALACAK", tarih: o.tarih, tutar: o.tutar, aciklama },
        });
        cariHareketId = h.id;
      } else {
        const g = await tx.paraHavuzuGirisi.create({
          data: { tarih: o.tarih, tutar: o.tutar, kaynak: o.odeyenAdi, aciklama: o.aciklama, olusturanId: k.kullaniciId },
        });
        havuzGirisiId = g.id;
      }
      await tx.gelenOdemeKaydi.update({
        where: { id },
        data: {
          durum: "TEYIT_EDILDI",
          teyitEdenId: k.kullaniciId,
          teyitZamani: new Date(),
          cariHareketId,
          havuzGirisiId,
          ...(musteriIdSecimi && !o.musteriId ? { musteriId: musteriIdSecimi } : {}),
        },
      });
    });
    if (o.olusturanId) {
      await pushGonder([o.olusturanId], {
        baslik: "✅ Ödeme teyit edildi",
        metin: `${Number(o.tutar).toLocaleString("tr-TR")} TL${o.odeyenAdi ? ` — ${o.odeyenAdi}` : ""}`.slice(0, 180),
        url: "/kokpit/hizli-veri-girisi/para-trafigi",
        etiket: `odeme-${id}`,
      });
    }
    revalidatePath("/kokpit", "layout");
    yenile(o.dosyaId);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Teyit edilemedi." };
  }
}

export async function gelenOdemeTeyitEdilemedi(id: string, neden: string): Promise<{ hata?: string }> {
  try {
    const k = await mevcutKullanici();
    if (!k || !(await ekonomiDuzenleyebilirMi())) throw new Error("Bu işlem için yetkiniz yok.");
    const o = await prisma.gelenOdemeKaydi.findUnique({ where: { id } });
    if (!o) throw new Error("Kayıt bulunamadı.");
    if (o.durum === "TEYIT_EDILDI") throw new Error("Teyit edilmiş kayıt değiştirilemez.");
    if (o.olusturanId === k.kullaniciId) throw new Error("Kaydı giren kişi kendi kaydını sonuçlandıramaz.");
    const sebep = neden.trim().slice(0, 500) || "Hesapta görünmüyor / tutarsız";
    await prisma.gelenOdemeKaydi.update({
      where: { id },
      data: { durum: "TEYIT_EDILEMEDI", teyitEdenId: k.kullaniciId, teyitZamani: new Date(), teyitNotu: sebep },
    });
    if (o.olusturanId) {
      await pushGonder([o.olusturanId], {
        baslik: "⚠️ Ödeme teyit edilemedi",
        metin: `${Number(o.tutar).toLocaleString("tr-TR")} TL${o.odeyenAdi ? ` — ${o.odeyenAdi}` : ""}: ${sebep}`.slice(0, 180),
        url: "/kokpit/hizli-veri-girisi/para-trafigi",
        etiket: `odeme-${id}`,
      });
    }
    yenile(o.dosyaId);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

// Hatali girilen kaydi duzeltme: teyit edilmemis kayit; kaydi giren kisi ya da yetkili.
// "Teyit edilemedi" kayit duzeltilince yeniden teyide duser.
export async function gelenOdemeDuzenle(id: string, formData: FormData): Promise<{ hata?: string }> {
  try {
    const k = await mevcutKullanici();
    if (!k) throw new Error("Oturum bulunamadı.");
    const o = await prisma.gelenOdemeKaydi.findUnique({ where: { id } });
    if (!o) throw new Error("Kayıt bulunamadı.");
    if (o.durum === "TEYIT_EDILDI") throw new Error("Teyit edilmiş kayıt buradan düzeltilemez.");
    if (o.olusturanId !== k.kullaniciId && !(await ekonomiDuzenleyebilirMi())) throw new Error("Bu kaydı düzeltme yetkiniz yok.");
    const tutar = yuvarla(Number(String(formData.get("tutar") ?? "").replace(",", ".")));
    if (!Number.isFinite(tutar) || tutar <= 0) throw new Error("Tutar sıfırdan büyük olmalıdır.");
    const tarihHam = String(formData.get("tarih") ?? "");
    if (!tarihHam) throw new Error("Tarih zorunludur.");
    const dosyaId = String(formData.get("dosyaId") ?? "") || null;
    let musteriId: string | null = null;
    if (dosyaId) {
      const muvekkiller = await prisma.dosyaMuvekkili.findMany({ where: { dosyaId }, select: { musteriId: true } });
      if (muvekkiller.length === 1) musteriId = muvekkiller[0].musteriId;
    }
    await prisma.gelenOdemeKaydi.update({
      where: { id },
      data: {
        tarih: new Date(tarihHam),
        tutar,
        odeyenAdi: String(formData.get("odeyenAdi") ?? "").trim().slice(0, 200) || null,
        aciklama: String(formData.get("aciklama") ?? "").trim().slice(0, 1000) || null,
        dosyaId,
        musteriId,
        ...(o.durum === "TEYIT_EDILEMEDI" ? { durum: "TEYIT_BEKLIYOR", teyitEdenId: null, teyitZamani: null, teyitNotu: null } : {}),
      },
    });
    yenile(o.dosyaId);
    yenile(dosyaId);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Düzeltilemedi." };
  }
}

// Teyitli kayit icin duzeltme TALEBI: kaydi giren ya da yetkili acar; teyit veren onaylayinca uygulanir.
export async function gelenOdemeDuzeltmeTalebiVer(id: string, formData: FormData): Promise<{ hata?: string }> {
  try {
    const k = await mevcutKullanici();
    if (!k) throw new Error("Oturum bulunamadı.");
    const o = await prisma.gelenOdemeKaydi.findUnique({ where: { id } });
    if (!o) throw new Error("Kayıt bulunamadı.");
    if (o.durum !== "TEYIT_EDILDI") throw new Error("Bu kayıt teyitli değil; doğrudan düzeltebilirsiniz.");
    if (o.olusturanId !== k.kullaniciId && !(await ekonomiDuzenleyebilirMi())) throw new Error("Bu kayıt için düzeltme talebi açma yetkiniz yok.");
    if ((await prisma.gelenOdemeDuzeltmeTalebi.count({ where: { kayitId: id, durum: "BEKLIYOR" } })) > 0) throw new Error("Bu kayıt için onay bekleyen bir düzeltme talebi zaten var.");
    const tutar = yuvarla(Number(String(formData.get("tutar") ?? "").replace(",", ".")));
    if (!Number.isFinite(tutar) || tutar <= 0) throw new Error("Tutar sıfırdan büyük olmalıdır.");
    const tarihHam = String(formData.get("tarih") ?? "");
    if (!tarihHam) throw new Error("Tarih zorunludur.");
    const gerekce = String(formData.get("gerekce") ?? "").trim().slice(0, 500);
    if (!gerekce) throw new Error("Düzeltme gerekçesini yazın (ör. tutarı yanlış girdim).");
    const odeyen = String(formData.get("odeyenAdi") ?? "").trim().slice(0, 200) || null;
    const aciklama = String(formData.get("aciklama") ?? "").trim().slice(0, 1000) || null;
    const yeniTarih = new Date(tarihHam);
    if (yuvarla(Number(o.tutar)) === tutar && o.tarih.getTime() === yeniTarih.getTime() && (o.odeyenAdi ?? null) === odeyen && (o.aciklama ?? null) === aciklama) {
      throw new Error("Hiçbir alanı değiştirmediniz.");
    }
    await prisma.gelenOdemeDuzeltmeTalebi.create({
      data: {
        kayitId: id,
        talepEdenId: k.kullaniciId,
        eskiTutar: o.tutar,
        eskiTarih: o.tarih,
        eskiOdeyenAdi: o.odeyenAdi,
        eskiAciklama: o.aciklama,
        yeniTutar: tutar,
        yeniTarih,
        yeniOdeyenAdi: odeyen,
        yeniAciklama: aciklama,
        gerekce,
      },
    });
    const onaylayanlar = o.teyitEdenId && o.teyitEdenId !== k.kullaniciId
      ? [o.teyitEdenId]
      : (await prisma.kullanici.findMany({ where: { aktifMi: true, finansYetkilisiMi: true, id: { not: k.kullaniciId } }, select: { id: true } })).map((x) => x.id);
    if (onaylayanlar.length > 0) {
      await pushGonder(onaylayanlar, {
        baslik: "✏️ Teyitli ödeme için düzeltme talebi",
        metin: `${k.adSoyad}: ${Number(o.tutar).toLocaleString("tr-TR")} → ${tutar.toLocaleString("tr-TR")} TL — ${gerekce}`.slice(0, 180),
        url: "/kokpit/hizli-veri-girisi/para-trafigi",
        etiket: `odeme-duzeltme-${id}`,
      });
    }
    yenile(o.dosyaId);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Talep açılamadı." };
  }
}

// Talebi teyit veren onaylar (kayit + cari hareket / havuz girisi birlikte guncellenir) ya da reddeder.
export async function gelenOdemeDuzeltmeKarari(talepId: string, onay: boolean, not: string): Promise<{ hata?: string }> {
  try {
    const k = await mevcutKullanici();
    if (!k) throw new Error("Oturum bulunamadı.");
    const t = await prisma.gelenOdemeDuzeltmeTalebi.findUnique({ where: { id: talepId } });
    if (!t) throw new Error("Talep bulunamadı.");
    if (t.durum !== "BEKLIYOR") throw new Error("Bu talep zaten sonuçlandırılmış.");
    const o = await prisma.gelenOdemeKaydi.findUnique({ where: { id: t.kayitId } });
    if (!o) throw new Error("Kayıt bulunamadı.");
    const teyitEden = o.teyitEdenId ? await prisma.kullanici.findUnique({ where: { id: o.teyitEdenId }, select: { aktifMi: true } }) : null;
    const yetkili = await ekonomiDuzenleyebilirMi();
    if (!duzeltmeOnaylayabilirMi({ kullaniciId: k.kullaniciId, yetkili, talepEdenId: t.talepEdenId, teyitEdenId: o.teyitEdenId, teyitEdenAktif: !!teyitEden?.aktifMi })) {
      throw new Error("Bu talebi yalnızca kaydı teyit eden yetkili onaylayabilir (talebi açan kişi kendi talebini onaylayamaz).");
    }
    const kararNotu = not.trim().slice(0, 500) || null;
    if (!onay) {
      await prisma.gelenOdemeDuzeltmeTalebi.update({ where: { id: talepId }, data: { durum: "REDDEDILDI", kararVerenId: k.kullaniciId, kararZamani: new Date(), kararNotu } });
    } else {
      await prisma.$transaction(async (tx) => {
        const aciklama = `GELEN ÖDEME (teyitli, düzeltildi)${t.yeniOdeyenAdi ? ` — ${t.yeniOdeyenAdi}` : ""}${t.yeniAciklama ? ` — ${t.yeniAciklama}` : ""}`;
        if (o.cariHareketId) {
          await tx.cariHareketi.update({ where: { id: o.cariHareketId }, data: { tutar: t.yeniTutar, tarih: t.yeniTarih, aciklama } });
        }
        if (o.havuzGirisiId) {
          const dagitilan = await tx.paraHavuzuDagitimi.aggregate({ where: { girisId: o.havuzGirisiId }, _sum: { tutar: true } });
          if (Number(dagitilan._sum.tutar ?? 0) > Number(t.yeniTutar)) {
            throw new Error("Bu para Para Havuzu'ndan yeni tutardan fazla dağıtılmış; önce dağıtımı geri alın, sonra onaylayın.");
          }
          await tx.paraHavuzuGirisi.update({ where: { id: o.havuzGirisiId }, data: { tutar: t.yeniTutar, tarih: t.yeniTarih, kaynak: t.yeniOdeyenAdi, aciklama: t.yeniAciklama } });
        }
        await tx.gelenOdemeKaydi.update({ where: { id: o.id }, data: { tutar: t.yeniTutar, tarih: t.yeniTarih, odeyenAdi: t.yeniOdeyenAdi, aciklama: t.yeniAciklama } });
        await tx.gelenOdemeDuzeltmeTalebi.update({ where: { id: talepId }, data: { durum: "ONAYLANDI", kararVerenId: k.kullaniciId, kararZamani: new Date(), kararNotu } });
      });
    }
    if (t.talepEdenId) {
      await pushGonder([t.talepEdenId], {
        baslik: onay ? "✅ Düzeltme talebiniz onaylandı" : "❌ Düzeltme talebiniz reddedildi",
        metin: `${Number(t.eskiTutar).toLocaleString("tr-TR")} → ${Number(t.yeniTutar).toLocaleString("tr-TR")} TL${kararNotu ? ` — ${kararNotu}` : ""}`.slice(0, 180),
        url: "/kokpit/hizli-veri-girisi/para-trafigi",
        etiket: `odeme-duzeltme-${o.id}`,
      });
    }
    revalidatePath("/kokpit", "layout");
    yenile(o.dosyaId);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "İşlem yapılamadı." };
  }
}

// Teyit edilmemis kaydi silme: kaydi giren kisi ya da yetkili.
export async function gelenOdemeSil(id: string): Promise<{ hata?: string }> {
  try {
    const k = await mevcutKullanici();
    if (!k) throw new Error("Oturum bulunamadı.");
    const o = await prisma.gelenOdemeKaydi.findUnique({ where: { id } });
    if (!o) return {};
    if (o.durum === "TEYIT_EDILDI") throw new Error("Teyit edilmiş kayıt silinemez.");
    if (o.olusturanId !== k.kullaniciId && !(await ekonomiDuzenleyebilirMi())) throw new Error("Bu kaydı silme yetkiniz yok.");
    await prisma.gelenOdemeKaydi.delete({ where: { id } });
    yenile(o.dosyaId);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Silinemedi." };
  }
}
