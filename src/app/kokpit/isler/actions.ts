"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { pushGonder } from "@/core/bildirim/push";
import { DURUMLAR, TURLER, ZAMAN_BASKILARI } from "./durum";
import { PERIYOTLAR } from "./hafta";

async function girisli() {
  const k = await mevcutKullanici();
  if (!k) throw new Error("Oturum bulunamadı.");
  return k;
}

// Isle ilgili kisilere (sorumlu, olusturan, yorum yazanlar) haber verir; eylemi yapan kisiye gitmez.
async function ilgililereBildir(isId: string, yapanId: string, baslik: string, metin: string, ekstraAlicilar: string[] = []) {
  const is = await prisma.is.findUnique({
    where: { id: isId },
    select: { baslik: true, sorumluId: true, olusturanId: true, yorumlar: { select: { yazanId: true } }, yardimlar: { select: { yardimciId: true } } },
  });
  if (!is) return;
  const alicilar = new Set<string>([...ekstraAlicilar]);
  if (is.sorumluId) alicilar.add(is.sorumluId);
  if (is.olusturanId) alicilar.add(is.olusturanId);
  for (const y of is.yorumlar) if (y.yazanId) alicilar.add(y.yazanId);
  for (const y of is.yardimlar) alicilar.add(y.yardimciId);
  alicilar.delete(yapanId);
  await pushGonder([...alicilar], { baslik, metin: `${is.baslik} — ${metin}`.slice(0, 180), url: `/kokpit/isler/${isId}`, etiket: `is-${isId}` });
}

export async function isEkle(baslik: string, sorumluId: string, aciklama: string, destekId = ""): Promise<{ hata?: string; id?: string }> {
  const k = await girisli();
  const b = baslik.trim();
  if (!b) return { hata: "Konu başlığı boş olamaz." };
  const atanan = sorumluId || k.kullaniciId;
  const is = await prisma.is.create({
    data: {
      baslik: b.slice(0, 200),
      aciklama: aciklama.trim() || null,
      sorumluId: atanan,
      olusturanId: k.kullaniciId,
    },
  });
  if (atanan !== k.kullaniciId) {
    await pushGonder([atanan], { baslik: "Size yeni bir iş atandı", metin: `${k.adSoyad}: ${b}`.slice(0, 180), url: `/kokpit/isler/${is.id}`, etiket: `is-${is.id}` });
  }
  if (destekId && destekId !== atanan && destekId !== k.kullaniciId) {
    await prisma.isYardimi.create({ data: { isId: is.id, isteyenId: k.kullaniciId, yardimciId: destekId } });
    await pushGonder([destekId], { baslik: "Size destek görevi atandı", metin: `${k.adSoyad}: ${b}`.slice(0, 180), url: `/kokpit/isler/${is.id}`, etiket: `is-${is.id}` });
  }
  revalidatePath("/kokpit/isler");
  return { id: is.id };
}

export async function durumDegistir(isId: string, durum: string) {
  const k = await girisli();
  const d = DURUMLAR.find((x) => x.anahtar === durum);
  if (!d) throw new Error("Geçersiz durum.");
  await prisma.is.update({
    where: { id: isId },
    data: { durum: d.anahtar, guncellemeTarihi: new Date(), tamamlanmaTarihi: d.anahtar === "TAMAMLANDI" ? new Date() : null },
  });
  await ilgililereBildir(isId, k.kullaniciId, "İşin durumu değişti", `${k.adSoyad}: ${d.ad}`);
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}

export async function sorumluDegistir(isId: string, sorumluId: string) {
  const k = await girisli();
  await prisma.is.update({ where: { id: isId }, data: { sorumluId: sorumluId || null, guncellemeTarihi: new Date() } });
  if (sorumluId && sorumluId !== k.kullaniciId) {
    const is = await prisma.is.findUnique({ where: { id: isId }, select: { baslik: true } });
    await pushGonder([sorumluId], { baslik: "Size bir iş atandı", metin: `${k.adSoyad}: ${is?.baslik ?? ""}`.slice(0, 180), url: `/kokpit/isler/${isId}`, etiket: `is-${isId}` });
  }
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}

export async function isBilgisiniGuncelle(isId: string, baslik: string, aciklama: string) {
  await girisli();
  const b = baslik.trim();
  if (!b) return;
  await prisma.is.update({ where: { id: isId }, data: { baslik: b.slice(0, 200), aciklama: aciklama.trim() || null, guncellemeTarihi: new Date() } });
  revalidatePath(`/kokpit/isler/${isId}`);
}

export async function isSil(isId: string) {
  await girisli();
  await prisma.is.delete({ where: { id: isId } });
  revalidatePath("/kokpit/isler");
}

export async function maddeEkle(isId: string, metin: string) {
  await girisli();
  const m = metin.trim();
  if (!m) return;
  const son = await prisma.isMaddesi.findFirst({ where: { isId }, orderBy: { sira: "desc" }, select: { sira: true } });
  await prisma.isMaddesi.create({ data: { isId, metin: m.slice(0, 300), sira: (son?.sira ?? 0) + 1 } });
  revalidatePath(`/kokpit/isler/${isId}`);
}

export async function maddeDurumu(maddeId: string, tamam: boolean) {
  const k = await girisli();
  const madde = await prisma.isMaddesi.update({ where: { id: maddeId }, data: { tamam } });
  await prisma.is.update({ where: { id: madde.isId }, data: { guncellemeTarihi: new Date() } });
  if (tamam) await ilgililereBildir(madde.isId, k.kullaniciId, "Kontrol listesinde madde tamamlandı", `${k.adSoyad}: ${madde.metin}`);
  revalidatePath(`/kokpit/isler/${madde.isId}`);
}

export async function maddeSil(maddeId: string) {
  await girisli();
  const madde = await prisma.isMaddesi.delete({ where: { id: maddeId } });
  revalidatePath(`/kokpit/isler/${madde.isId}`);
}

export type YeniEk = { url: string; ad: string; tur: string };

export async function yorumEkle(isId: string, metin: string, ekler: YeniEk[] = []) {
  const k = await girisli();
  const m = metin.trim();
  const gecerliEkler = ekler.filter((e) => e.url.startsWith("https://") && e.url.includes("/isler/")).slice(0, 10);
  if (!m && gecerliEkler.length === 0) return;
  await prisma.isYorumu.create({
    data: {
      isId,
      yazanId: k.kullaniciId,
      metin: m.slice(0, 2000),
      ekler: { create: gecerliEkler.map((e) => ({ isId, url: e.url, ad: e.ad.slice(0, 200), tur: e.tur.slice(0, 100) })) },
    },
  });
  await prisma.is.update({ where: { id: isId }, data: { guncellemeTarihi: new Date() } });
  const ozet = m || (gecerliEkler.length === 1 ? "📷 fotoğraf ekledi" : `📷 ${gecerliEkler.length} dosya ekledi`);
  await ilgililereBildir(isId, k.kullaniciId, "Yeni yorum", `${k.adSoyad}: ${ozet}`);
  revalidatePath(`/kokpit/isler/${isId}`);
}

export async function yardimIste(isId: string, yardimciId: string) {
  const k = await girisli();
  if (!yardimciId || yardimciId === k.kullaniciId) return;
  const is = await prisma.is.findUnique({ where: { id: isId }, select: { baslik: true, sorumluId: true } });
  if (!is || is.sorumluId === yardimciId) return;
  await prisma.isYardimi.upsert({
    where: { isId_yardimciId: { isId, yardimciId } },
    update: {},
    create: { isId, isteyenId: k.kullaniciId, yardimciId },
  });
  await pushGonder([yardimciId], { baslik: "Sizden yardım istendi", metin: `${k.adSoyad}: ${is.baslik}`.slice(0, 180), url: `/kokpit/isler/${isId}`, etiket: `is-${isId}` });
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}

export async function yardimKaldir(yardimId: string) {
  await girisli();
  const y = await prisma.isYardimi.delete({ where: { id: yardimId } });
  revalidatePath(`/kokpit/isler/${y.isId}`);
  revalidatePath("/kokpit/isler");
}

export async function operasyonYapildi(isId: string) {
  const k = await girisli();
  await prisma.isOperasyonKaydi.create({ data: { isId, yapanId: k.kullaniciId } });
  await prisma.is.update({ where: { id: isId }, data: { guncellemeTarihi: new Date() } });
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}

export async function operasyonKaydiSil(kayitId: string) {
  await girisli();
  const y = await prisma.isOperasyonKaydi.delete({ where: { id: kayitId } });
  revalidatePath(`/kokpit/isler/${y.isId}`);
  revalidatePath("/kokpit/isler");
}

export async function hedefGuncelle(isId: string, hedef: number) {
  await girisli();
  const h = Math.min(31, Math.max(1, Math.round(hedef) || 1));
  await prisma.is.update({ where: { id: isId }, data: { haftalikHedef: h } });
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}

// Bitis tarihi ("YYYY-MM-DD" ya da bos = kaldir).
export async function vadeGuncelle(isId: string, vade: string) {
  await girisli();
  const gecerli = /^\d{4}-\d{2}-\d{2}$/.test(vade) ? new Date(vade + "T00:00:00Z") : null;
  await prisma.is.update({ where: { id: isId }, data: { vade: gecerli, guncellemeTarihi: new Date() } });
  revalidatePath("/kokpit/isler");
}

// Alt gorevi bir adim yukari (-1) ya da asagi (1) tasir.
export async function maddeTasi(maddeId: string, yon: -1 | 1) {
  await girisli();
  const m = await prisma.isMaddesi.findUnique({ where: { id: maddeId } });
  if (!m) return;
  const liste = await prisma.isMaddesi.findMany({ where: { isId: m.isId }, orderBy: [{ sira: "asc" }, { id: "asc" }], select: { id: true } });
  const i = liste.findIndex((x) => x.id === maddeId);
  const j = i + yon;
  if (i < 0 || j < 0 || j >= liste.length) return;
  [liste[i], liste[j]] = [liste[j], liste[i]];
  await prisma.$transaction(liste.map((x, k) => prisma.isMaddesi.update({ where: { id: x.id }, data: { sira: k + 1 } })));
  revalidatePath("/kokpit/isler");
}

// Alt gorevlerin yeni sirasi (surukle-birak): kimliklerin istenen sirasi.
export async function maddeSirala(isId: string, idSirasi: string[]) {
  await girisli();
  const mevcut = await prisma.isMaddesi.findMany({ where: { isId }, select: { id: true } });
  const izinli = new Set(mevcut.map((m) => m.id));
  const liste = idSirasi.filter((id) => izinli.has(id));
  await prisma.$transaction(liste.map((id, k) => prisma.isMaddesi.update({ where: { id }, data: { sira: k + 1 } })));
  revalidatePath("/kokpit/isler");
}

// ---- Yerinde duzenleme: tarz, zaman baskisi, yargi turu, periyot, tetikleyici ----
export async function turDegistir(isId: string, tur: string) {
  await girisli();
  if (!TURLER.some((t) => t.anahtar === tur)) throw new Error("Geçersiz görev tarzı.");
  const mevcut = await prisma.is.findUnique({ where: { id: isId }, select: { haftalikHedef: true } });
  await prisma.is.update({
    where: { id: isId },
    data: { tur, haftalikHedef: tur === "OPERASYONEL" ? (mevcut?.haftalikHedef ?? 1) : mevcut?.haftalikHedef, guncellemeTarihi: new Date() },
  });
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}

export async function zamanBaskisiDegistir(isId: string, baski: string) {
  await girisli();
  const b = ZAMAN_BASKILARI.find((z) => z.anahtar === baski)?.anahtar ?? null;
  await prisma.is.update({ where: { id: isId }, data: { zamanBaskisi: b, guncellemeTarihi: new Date() } });
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}

export async function yargiTuruDegistir(isId: string, yargiTuruId: string) {
  await girisli();
  await prisma.is.update({ where: { id: isId }, data: { yargiTuruId: yargiTuruId || null, guncellemeTarihi: new Date() } });
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}

export async function periyotDegistir(isId: string, periyot: string) {
  await girisli();
  const p = PERIYOTLAR.find((x) => x.anahtar === periyot)?.anahtar ?? "HAFTA";
  await prisma.is.update({ where: { id: isId }, data: { periyot: p, guncellemeTarihi: new Date() } });
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}

export async function tetikleyiciGuncelle(isId: string, metin: string) {
  await girisli();
  await prisma.is.update({ where: { id: isId }, data: { tetikleyici: metin.trim().slice(0, 300) || null, guncellemeTarihi: new Date() } });
  revalidatePath(`/kokpit/isler/${isId}`);
}

// ---- Yargi turu listesi yonetimi ----
export async function yargiTuruEkle(ad: string): Promise<{ hata?: string }> {
  await girisli();
  const a = ad.trim().slice(0, 80);
  if (!a) return { hata: "Ad boş olamaz." };
  if (await prisma.gorevYargiTuru.findUnique({ where: { ad: a } })) return { hata: "Bu yargı türü zaten var." };
  const son = await prisma.gorevYargiTuru.findFirst({ orderBy: { sira: "desc" }, select: { sira: true } });
  await prisma.gorevYargiTuru.create({ data: { ad: a, sira: (son?.sira ?? 0) + 1 } });
  revalidatePath("/kokpit/isler");
  return {};
}

export async function yargiTuruAdiDegistir(id: string, ad: string): Promise<{ hata?: string }> {
  await girisli();
  const a = ad.trim().slice(0, 80);
  if (!a) return { hata: "Ad boş olamaz." };
  const ayni = await prisma.gorevYargiTuru.findUnique({ where: { ad: a } });
  if (ayni && ayni.id !== id) return { hata: "Bu ad başka bir yargı türünde var." };
  await prisma.gorevYargiTuru.update({ where: { id }, data: { ad: a } });
  revalidatePath("/kokpit/isler");
  return {};
}

// Silinen yargi turundeki gorevlerin yargi turu bos kalir (gorevler silinmez).
export async function yargiTuruSil(id: string) {
  await girisli();
  await prisma.gorevYargiTuru.delete({ where: { id } });
  revalidatePath("/kokpit/isler");
}
