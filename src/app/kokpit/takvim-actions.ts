"use server";

import type { TakvimTuru } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

const TURLER: TakvimTuru[] = ["DURUSMA", "GOREV", "TOPLANTI", "NOT"];
const gunMu = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const gunTarihi = (s: string) => new Date(`${s}T00:00:00Z`);

async function oturumSart() {
  const k = await mevcutKullanici();
  if (!k) throw new Error("Bu işlem için yetkiniz yok.");
  return k;
}

// Buronun ortak takvimine oge ekler. dosya: "d:<davaId>" | "c:<cmkId>" | "".
export async function takvimOgesiEkle(giris: {
  tarih: string;
  saat: string;
  baslik: string;
  tur: string;
  dosya: string;
  notlar: string;
}) {
  const k = await oturumSart();
  if (!gunMu(giris.tarih)) throw new Error("Geçerli bir tarih girin.");
  const tur = TURLER.find((t) => t === giris.tur);
  if (!tur) throw new Error("Geçersiz tür.");
  const baslik = giris.baslik.trim();
  if (!baslik) throw new Error("Başlık boş bırakılamaz.");
  const saat = /^\d{2}:\d{2}$/.test(giris.saat) ? giris.saat : null;
  const tarih = gunTarihi(giris.tarih);
  const sonSira = await prisma.takvimOgesi.aggregate({ where: { tarih }, _max: { sira: true } });
  const yeni = await prisma.takvimOgesi.create({
    select: { id: true },
    data: {
      tarih,
      saat,
      baslik,
      tur,
      notlar: giris.notlar.trim() || null,
      sira: (sonSira._max.sira ?? 0) + 1,
      davaDosyasiId: giris.dosya.startsWith("d:") ? giris.dosya.slice(2) : null,
      cmkDosyasiId: giris.dosya.startsWith("c:") ? giris.dosya.slice(2) : null,
      olusturanId: k.kullaniciId,
    },
  });
  return yeni.id;
}

export async function takvimOgesiSil(id: string) {
  await oturumSart();
  await prisma.takvimOgesi.delete({ where: { id } });
}

export async function takvimOgesiTamamla(id: string, tamam: boolean) {
  await oturumSart();
  await prisma.takvimOgesi.update({ where: { id }, data: { tamamlandiMi: tamam } });
}

// Ogeyi baska bir gune otele (gunun sonuna eklenir).
export async function takvimOgesiOtele(id: string, yeniTarih: string) {
  await oturumSart();
  if (!gunMu(yeniTarih)) throw new Error("Geçerli bir tarih girin.");
  const tarih = gunTarihi(yeniTarih);
  const sonSira = await prisma.takvimOgesi.aggregate({ where: { tarih }, _max: { sira: true } });
  await prisma.takvimOgesi.update({ where: { id }, data: { tarih, sira: (sonSira._max.sira ?? 0) + 1 } });
}

// Bir gunun elle girilen ogelerinin yeni sirasini tek seferde kaydeder.
export async function takvimGunSirasiKaydet(idler: string[]) {
  await oturumSart();
  if (idler.length === 0 || idler.length > 200) return;
  await prisma.$transaction(idler.map((id, sira) => prisma.takvimOgesi.update({ where: { id }, data: { sira }, select: { id: true } })));
}

// Dosya secenekleri (duruşma girişinde dosya seçmek için); form açılınca bir kez istenir.
export async function takvimDosyaSecenekleri() {
  await oturumSart();
  const [davalar, cmkler] = await Promise.all([
    prisma.davaDosyasi.findMany({ orderBy: { olusturmaTarihi: "desc" }, take: 300, select: { id: true, birimAdi: true, dosyaNo: true } }),
    prisma.cMKDosyasi.findMany({ orderBy: { id: "desc" }, take: 300, select: { id: true, birim: true, dosyaNo: true } }),
  ]);
  return [
    ...davalar.map((d) => ({ deger: `d:${d.id}`, etiket: [d.birimAdi, d.dosyaNo].filter(Boolean).join(" · ") || "Dava dosyası" })),
    ...cmkler.map((d) => ({ deger: `c:${d.id}`, etiket: ["CMK", d.birim, d.dosyaNo].filter(Boolean).join(" · ") })),
  ];
}

// Dosya kaydindaki (eski) durusma tarihini otele: saat korunur.
export async function dosyaDurusmasiniOtele(tur: "dava" | "cmk", dosyaId: string, yeniTarih: string) {
  await oturumSart();
  if (!gunMu(yeniTarih)) throw new Error("Geçerli bir tarih girin.");
  const mevcut =
    tur === "dava"
      ? await prisma.davaDosyasi.findUnique({ where: { id: dosyaId }, select: { durusmaTarihi: true } })
      : await prisma.cMKDosyasi.findUnique({ where: { id: dosyaId }, select: { durusmaTarihi: true } });
  const eski = mevcut?.durusmaTarihi;
  // Saati Istanbul'a gore koru (UTC+3).
  const saatMs = eski ? (eski.getTime() + 3 * 3600000) % 86400000 : 9 * 3600000;
  const yeni = new Date(gunTarihi(yeniTarih).getTime() + saatMs - 3 * 3600000);
  if (tur === "dava") await prisma.davaDosyasi.update({ where: { id: dosyaId }, data: { durusmaTarihi: yeni } });
  else await prisma.cMKDosyasi.update({ where: { id: dosyaId }, data: { durusmaTarihi: yeni } });
}

// Kullanicinin ana sayfa panel duzeni (JSON: sira / gizli / genis).
export async function anaSayfaDuzeniKaydet(duzen: { sira: string[]; gizli: string[]; genis: string[] } | null) {
  const k = await oturumSart();
  await prisma.kullanici.update({
    where: { id: k.kullaniciId },
    data: { anaSayfaDuzeni: duzen ? JSON.stringify(duzen) : null },
  });
}
