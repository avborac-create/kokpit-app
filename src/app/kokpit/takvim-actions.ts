"use server";

import { revalidatePath } from "next/cache";
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
  await prisma.takvimOgesi.create({
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
  revalidatePath("/kokpit");
}

export async function takvimOgesiSil(id: string) {
  await oturumSart();
  await prisma.takvimOgesi.delete({ where: { id } });
  revalidatePath("/kokpit");
}

export async function takvimOgesiTamamla(id: string, tamam: boolean) {
  await oturumSart();
  await prisma.takvimOgesi.update({ where: { id }, data: { tamamlandiMi: tamam } });
  revalidatePath("/kokpit");
}

// Ogeyi baska bir gune otele (gunun sonuna eklenir).
export async function takvimOgesiOtele(id: string, yeniTarih: string) {
  await oturumSart();
  if (!gunMu(yeniTarih)) throw new Error("Geçerli bir tarih girin.");
  const tarih = gunTarihi(yeniTarih);
  const sonSira = await prisma.takvimOgesi.aggregate({ where: { tarih }, _max: { sira: true } });
  await prisma.takvimOgesi.update({ where: { id }, data: { tarih, sira: (sonSira._max.sira ?? 0) + 1 } });
  revalidatePath("/kokpit");
}

// Gun icinde bir adim yukari/asagi tasir: ayni gundeki komsu ile sirayi degistirir.
export async function takvimOgesiSirala(id: string, yon: "yukari" | "asagi") {
  await oturumSart();
  const oge = await prisma.takvimOgesi.findUnique({ where: { id }, select: { tarih: true } });
  if (!oge) return;
  const gununOgeleri = await prisma.takvimOgesi.findMany({
    where: { tarih: oge.tarih },
    orderBy: [{ sira: "asc" }, { saat: "asc" }, { olusturmaTarihi: "asc" }],
    select: { id: true },
  });
  const i = gununOgeleri.findIndex((o) => o.id === id);
  const j = yon === "yukari" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= gununOgeleri.length) return;
  const yeniSira = gununOgeleri.map((o) => o.id);
  [yeniSira[i], yeniSira[j]] = [yeniSira[j], yeniSira[i]];
  await prisma.$transaction(yeniSira.map((oid, sira) => prisma.takvimOgesi.update({ where: { id: oid }, data: { sira } })));
  revalidatePath("/kokpit");
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
  revalidatePath("/kokpit");
}

// Kullanicinin ana sayfa panel duzeni (JSON: sira / gizli / genis).
export async function anaSayfaDuzeniKaydet(duzen: { sira: string[]; gizli: string[]; genis: string[] } | null) {
  const k = await oturumSart();
  await prisma.kullanici.update({
    where: { id: k.kullaniciId },
    data: { anaSayfaDuzeni: duzen ? JSON.stringify(duzen) : null },
  });
  revalidatePath("/kokpit");
}
