"use server";

import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { gunEkle, siraDegerleri, TAKVIMLER, TURLER, DURUMLAR, TEKRARLAR, type OgeGirdisi } from "./tipler";

const gunMu = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const saatMi = (s: string | null | undefined) => (s && /^\d{2}:\d{2}$/.test(s) ? s : null);
const gun = (s: string) => new Date(`${s}T00:00:00Z`);

async function oturumSart() {
  const k = await mevcutKullanici();
  if (!k) throw new Error("Bu işlem için yetkiniz yok.");
  return k;
}

function dogrula(v: OgeGirdisi) {
  const baslik = v.baslik.trim();
  if (!baslik) throw new Error("Başlık boş bırakılamaz.");
  if (!gunMu(v.tarih)) throw new Error("Geçerli bir tarih girin.");
  if (v.bitisTarihi && (!gunMu(v.bitisTarihi) || v.bitisTarihi < v.tarih)) throw new Error("Bitiş tarihi başlangıçtan önce olamaz.");
  if (v.meet && !/^https:\/\//i.test(v.meet.trim())) throw new Error("Toplantı bağlantısı https:// ile başlamalıdır.");
  return {
    baslik: baslik.slice(0, 300),
    tur: TURLER.find((t) => t.kod === v.tur)?.kod ?? "GOREV",
    takvim: TAKVIMLER.find((t) => t.kod === v.takvim && t.kod !== "DOGUM")?.kod ?? "IS",
    tarih: gun(v.tarih),
    saat: saatMi(v.saat),
    bitisTarihi: v.bitisTarihi ? gun(v.bitisTarihi) : null,
    bitisSaati: saatMi(v.bitisSaati),
    yer: v.yer?.trim().slice(0, 200) || null,
    meetBaglantisi: v.meet?.trim().slice(0, 500) || null,
    sorumluId: v.sorumluId || null,
    etiketler: v.etiketler.map((e) => e.trim().slice(0, 40)).filter(Boolean).slice(0, 20),
    durum: DURUMLAR.find((d) => d.kod === v.durum)?.kod ?? "BEKLIYOR",
    tamamlandiMi: v.tamam || v.durum === "TAMAM",
    icerik: v.icerik.trim().slice(0, 20000) || null,
    tekrar: TEKRARLAR.find((t) => t.kod === v.tekrar)?.kod ?? null,
    tekrarBitis: v.tekrar && gunMu(v.tekrarBitis) ? gun(v.tekrarBitis) : null,
    davaDosyasiId: v.dosya?.startsWith("d:") ? v.dosya.slice(2) : null,
    cmkDosyasiId: v.dosya?.startsWith("c:") ? v.dosya.slice(2) : null,
  };
}

// Olusturur ya da gunceller. Yeni ogeler tum takvimin sonuna (en buyuk sira + 1) eklenir.
export async function ogeKaydet(girdi: OgeGirdisi): Promise<{ id: string; sira: number }> {
  const k = await oturumSart();
  const veri = dogrula(girdi);
  if (girdi.id) {
    const g = await prisma.takvimOgesi.update({ where: { id: girdi.id }, data: veri, select: { id: true, sira: true } });
    return g;
  }
  const enBuyuk = await prisma.takvimOgesi.aggregate({ _max: { sira: true } });
  return prisma.takvimOgesi.create({
    data: { ...veri, sira: (enBuyuk._max.sira ?? 0) + 1, olusturanId: k.kullaniciId },
    select: { id: true, sira: true },
  });
}

export async function ogeSil(id: string) {
  await oturumSart();
  await prisma.takvimOgesi.delete({ where: { id } });
}

// Surukle-birak ile gun degistirme: baslangic ve (varsa) bitis ayni miktar kayar.
export async function ogeKaydir(id: string, gunSayisi: number) {
  await oturumSart();
  const o = await prisma.takvimOgesi.findUniqueOrThrow({ where: { id }, select: { tarih: true, bitisTarihi: true, tekrarBitis: true } });
  const yeni = (d: Date | null) => (d ? gun(gunEkle(d.toISOString().slice(0, 10), gunSayisi)) : null);
  await prisma.takvimOgesi.update({ where: { id }, data: { tarih: yeni(o.tarih)!, bitisTarihi: yeni(o.bitisTarihi), tekrarBitis: yeni(o.tekrarBitis) } });
}

export async function ogeDurumuYaz(id: string, durum: string) {
  await oturumSart();
  const d = DURUMLAR.find((x) => x.kod === durum);
  if (!d) throw new Error("Geçersiz durum.");
  await prisma.takvimOgesi.update({ where: { id }, data: { durum: d.kod, tamamlandiMi: d.kod === "TAMAM" } });
}

export async function ogeTamamla(id: string, tamam: boolean) {
  await oturumSart();
  await prisma.takvimOgesi.update({ where: { id }, data: { tamamlandiMi: tamam, durum: tamam ? "TAMAM" : "BEKLIYOR" } });
}

// Elle siralama: verilen kimlikler yeni sirada; sira degerleri kalici saklanir.
export async function sirayiKaydet(idler: string[]) {
  await oturumSart();
  if (idler.length < 2 || idler.length > 500) return;
  const mevcut = await prisma.takvimOgesi.findMany({ where: { id: { in: idler } }, select: { id: true, sira: true } });
  const enBuyuk = await prisma.takvimOgesi.aggregate({ _max: { sira: true } });
  const degerler = siraDegerleri(mevcut.map((m) => m.sira), enBuyuk._max.sira ?? 0);
  await prisma.$transaction(idler.map((id, i) => prisma.takvimOgesi.update({ where: { id }, data: { sira: degerler[i] }, select: { id: true } })));
}
