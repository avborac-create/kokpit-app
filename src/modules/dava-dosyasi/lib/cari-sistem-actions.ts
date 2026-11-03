"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { silmeSifresiniDogrula } from "@/core/auth/silme-dogrulama";
import { dosyaMasrafiEkle } from "@/modules/dava-dosyasi/lib/actions";
import { dosyaEtiketiYaz, kapsamOzeti } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { MUVEKKILE_ODEME } from "@/modules/dava-dosyasi/lib/tasnif-sabitleri";
import { eksiyeDusmeKontrolu, paraBakiyesi } from "@/modules/dava-dosyasi/lib/para-bakiye";
import { cariGunlukle } from "@/core/gunluk/islem-gunlugu";

function yenile() {
  revalidatePath("/kokpit", "layout");
}

async function yoneticiyiDogrula() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) throw new Error("Bu işlem için yetkiniz yok.");
}

async function silmeYetkisiniDogrula(sifre: string | undefined) {
  await silmeSifresiniDogrula(sifre);
  await yoneticiyiDogrula();
}

function tutarAl(formData: FormData): number {
  const tutar = Number(String(formData.get("tutar") ?? "").replace(",", "."));
  if (!Number.isFinite(tutar) || tutar <= 0) throw new Error("Tutar sıfırdan büyük bir sayı olmalıdır.");
  return Math.round(tutar * 100) / 100;
}

function tarihAl(formData: FormData): Date {
  const tarih = String(formData.get("tarih") ?? "");
  if (!tarih) throw new Error("Tarih zorunludur.");
  return new Date(tarih);
}

const metin = (formData: FormData, alan: string) => String(formData.get(alan) ?? "").trim();

// Dosya, bu muvekkile ait mi? (baska muvekkilin dosyasina kayit islenmesin)
async function dosyaMuvekkilinMi(musteriId: string, dosyaId: string) {
  const sayac = await prisma.dosyaMuvekkili.count({ where: { dosyaId, musteriId } });
  if (sayac === 0) throw new Error("Seçilen dosya bu müvekkile ait değil.");
}

// Para geldi: Para Trafigi'ne ALACAK. Dosya duzeyinden girilirse dosyaya
// etiketlenir (muvekkil ekraninda da gorunur); muvekkil duzeyinde dosya bos olabilir.
async function odemeEkle_(musteriId: string, formData: FormData) {
  const dosyaId = metin(formData, "dosyaId") || null;
  if (dosyaId) await dosyaMuvekkilinMi(musteriId, dosyaId);
  const para = await prisma.cariHesap.findFirst({ where: { paraHesabiMi: true } });
  if (!para) throw new Error("Para Trafiği hesabı bulunamadı.");
  const tarih = tarihAl(formData);
  const aciklama = metin(formData, "aciklama") || "GELEN ÖDEME";
  // Tek yontem ya da parcali odeme: her satir (yontem + tutar) ayri bir kayit olarak yazilir.
  const yontemler = formData.getAll("yontemId").map(String);
  const tutarlar = formData.getAll("tutar").map((t) => Number(String(t).replace(",", ".")));
  if (tutarlar.length === 0 || tutarlar.some((t) => !Number.isFinite(t) || t <= 0)) {
    throw new Error("Her satırın tutarı sıfırdan büyük bir sayı olmalıdır.");
  }
  // "Ayni anda virman yap": odeme kaydedildikten hemen sonra, ayni tarihle, secilen hesaba aktarilir.
  const virmanIstendi = metin(formData, "virman") === "1";
  const hedefIdleri = formData.getAll("virmanHedefId").map((x) => String(x).trim());
  const hamTutarlar = formData.getAll("virmanTutari").map((x) => String(x).trim());
  const hamBorclar = formData.getAll("virmanBorcu").map((x) => String(x).trim());
  const toplam = Math.round(tutarlar.reduce((x, y) => x + y, 0) * 100) / 100;
  // Her virman satiri: hedef hesap + tutar (+ istege bagli borclandirma). Tek satirda tutar bos ise odemenin tamami aktarilir.
  const virmanSatirlari: { hedefId: string; tutar: number; borc: string }[] = [];
  if (virmanIstendi) {
    if (!dosyaId) throw new Error("Aynı anda virman için bir dosya seçilmelidir.");
    if (hedefIdleri.length === 0 || hedefIdleri.some((h) => !h)) throw new Error("Virman için hedef hesap seçilmelidir.");
    hedefIdleri.forEach((hedefId, i) => {
      const ham = hamTutarlar[i] ?? "";
      if (!ham && hedefIdleri.length > 1) throw new Error("Birden fazla virman varsa her satırın tutarı yazılmalıdır.");
      const t = ham ? Math.round(Number(ham.replace(",", ".")) * 100) / 100 : toplam;
      if (!Number.isFinite(t) || t <= 0) throw new Error("Virman tutarı sıfırdan büyük olmalıdır.");
      virmanSatirlari.push({ hedefId, tutar: t, borc: hamBorclar[i] ?? "" });
    });
    const virmanToplami = Math.round(virmanSatirlari.reduce((x, y) => x + y.tutar, 0) * 100) / 100;
    if (virmanToplami > toplam + 0.001) {
      throw new Error(`Virman toplamı (${virmanToplami.toLocaleString("tr-TR")} TL), girilen ödemeden (${toplam.toLocaleString("tr-TR")} TL) fazla olamaz.`);
    }
  }
  await prisma.cariHareketi.createMany({
    data: tutarlar.map((t, i) => ({
      musteriId,
      dosyaId,
      hesapId: para.id,
      yon: "ALACAK" as const,
      tarih,
      tutar: Math.round(t * 100) / 100,
      aciklama,
      odemeYontemiId: yontemler[i] || null,
      borcludanMi: metin(formData, "paraKaynagi") === "borclu",
    })),
  });
  if (virmanIstendi && dosyaId) {
    for (const [i, v] of virmanSatirlari.entries()) {
      const vf = new FormData();
      vf.set("hedefHesapId", v.hedefId);
      vf.set("dosyaId", dosyaId);
      vf.set("kaynak", "dosya");
      vf.set("tarih", String(formData.get("tarih") ?? ""));
      vf.set("tutar", String(v.tutar));
      if (v.borc) vf.set("borcTutari", v.borc);
      if (aciklama !== "GELEN ÖDEME") vf.set("aciklama", aciklama);
      try {
        await virmanYap(musteriId, dosyaId, vf);
      } catch (hata) {
        throw new Error(`Ödeme kaydedildi ancak ${i + 1}. virman yapılamadı: ${hata instanceof Error ? hata.message : "bilinmeyen hata"}`);
      }
    }
  }
  yenile();
}

// Para hesabi disindaki bir hesaba (Akdi Vekalet, Bloke Para...) BORC yaz.
async function borcEkle_(musteriId: string, formData: FormData) {
  const hesapId = metin(formData, "hesapId");
  const dosyaId = metin(formData, "dosyaId");
  if (!hesapId || !dosyaId) throw new Error("Hesap ve dosya seçilmelidir.");
  await dosyaMuvekkilinMi(musteriId, dosyaId);
  const hesap = await prisma.cariHesap.findUnique({ where: { id: hesapId } });
  if (!hesap || hesap.paraHesabiMi || hesap.masrafHesabiMi) throw new Error("Bu hesaba buradan borç yazılamaz.");
  await prisma.cariHareketi.create({
    data: {
      musteriId,
      dosyaId,
      hesapId,
      yon: "BORC",
      tarih: tarihAl(formData),
      tutar: tutarAl(formData),
      aciklama: metin(formData, "aciklama") || null,
    },
  });
  yenile();
}

// Harcama (Masraflar): mevcut masraf kaydi akisi; dosya secimi formdan gelir.
async function masrafEkle_(musteriId: string, formData: FormData) {
  const dosyaId = metin(formData, "dosyaId");
  if (!dosyaId) throw new Error("Dosya seçilmelidir.");
  await dosyaMuvekkilinMi(musteriId, dosyaId);
  await dosyaMasrafiEkle(dosyaId, formData);
  yenile();
}

// Virman: Para Trafigi'nden bir dosyanin hesabina. Iki satir (ayni virmanId):
// Para Trafigi'nde BORC, hedef hesapta ALACAK. kapsamDosyaId doluysa dosya
// ekranindan (o dosyanin kendi para bakiyesinden), bossa muvekkil
// havuzundan yapilir.
async function virmanYap_(musteriId: string, kapsamDosyaId: string, formData: FormData) {
  const hedefHesapId = metin(formData, "hedefHesapId");
  const dosyaId = kapsamDosyaId || metin(formData, "dosyaId");
  if (!hedefHesapId || !dosyaId) throw new Error("Hedef hesap ve dosya seçilmelidir.");
  // Kaynak: "havuz" (muvekkil para trafigi), "dosya" (dosyanin para trafigi) ya da
  // "hesap:<id>" (baska bir cari hesaptaki fazla odeme - hesaplar arasi virman).
  const kaynakDeger = metin(formData, "kaynak") || "havuz";
  const hesapKaynakId = kaynakDeger.startsWith("hesap:") ? kaynakDeger.slice(6) : null;
  const havuzdan = !hesapKaynakId && (!kapsamDosyaId || kaynakDeger === "havuz");
  await dosyaMuvekkilinMi(musteriId, dosyaId);
  const tutar = tutarAl(formData);
  const tarih = tarihAl(formData);
  // Kullanicinin notu varsa otomatik virman metninin sonuna eklenir.
  const not = metin(formData, "aciklama");
  const acik = (oto: string) => (not ? `${oto} — ${not}` : oto);
  // Dagitim sirasinda hedef hesabi ayni anda borclandirma (istege bagli): virmandan AYRI bir BORC kaydi yazilir.
  const borcHam = metin(formData, "borcTutari");
  const borcTutari = borcHam ? Math.round(Number(borcHam.replace(",", ".")) * 100) / 100 : 0;
  if (borcHam && (!Number.isFinite(borcTutari) || borcTutari <= 0)) throw new Error("Borçlandırma tutarı sıfırdan büyük bir sayı olmalıdır.");

  await prisma.$transaction(async (tx) => {
    const [para, hedef] = await Promise.all([
      tx.cariHesap.findFirst({ where: { paraHesabiMi: true } }),
      tx.cariHesap.findUnique({ where: { id: hedefHesapId } }),
    ]);
    if (!para || !hedef || hedef.paraHesabiMi) throw new Error("Geçerli bir hedef hesap seçin.");
    if (borcTutari > 0 && hedef.tutulanHesapMi) throw new Error("Adliyede tutulan hesaplar borçlandırılamaz; borçlandırma alanını boş bırakın.");
    const borcYaz = async () => {
      if (borcTutari > 0) {
        await tx.cariHareketi.create({
          data: { musteriId, dosyaId, hesapId: hedef.id, yon: "BORC", tarih, tutar: borcTutari, aciklama: acik("BORÇLANDIRMA") },
        });
      }
    };

    // Hesaplar arasi virman: kaynak hesapta (bu dosyada) fazla odeme olmali; kaynakta BORC, hedefte ALACAK.
    if (hesapKaynakId) {
      const kaynakHesap = await tx.cariHesap.findUnique({ where: { id: hesapKaynakId } });
      if (!kaynakHesap || kaynakHesap.paraHesabiMi) throw new Error("Geçerli bir kaynak hesap seçin.");
      if (kaynakHesap.id === hedef.id) throw new Error("Kaynak ve hedef hesap aynı olamaz.");
      const ozet = await kapsamOzeti({ musteriId, dosyaId });
      const kaynakBakiye = ozet.hesaplar.find((h) => h.hesapId === kaynakHesap.id)?.bakiye ?? 0;
      // Normal hesap: fazla odeme (= -bakiye). Tutulan hesap (adliye): orada duran tutar (= +bakiye).
      const mevcut = Math.max(0, kaynakHesap.tutulanHesapMi ? kaynakBakiye : -kaynakBakiye);
      if (tutar > mevcut + 0.001) {
        throw new Error(
          `${kaynakHesap.no} - ${kaynakHesap.ad} hesabında bu dosyada aktarılabilir tutar ${mevcut.toLocaleString("tr-TR")} TL; daha fazlası aktarılamaz.`,
        );
      }
      const virmanId = randomUUID();
      await tx.cariHareketi.create({
        data: {
          musteriId, dosyaId, hesapId: kaynakHesap.id, yon: "BORC", tarih, tutar, virmanId,
          aciklama: acik(`${hedef.no}-${hedef.ad.toLocaleUpperCase("tr-TR")} VİRMAN`),
        },
      });
      await tx.cariHareketi.create({
        data: {
          musteriId, dosyaId, hesapId: hedef.id, yon: "ALACAK", tarih, tutar, virmanId,
          aciklama: acik(`${kaynakHesap.no}-${kaynakHesap.ad.toLocaleUpperCase("tr-TR")} VİRMAN`),
        },
      });
      await borcYaz();
      return;
    }

    const kaynak = await paraBakiyesi(tx, musteriId, havuzdan ? undefined : kapsamDosyaId);
    if (tutar > kaynak + 0.001) {
      throw new Error(
        `${havuzdan ? "Müvekkil havuzunda" : "Bu dosyanın para trafiğinde"} ${kaynak.toLocaleString("tr-TR")} TL var; daha fazlası aktarılamaz.`,
      );
    }
    const virmanId = randomUUID();
    await tx.cariHareketi.create({
      data: {
        musteriId, dosyaId, hesapId: para.id, yon: "BORC", tarih, tutar, virmanId,
        havuzKaynakli: havuzdan,
        aciklama: acik(`${hedef.no}-${hedef.ad.toLocaleUpperCase("tr-TR")} VİRMAN`),
      },
    });
    await tx.cariHareketi.create({
      data: {
        musteriId, dosyaId, hesapId: hedef.id, yon: "ALACAK", tarih, tutar, virmanId,
        aciklama: acik(`${para.no}-${para.ad.toLocaleUpperCase("tr-TR")} VİRMAN`),
      },
    });
    await borcYaz();
  });
  yenile();
}

async function hareketSil_(id: string, sifre?: string) {
  await silmeYetkisiniDogrula(sifre);
  await prisma.$transaction(async (tx) => {
    const h = await tx.cariHareketi.findUnique({ where: { id } });
    if (!h) return;
    await tx.cariHareketi.delete({ where: { id } });
    await eksiyeDusmeKontrolu(tx, h.musteriId, h.dosyaId);
  });
  yenile();
}

async function virmanSil_(virmanId: string, sifre?: string) {
  await silmeYetkisiniDogrula(sifre);
  await prisma.$transaction(async (tx) => {
    const satirlar = await tx.cariHareketi.findMany({ where: { virmanId } });
    await tx.cariHareketi.deleteMany({ where: { virmanId } });
    const ilk = satirlar[0];
    if (ilk) await eksiyeDusmeKontrolu(tx, ilk.musteriId, ilk.dosyaId);
  });
  yenile();
}

// Tarih / tutar / aciklama sonradan duzeltilebilir (virman satirlari haric -
// onlari silip yeniden yapin). Tutar dusurulurse Para Trafigi eksiye dusemez.
async function hareketGuncelle_(id: string, formData: FormData) {
  const tutar = tutarAl(formData);
  const tarih = tarihAl(formData);
  const aciklama = metin(formData, "aciklama") || null;
  const yontemId = formData.has("yontemId") ? metin(formData, "yontemId") || null : undefined;
  const donus = await prisma.$transaction(async (tx) => {
    const h = await tx.cariHareketi.findUnique({ where: { id }, include: { hesap: true } });
    if (!h) throw new Error("Kayıt bulunamadı.");
    if (h.virmanId) throw new Error("Virman kayıtları düzenlenemez; silip yeniden yapın.");
    await tx.cariHareketi.update({
      where: { id },
      data: { tarih, tutar, aciklama, ...(yontemId !== undefined ? { odemeYontemiId: yontemId } : {}) },
    });
    await eksiyeDusmeKontrolu(tx, h.musteriId, h.dosyaId);
    return { musteriId: h.musteriId, dosyaId: h.dosyaId, hesapNo: h.hesap.no };
  });
  yenile();
  redirect(
    `/kokpit/finans/musteri-iliskileri/${donus.musteriId}/cari-hesap?sayfa=${donus.dosyaId ?? "genel"}&alt=${donus.hesapNo}`,
  );
}

// Defterde yerinde duzenleme (sayfa degistirmez, hatayi pencereye dondurur).
// hareket: tarih / tutar / aciklama (+ odeme sekli). virman: iki bagli satirin
// tarih ve tutari birlikte guncellenir (yoneticiye ozel); Para Trafigi eksiye dusemez.
async function satirGuncelle_(tip: "hareket" | "virman", id: string, formData: FormData): Promise<{ hata?: string }> {
  try {
    const tutar = tutarAl(formData);
    const tarih = tarihAl(formData);
    if (tip === "virman") {
      await yoneticiyiDogrula();
      await prisma.$transaction(async (tx) => {
        const satirlar = await tx.cariHareketi.findMany({ where: { virmanId: id } });
        if (satirlar.length === 0) throw new Error("Virman bulunamadı.");
        await tx.cariHareketi.updateMany({ where: { virmanId: id }, data: { tarih, tutar } });
        if (formData.has("aciklama")) {
          const not = metin(formData, "aciklama");
          for (const s of satirlar) {
            const taban = (s.aciklama ?? "").split(" — ")[0];
            await tx.cariHareketi.update({ where: { id: s.id }, data: { aciklama: not ? `${taban} — ${not}` : taban } });
          }
        }
        const gorulen = new Set<string>();
        for (const s of satirlar) {
          const anahtar = `${s.musteriId}|${s.dosyaId ?? ""}`;
          if (gorulen.has(anahtar)) continue;
          gorulen.add(anahtar);
          await eksiyeDusmeKontrolu(tx, s.musteriId, s.dosyaId);
        }
      });
    } else {
      const aciklama = metin(formData, "aciklama") || null;
      const yontemId = formData.has("yontemId") ? metin(formData, "yontemId") || null : undefined;
      await prisma.$transaction(async (tx) => {
        const h = await tx.cariHareketi.findUnique({ where: { id } });
        if (!h) throw new Error("Kayıt bulunamadı.");
        if (h.virmanId) throw new Error("Virman kayıtları bu yoldan düzenlenemez.");
        await tx.cariHareketi.update({
          where: { id },
          data: {
            tarih, tutar, aciklama,
            ...(yontemId !== undefined ? { odemeYontemiId: yontemId } : {}),
            ...(formData.has("borcludanForm") ? { borcludanMi: formData.get("borcludan") === "1" } : {}),
          },
        });
        await eksiyeDusmeKontrolu(tx, h.musteriId, h.dosyaId);
      });
    }
    yenile();
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "İşlem başarısız oldu." };
  }
}

// Defterde coklu secim: toplu silme (sifreli) ve toplu tarih degistirme. Yalniz yonetici.
export type TopluOge = { tip: "hareket" | "virman"; id: string };

function topluAyir(ogeler: TopluOge[]) {
  return {
    hareketIdleri: ogeler.filter((o) => o.tip === "hareket").map((o) => o.id),
    virmanIdleri: ogeler.filter((o) => o.tip === "virman").map((o) => o.id),
  };
}

async function topluSil_(ogeler: TopluOge[], sifre?: string): Promise<{ hata?: string }> {
  try {
    await silmeYetkisiniDogrula(sifre);
    if (ogeler.length === 0) throw new Error("Kayıt seçilmedi.");
    const { hareketIdleri, virmanIdleri } = topluAyir(ogeler);
    await prisma.$transaction(async (tx) => {
      const kosul = { OR: [{ id: { in: hareketIdleri } }, { virmanId: { in: virmanIdleri } }] };
      const satirlar = await tx.cariHareketi.findMany({ where: kosul });
      await tx.cariHareketi.deleteMany({ where: kosul });
      const gorulen = new Set<string>();
      for (const s of satirlar) {
        const anahtar = `${s.musteriId}|${s.dosyaId ?? ""}`;
        if (gorulen.has(anahtar)) continue;
        gorulen.add(anahtar);
        await eksiyeDusmeKontrolu(tx, s.musteriId, s.dosyaId);
      }
    });
    yenile();
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "İşlem başarısız oldu." };
  }
}

export type OncekiTarih = { id: string; tarih: string };

// Doner: degisen kayitlarin ESKI tarihleri (geri alma icin).
async function topluTarihDegistir_(ogeler: TopluOge[], tarihMetni: string): Promise<{ hata?: string; onceki?: OncekiTarih[] }> {
  try {
    await yoneticiyiDogrula();
    if (ogeler.length === 0) throw new Error("Kayıt seçilmedi.");
    if (!tarihMetni) throw new Error("Tarih zorunludur.");
    const tarih = new Date(tarihMetni);
    if (Number.isNaN(tarih.getTime())) throw new Error("Geçerli bir tarih girin.");
    const { hareketIdleri, virmanIdleri } = topluAyir(ogeler);
    const kosul = { OR: [{ id: { in: hareketIdleri } }, { virmanId: { in: virmanIdleri } }] };
    const onceki = (await prisma.cariHareketi.findMany({ where: kosul, select: { id: true, tarih: true } })).map((h) => ({
      id: h.id,
      tarih: h.tarih.toISOString(),
    }));
    await prisma.cariHareketi.updateMany({ where: kosul, data: { tarih } });
    yenile();
    return { onceki };
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "İşlem başarısız oldu." };
  }
}

// Toplu tarih degisikligini geri alir: her kaydi eski tarihine dondurur.
export async function tarihleriGeriYukle(onceki: OncekiTarih[]): Promise<{ hata?: string }> {
  try {
    await yoneticiyiDogrula();
    await prisma.$transaction(
      onceki.map((o) => prisma.cariHareketi.update({ where: { id: o.id }, data: { tarih: new Date(o.tarih) } })),
    );
    yenile();
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Geri alma başarısız oldu." };
  }
}

// ---- Hesap yonetimi (admin) ----

export async function hesapEkle(formData: FormData) {
  await yoneticiyiDogrula();
  const no = Number(metin(formData, "no"));
  const ad = metin(formData, "ad");
  if (!Number.isInteger(no) || no <= 0 || !ad) throw new Error("Geçerli bir hesap kodu ve adı girin.");
  // Hesap plani: 100'ler muvekkil, 200'ler borclu, 300'ler adliye hesaplari.
  if (no < 100 || no > 399) throw new Error("Hesap kodu 100–399 aralığında olmalıdır (100'ler müvekkil, 200'ler karşı taraf, 300'ler adliye).");
  const grup = no >= 300 ? "ADLIYE" : no >= 200 ? "BORCLU" : "MUVEKKIL";
  // Adliye hesaplari varsayilan olarak "tutulan" (adliyede duran para) hesabidir.
  const tur = metin(formData, "tur");
  const tutulan = tur ? tur === "tutulan" : grup === "ADLIYE";
  if (await prisma.cariHesap.findUnique({ where: { no } })) throw new Error(`${no} kodlu bir hesap zaten var.`);
  await prisma.cariHesap.create({ data: { no, ad, grup, tutulanHesapMi: tutulan } });
  yenile();
}

export async function hesapGuncelle(id: string, formData: FormData) {
  await yoneticiyiDogrula();
  const ad = metin(formData, "ad");
  if (!ad) throw new Error("Hesap adı boş olamaz.");
  const hesap = await prisma.cariHesap.findUnique({ where: { id } });
  if (!hesap) throw new Error("Hesap bulunamadı.");
  const no = Number(metin(formData, "no") || hesap.no);
  if (!Number.isInteger(no) || no < 100 || no > 399) {
    throw new Error("Hesap kodu 100–399 aralığında olmalıdır (100'ler müvekkil, 200'ler karşı taraf, 300'ler adliye).");
  }
  if (no !== hesap.no) {
    if (hesap.paraHesabiMi) throw new Error("Para Trafiği hesabının kodu değiştirilemez.");
    if (await prisma.cariHesap.findUnique({ where: { no } })) throw new Error(`${no} kodlu bir hesap zaten var.`);
  }
  // Grup, kodun serisinden belirlenir: 100'ler müvekkil, 200'ler karşı taraf, 300'ler adliye.
  const grup = no >= 300 ? "ADLIYE" : no >= 200 ? "BORCLU" : "MUVEKKIL";
  await prisma.cariHesap.update({ where: { id }, data: { ad, no, grup } });
  // Virman satirlari karsi hesabin kodunu aciklama metnine yazar; kod/ad degisince eskimesin.
  if (no !== hesap.no || ad !== hesap.ad) {
    const eskiOnek = `${hesap.no}-${hesap.ad.toLocaleUpperCase("tr-TR")} VİRMAN`;
    const yeniOnek = `${no}-${ad.toLocaleUpperCase("tr-TR")} VİRMAN`;
    const satirlar = await prisma.cariHareketi.findMany({ where: { aciklama: { startsWith: eskiOnek } }, select: { id: true, aciklama: true } });
    for (const x of satirlar) {
      await prisma.cariHareketi.update({ where: { id: x.id }, data: { aciklama: yeniOnek + (x.aciklama ?? "").slice(eskiOnek.length) } });
    }
  }
  yenile();
}

export async function hesapAktifligiDegistir(id: string, aktifMi: boolean) {
  await yoneticiyiDogrula();
  const hesap = await prisma.cariHesap.findUnique({ where: { id } });
  if (hesap?.paraHesabiMi && !aktifMi) throw new Error("Para Trafiği hesabı pasife alınamaz.");
  await prisma.cariHesap.update({ where: { id }, data: { aktifMi } });
  yenile();
}

export async function hesapSil(id: string, sifre?: string) {
  await silmeYetkisiniDogrula(sifre);
  const hesap = await prisma.cariHesap.findUnique({ where: { id } });
  if (!hesap) return;
  if (hesap.paraHesabiMi) throw new Error("Para Trafiği hesabı silinemez.");
  const [hareketSayisi, masrafSayisi, tasnifSayisi, aktarimSayisi] = await Promise.all([
    prisma.cariHareketi.count({ where: { hesapId: id } }),
    hesap.eskiKod ? prisma.dosyaMasrafi.count({ where: { cariKod: { kod: hesap.eskiKod } } }) : 0,
    hesap.eskiKod ? prisma.paraTrafigiTasnif.count({ where: { cariKod: { kod: hesap.eskiKod } } }) : 0,
    hesap.eskiKod ? prisma.dosyaAvansAktarimi.count({ where: { cariKod: { kod: hesap.eskiKod } } }) : 0,
  ]);
  if (hareketSayisi + masrafSayisi + tasnifSayisi + aktarimSayisi > 0) {
    throw new Error("Bu hesapta kayıt var, silinemez. İsterseniz pasife alabilirsiniz.");
  }
  await prisma.cariHesap.delete({ where: { id } });
  yenile();
}

// Dosyayi muvekkil ekonomisinin DISINDA tut / tekrar dahil et. Kayitlar silinmez;
// dosya muvekkil toplamlarina, sayfa sekmelerine ve secim kutularina girmez.
export async function dosyaEkonomiDurumuDegistir(dosyaId: string, disi: boolean) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için oturum açmalısınız.");
  await prisma.davaDosyasi.update({ where: { id: dosyaId }, data: { ekonomiDisi: disi } });
  yenile();
}

// TOPLU TASNIF: para trafigindeki bir parayi tek seferde birden fazla dosya ve hesaba boler.
// Her satir: hedef hesap (virman) ya da "Muvekkile Odeme" (para buroyu terk eder) + dosya + tutar.
// ör. borcludan gelen 50.000 TL -> 36.000 masraf iadesi (Harcama), 14.000 vekalet ucreti
// (Akdi Vekalet); veya muvekkilden gelen 330.000 TL'nin dosyalara/hesaplara ayristirilmasi.
async function topluTasnif_(musteriId: string, kapsamDosyaId: string, formData: FormData) {
  const hedefler = formData.getAll("hedefHesapId").map(String);
  const dosyalar = formData.getAll("dosyaId").map(String);
  const tutarlar = formData.getAll("tutar").map((t) => Number(String(t).replace(",", ".")));
  const aciklamalar = formData.getAll("satirAciklama").map(String);
  const tarih = tarihAl(formData);
  const satirSayisi = hedefler.length;
  if (satirSayisi === 0 || dosyalar.length !== satirSayisi || tutarlar.length !== satirSayisi) {
    throw new Error("En az bir tasnif satırı girmelisiniz.");
  }
  if (tutarlar.some((t) => !Number.isFinite(t) || t <= 0)) throw new Error("Her satırın tutarı sıfırdan büyük olmalıdır.");
  const havuzdan = !kapsamDosyaId || metin(formData, "kaynak") === "havuz";

  await prisma.$transaction(async (tx) => {
    const para = await tx.cariHesap.findFirst({ where: { paraHesabiMi: true } });
    if (!para) throw new Error("Para Trafiği hesabı bulunamadı.");
    const toplam = Math.round(tutarlar.reduce((t, x) => t + x, 0) * 100) / 100;
    const mevcut = await paraBakiyesi(tx, musteriId, havuzdan ? undefined : kapsamDosyaId);
    if (toplam > mevcut + 0.001) {
      throw new Error(
        `Tasnif toplamı ${toplam.toLocaleString("tr-TR")} TL; ${havuzdan ? "müvekkil havuzunda" : "bu dosyanın para trafiğinde"} yalnızca ${mevcut.toLocaleString("tr-TR")} TL var.`,
      );
    }
    for (let i = 0; i < satirSayisi; i++) {
      const dosyaId = kapsamDosyaId || dosyalar[i];
      if (!dosyaId) throw new Error(`${i + 1}. satır için dosya seçilmelidir.`);
      const sayac = await tx.dosyaMuvekkili.count({ where: { dosyaId, musteriId } });
      if (sayac === 0) throw new Error(`${i + 1}. satırdaki dosya bu müvekkile ait değil.`);
      const tutar = Math.round(tutarlar[i] * 100) / 100;
      const not = aciklamalar[i]?.trim();

      if (hedefler[i] === MUVEKKILE_ODEME) {
        await tx.cariHareketi.create({
          data: {
            musteriId, dosyaId, hesapId: para.id, yon: "BORC", tarih, tutar, havuzKaynakli: havuzdan,
            aciklama: `MÜVEKKİLE ÖDENDİ${not ? ` — ${not}` : ""}`,
          },
        });
        continue;
      }
      const hedef = await tx.cariHesap.findUnique({ where: { id: hedefler[i] } });
      if (!hedef || hedef.paraHesabiMi) throw new Error(`${i + 1}. satırda geçerli bir hedef hesap seçin.`);
      const virmanId = randomUUID();
      await tx.cariHareketi.create({
        data: {
          musteriId, dosyaId, hesapId: para.id, yon: "BORC", tarih, tutar, virmanId, havuzKaynakli: havuzdan,
          aciklama: `${hedef.no}-${hedef.ad.toLocaleUpperCase("tr-TR")} VİRMAN${not ? ` — ${not}` : ""}`,
        },
      });
      await tx.cariHareketi.create({
        data: {
          musteriId, dosyaId, hesapId: hedef.id, yon: "ALACAK", tarih, tutar, virmanId,
          aciklama: `${para.no}-${para.ad.toLocaleUpperCase("tr-TR")} VİRMAN${not ? ` — ${not}` : ""}`,
        },
      });
    }
  });
  yenile();
}

// Dosyalar arasi virman: A dosyasindaki bir hesaptaki (fazla odeme / duran tutar) parayi, ayni muvekkilin
// B dosyasindaki bir hesaba aktarir. Iki satir (ayni virmanId): kaynakta BORC, hedefte ALACAK.
// Kaynakta aktarilabilir tutar: Para Trafigi'nde dosyanin kendi bakiyesi, normal hesapta fazla odeme
// (= -bakiye), tutulan (adliye) hesapta orada duran tutar (= +bakiye).
async function dosyalarArasiVirman_(musteriId: string, formData: FormData) {
  const kaynakDosyaId = metin(formData, "kaynakDosyaId");
  const hedefDosyaId = metin(formData, "hedefDosyaId");
  const kaynakHesapId = metin(formData, "kaynakHesapId");
  const hedefHesapId = metin(formData, "hedefHesapId") || kaynakHesapId;
  if (!kaynakDosyaId || !hedefDosyaId || !kaynakHesapId) throw new Error("Kaynak dosya, hedef dosya ve hesap seçilmelidir.");
  if (kaynakDosyaId === hedefDosyaId) throw new Error("Kaynak ve hedef dosya aynı olamaz; aynı dosyada hesaplar arası virman kullanın.");
  await Promise.all([dosyaMuvekkilinMi(musteriId, kaynakDosyaId), dosyaMuvekkilinMi(musteriId, hedefDosyaId)]);
  const tutar = tutarAl(formData);
  const tarih = tarihAl(formData);
  const aciklamaEk = metin(formData, "aciklama");

  await prisma.$transaction(async (tx) => {
    const [kaynakHesap, hedefHesap, dosyalar] = await Promise.all([
      tx.cariHesap.findUnique({ where: { id: kaynakHesapId } }),
      tx.cariHesap.findUnique({ where: { id: hedefHesapId } }),
      tx.davaDosyasi.findMany({
        where: { id: { in: [kaynakDosyaId, hedefDosyaId] } },
        select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, anaDosya: { select: { kayitNo: true } } },
      }),
    ]);
    if (!kaynakHesap || !hedefHesap) throw new Error("Geçerli bir hesap seçin.");
    const etiket = (id: string) => {
      const d = dosyalar.find((x) => x.id === id);
      return d ? dosyaEtiketiYaz(d) : "dosya";
    };

    let mevcut: number;
    if (kaynakHesap.paraHesabiMi) {
      mevcut = Math.max(0, await paraBakiyesi(tx, musteriId, kaynakDosyaId));
    } else {
      const ozet = await kapsamOzeti({ musteriId, dosyaId: kaynakDosyaId });
      const bakiye = ozet.hesaplar.find((h) => h.hesapId === kaynakHesap.id)?.bakiye ?? 0;
      mevcut = Math.max(0, kaynakHesap.tutulanHesapMi ? bakiye : -bakiye);
    }
    if (tutar > mevcut + 0.001) {
      throw new Error(
        `${etiket(kaynakDosyaId)} dosyasındaki ${kaynakHesap.no} - ${kaynakHesap.ad} hesabında aktarılabilir tutar ${mevcut.toLocaleString("tr-TR")} TL; daha fazlası aktarılamaz.`,
      );
    }

    const virmanId = randomUUID();
    const ek = aciklamaEk ? ` — ${aciklamaEk}` : "";
    await tx.cariHareketi.create({
      data: {
        musteriId, dosyaId: kaynakDosyaId, hesapId: kaynakHesap.id, yon: "BORC", tarih, tutar, virmanId,
        aciklama: `${etiket(hedefDosyaId)} DOSYASINA AKTARIM (${hedefHesap.no}-${hedefHesap.ad.toLocaleUpperCase("tr-TR")})${ek}`,
      },
    });
    await tx.cariHareketi.create({
      data: {
        musteriId, dosyaId: hedefDosyaId, hesapId: hedefHesap.id, yon: "ALACAK", tarih, tutar, virmanId,
        aciklama: `${etiket(kaynakDosyaId)} DOSYASINDAN AKTARIM (${kaynakHesap.no}-${kaynakHesap.ad.toLocaleUpperCase("tr-TR")})${ek}`,
      },
    });
  });
  yenile();
}

// ---- Islem gunlugu sarmalayicilari: her islem geri alinabilir / yeniden uygulanabilir ----
export async function odemeEkle(...a: Parameters<typeof odemeEkle_>): ReturnType<typeof odemeEkle_> {
  return cariGunlukle("Ödeme kaydı eklendi", [a[0]], () => odemeEkle_(...a));
}
export async function borcEkle(...a: Parameters<typeof borcEkle_>): ReturnType<typeof borcEkle_> {
  return cariGunlukle("Borç kaydı eklendi", [a[0]], () => borcEkle_(...a));
}
export async function masrafEkle(...a: Parameters<typeof masrafEkle_>): ReturnType<typeof masrafEkle_> {
  return cariGunlukle("Masraf kaydı eklendi", [a[0]], () => masrafEkle_(...a));
}
export async function virmanYap(...a: Parameters<typeof virmanYap_>): ReturnType<typeof virmanYap_> {
  return cariGunlukle("Virman yapıldı", [a[0]], () => virmanYap_(...a));
}
export async function hareketSil(...a: Parameters<typeof hareketSil_>): ReturnType<typeof hareketSil_> {
  return cariGunlukle("Defter satırı silindi", async () => (await prisma.cariHareketi.findMany({ where: { id: a[0] }, select: { musteriId: true } })).map((x) => x.musteriId), () => hareketSil_(...a));
}
export async function virmanSil(...a: Parameters<typeof virmanSil_>): ReturnType<typeof virmanSil_> {
  return cariGunlukle("Virman silindi", async () => (await prisma.cariHareketi.findMany({ where: { virmanId: a[0] }, select: { musteriId: true } })).map((x) => x.musteriId), () => virmanSil_(...a));
}
export async function hareketGuncelle(...a: Parameters<typeof hareketGuncelle_>): ReturnType<typeof hareketGuncelle_> {
  return cariGunlukle("Defter satırı düzenlendi", async () => (await prisma.cariHareketi.findMany({ where: { id: a[0] }, select: { musteriId: true } })).map((x) => x.musteriId), () => hareketGuncelle_(...a));
}
export async function satirGuncelle(...a: Parameters<typeof satirGuncelle_>): ReturnType<typeof satirGuncelle_> {
  return cariGunlukle("Defter satırı düzenlendi", async () => (await prisma.cariHareketi.findMany({ where: a[0] === "virman" ? { virmanId: a[1] } : { id: a[1] }, select: { musteriId: true } })).map((x) => x.musteriId), () => satirGuncelle_(...a));
}
export async function topluSil(...a: Parameters<typeof topluSil_>): ReturnType<typeof topluSil_> {
  return cariGunlukle("Seçili defter kayıtları silindi", async () => (await prisma.cariHareketi.findMany({ where: { OR: [{ id: { in: a[0].filter((o) => o.tip === "hareket").map((o) => o.id) } }, { virmanId: { in: a[0].filter((o) => o.tip === "virman").map((o) => o.id) } }] }, select: { musteriId: true } })).map((x) => x.musteriId), () => topluSil_(...a));
}
export async function topluTarihDegistir(...a: Parameters<typeof topluTarihDegistir_>): ReturnType<typeof topluTarihDegistir_> {
  return cariGunlukle("Defter kayıtlarının tarihi değiştirildi", async () => (await prisma.cariHareketi.findMany({ where: { OR: [{ id: { in: a[0].filter((o) => o.tip === "hareket").map((o) => o.id) } }, { virmanId: { in: a[0].filter((o) => o.tip === "virman").map((o) => o.id) } }] }, select: { musteriId: true } })).map((x) => x.musteriId), () => topluTarihDegistir_(...a));
}
export async function topluTasnif(...a: Parameters<typeof topluTasnif_>): ReturnType<typeof topluTasnif_> {
  return cariGunlukle("Toplu tasnif yapıldı", [a[0]], () => topluTasnif_(...a));
}
export async function dosyalarArasiVirman(...a: Parameters<typeof dosyalarArasiVirman_>): ReturnType<typeof dosyalarArasiVirman_> {
  return cariGunlukle("Dosyalar arası virman yapıldı", [a[0]], () => dosyalarArasiVirman_(...a));
}
