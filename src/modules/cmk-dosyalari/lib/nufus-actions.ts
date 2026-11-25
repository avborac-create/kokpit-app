"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { tcknGecerliMi } from "@/core/metin/tckn";

async function oturumSart() {
  const k = await mevcutKullanici();
  if (!k) throw new Error("Oturum bulunamadı.");
  return k;
}
const metin = (f: FormData, a: string) => String(f.get(a) ?? "").trim() || null;
const tarih = (f: FormData, a: string) => {
  const m = metin(f, a);
  return m ? new Date(`${m}T12:00:00Z`) : null;
};
const yol = (id: string) => `/kokpit/cmk-dosyalari/${id}`;

function kisiVerisi(f: FormData) {
  const ad = metin(f, "ad");
  const yakinlik = metin(f, "yakinlik");
  if (!ad) throw new Error("Ad zorunludur.");
  if (!yakinlik) throw new Error("Yakınlık zorunludur (ör. Kendisi, Babası, Annesi, Kardeşi).");
  const tckn = (metin(f, "tckn") ?? "").replace(/\s/g, "");
  if (tckn && !tcknGecerliMi(tckn)) throw new Error(`TCKN geçersiz (${tckn}): 11 haneli olmalı ve doğrulama kuralına uymalı.`);
  const sira = Number(metin(f, "sira") ?? 0);
  return {
    sira: Number.isFinite(sira) ? sira : 0,
    bsn: metin(f, "bsn"),
    yakinlik,
    cinsiyet: metin(f, "cinsiyet"),
    tckn: tckn || null,
    ad,
    soyad: metin(f, "soyad"),
    babaAdi: metin(f, "babaAdi"),
    anaAdi: metin(f, "anaAdi"),
    dogumYeri: metin(f, "dogumYeri"),
    dogumTarihi: tarih(f, "dogumTarihi"),
    medeniHal: metin(f, "medeniHal"),
    tescilTarihi: tarih(f, "tescilTarihi"),
    olaylar: metin(f, "olaylar"),
  };
}

export async function nufusKisisiEkle(dosyaId: string, formData: FormData) {
  const k = await oturumSart();
  await prisma.cMKNufusKisisi.create({ data: { cmkDosyasiId: dosyaId, ...kisiVerisi(formData), degistirenAd: k.adSoyad } });
  redirect(yol(dosyaId));
}

export async function nufusKisisiGuncelle(dosyaId: string, kisiId: string, formData: FormData) {
  const k = await oturumSart();
  await prisma.cMKNufusKisisi.update({ where: { id: kisiId, cmkDosyasiId: dosyaId }, data: { ...kisiVerisi(formData), degistirenAd: k.adSoyad } });
  redirect(yol(dosyaId));
}

export async function nufusKisisiSil(dosyaId: string, kisiId: string) {
  await oturumSart();
  await prisma.cMKNufusKisisi.deleteMany({ where: { id: kisiId, cmkDosyasiId: dosyaId } });
}

export async function nufusNotuKaydet(dosyaId: string, formData: FormData) {
  await oturumSart();
  await prisma.cMKDosyasi.update({ where: { id: dosyaId }, data: { nufusNotu: metin(formData, "nufusNotu") } });
  redirect(yol(dosyaId));
}
