"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { silmeSifresiniDogrula } from "@/core/auth/silme-dogrulama";
import { dosyaMasrafiEkle } from "@/modules/dava-dosyasi/lib/actions";
import { dosyaEtiketiYaz, havuzTuretilenAlacak, kapsamOzeti } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { MUVEKKILE_ODEME } from "@/modules/dava-dosyasi/lib/tasnif-sabitleri";

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

// Para Trafigi bakiyesi (Alacak - Borc). dosyaId verilirse dosya gorunumu
// (muvekkil havuzundan o dosyaya aktarilanlar ALACAK sayilir).
async function paraBakiyesi(tx: Pick<typeof prisma, "cariHareketi" | "cariHesap">, musteriId: string, dosyaId?: string) {
  const para = await tx.cariHesap.findFirst({ where: { paraHesabiMi: true } });
  if (!para) throw new Error("Para Trafiği hesabı bulunamadı.");
  const where = { musteriId, hesapId: para.id, ...(dosyaId ? { dosyaId } : {}) };
  const gruplar = await tx.cariHareketi.groupBy({ by: ["yon", "havuzKaynakli"], where, _sum: { tutar: true } });
  let alacak = 0;
  let borcHavuzsuz = 0;
  let borcHavuz = 0;
  for (const g of gruplar) {
    const t = Number(g._sum.tutar ?? 0);
    if (g.yon === "ALACAK") alacak += t;
    else if (g.havuzKaynakli) borcHavuz += t;
    else borcHavuzsuz += t;
  }
  const bakiye = alacak - borcHavuzsuz - borcHavuz + (dosyaId ? havuzTuretilenAlacak({ alacak, borcHavuzsuz, borcHavuz }) : 0);
  return Math.round(bakiye * 100) / 100;
}

// Para geldi: Para Trafigi'ne ALACAK. Dosya duzeyinden girilirse dosyaya
// etiketlenir (muvekkil ekraninda da gorunur); muvekkil duzeyinde dosya bos olabilir.
export async function odemeEkle(musteriId: string, formData: FormData) {
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
  yenile();
}

// Para hesabi disindaki bir hesaba (Akdi Vekalet, Bloke Para...) BORC yaz.
export async function borcEkle(musteriId: string, formData: FormData) {
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
export async function masrafEkle(musteriId: string, formData: FormData) {
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
export async function virmanYap(musteriId: string, kapsamDosyaId: string, formData: FormData) {
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

  await prisma.$transaction(async (tx) => {
    const [para, hedef] = await Promise.all([
      tx.cariHesap.findFirst({ where: { paraHesabiMi: true } }),
      tx.cariHesap.findUnique({ where: { id: hedefHesapId } }),
    ]);
    if (!para || !hedef || hedef.paraHesabiMi) throw new Error("Geçerli bir hedef hesap seçin.");

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
          aciklama: `${hedef.no}-${hedef.ad.toLocaleUpperCase("tr-TR")} VİRMAN`,
        },
      });
      await tx.cariHareketi.create({
        data: {
          musteriId, dosyaId, hesapId: hedef.id, yon: "ALACAK", tarih, tutar, virmanId,
          aciklama: `${kaynakHesap.no}-${kaynakHesap.ad.toLocaleUpperCase("tr-TR")} VİRMAN`,
        },
      });
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
        aciklama: `${hedef.no}-${hedef.ad.toLocaleUpperCase("tr-TR")} VİRMAN`,
      },
    });
    await tx.cariHareketi.create({
      data: {
        musteriId, dosyaId, hesapId: hedef.id, yon: "ALACAK", tarih, tutar, virmanId,
        aciklama: `${para.no}-${para.ad.toLocaleUpperCase("tr-TR")} VİRMAN`,
      },
    });
  });
  yenile();
}

// Silme sonrasi Para Trafigi'nin (muvekkil ve ilgili dosya) eksiye dusmemesi icin kontrol.
async function eksiyeDusmeKontrolu(
  tx: Pick<typeof prisma, "cariHareketi" | "cariHesap">,
  musteriId: string,
  dosyaId: string | null,
) {
  if ((await paraBakiyesi(tx, musteriId)) < -0.001 || (dosyaId && (await paraBakiyesi(tx, musteriId, dosyaId)) < -0.001)) {
    throw new Error("Bu kaydı silmek, virmanla kullanılmış parayı eksiye düşürür. Önce ilgili virmanı silin.");
  }
}

export async function hareketSil(id: string, sifre?: string) {
  await silmeYetkisiniDogrula(sifre);
  await prisma.$transaction(async (tx) => {
    const h = await tx.cariHareketi.findUnique({ where: { id } });
    if (!h) return;
    await tx.cariHareketi.delete({ where: { id } });
    await eksiyeDusmeKontrolu(tx, h.musteriId, h.dosyaId);
  });
  yenile();
}

export async function virmanSil(virmanId: string, sifre?: string) {
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
export async function hareketGuncelle(id: string, formData: FormData) {
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

// ---- Hesap yonetimi (admin) ----

export async function hesapEkle(formData: FormData) {
  await yoneticiyiDogrula();
  const no = Number(metin(formData, "no"));
  const ad = metin(formData, "ad");
  if (!Number.isInteger(no) || no <= 0 || !ad) throw new Error("Geçerli bir hesap kodu ve adı girin.");
  // Hesap plani: 100'ler muvekkil, 200'ler borclu, 300'ler adliye hesaplari.
  if (no < 100 || no > 399) throw new Error("Hesap kodu 100–399 aralığında olmalıdır (100'ler müvekkil, 200'ler borçlu, 300'ler adliye).");
  const grup = no >= 300 ? "ADLIYE" : no >= 200 ? "BORCLU" : "MUVEKKIL";
  // Adliye hesaplari varsayilan olarak "tutulan" (adliyede duran para) hesabidir.
  const tur = metin(formData, "tur");
  const tutulan = tur ? tur === "tutulan" : grup === "ADLIYE";
  if (await prisma.cariHesap.findUnique({ where: { no } })) throw new Error(`${no} kodlu bir hesap zaten var.`);
  await prisma.cariHesap.create({ data: { no, ad, grup, tutulanHesapMi: tutulan } });
  yenile();
}

export async function hesapAdiGuncelle(id: string, formData: FormData) {
  await yoneticiyiDogrula();
  const ad = metin(formData, "ad");
  if (!ad) throw new Error("Hesap adı boş olamaz.");
  await prisma.cariHesap.update({ where: { id }, data: { ad } });
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
export async function topluTasnif(musteriId: string, kapsamDosyaId: string, formData: FormData) {
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
export async function dosyalarArasiVirman(musteriId: string, formData: FormData) {
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
