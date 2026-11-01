"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { pushGonder } from "@/core/bildirim/push";
import { DURUMLAR } from "./durum";

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

export async function isEkle(baslik: string, sorumluId: string, aciklama: string, destekId = "", tur = "PARCA", hedef = 0): Promise<{ hata?: string; id?: string }> {
  const k = await girisli();
  const b = baslik.trim();
  if (!b) return { hata: "Konu başlığı boş olamaz." };
  const atanan = sorumluId || k.kullaniciId;
  const is = await prisma.is.create({
    data: {
      baslik: b.slice(0, 200),
      aciklama: aciklama.trim() || null,
      tur: ["PARCA", "SUREC", "OPERASYONEL"].includes(tur) ? tur : "PARCA",
      haftalikHedef: tur === "OPERASYONEL" ? Math.min(14, Math.max(1, Math.round(hedef) || 1)) : null,
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
  const h = Math.min(14, Math.max(1, Math.round(hedef) || 1));
  await prisma.is.update({ where: { id: isId }, data: { haftalikHedef: h } });
  revalidatePath(`/kokpit/isler/${isId}`);
  revalidatePath("/kokpit/isler");
}
