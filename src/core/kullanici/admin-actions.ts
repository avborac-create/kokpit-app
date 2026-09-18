"use server";

import { revalidatePath } from "next/cache";
import type { KullaniciRolu } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { sistemYoneticisiMi } from "@/core/auth/yetki";
import { sifreyiHashle } from "@/core/auth/password";

const AYARLAR_YOLU = "/kokpit/ayarlar/kullanicilar";

const GECERLI_ROLLER: KullaniciRolu[] = ["YONETICI", "ORTAK", "SORUMLU_AVUKAT", "PERSONEL"];

// Kullanici yonetimi (giris bilgisi/sifre olusturma) hassas bir islem -
// silebilirMi (YONETICI+ORTAK) yerine daha dar olan, sadece YONETICI'ye
// acik sistemYoneticisiMi kontrolu kullanilir.
async function yetkiKontrolEt() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !sistemYoneticisiMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  return kullanici;
}

function rolDogrula(deger: FormDataEntryValue | null): KullaniciRolu {
  const rol = String(deger ?? "");
  if (!GECERLI_ROLLER.includes(rol as KullaniciRolu)) {
    throw new Error("Geçersiz rol.");
  }
  return rol as KullaniciRolu;
}

export async function kullaniciEkle(formData: FormData) {
  await yetkiKontrolEt();

  const adSoyad = String(formData.get("adSoyad") ?? "").trim();
  const eposta = String(formData.get("eposta") ?? "").trim().toLowerCase();
  const sifre = String(formData.get("sifre") ?? "");
  const rol = rolDogrula(formData.get("rol"));

  if (!adSoyad || !eposta || !sifre) {
    throw new Error("Ad Soyad, e-posta ve şifre zorunludur.");
  }
  if (sifre.length < 8) {
    throw new Error("Şifre en az 8 karakter olmalıdır.");
  }

  const mevcut = await prisma.kullanici.findUnique({ where: { eposta } });
  if (mevcut) {
    throw new Error("Bu e-posta ile kayıtlı bir kullanıcı zaten var.");
  }

  const sifreHash = await sifreyiHashle(sifre);
  await prisma.kullanici.create({
    data: { adSoyad, eposta, sifreHash, rol },
  });

  revalidatePath(AYARLAR_YOLU);
}

export async function kullaniciSifreSifirla(id: string, formData: FormData) {
  await yetkiKontrolEt();

  const sifre = String(formData.get("sifre") ?? "");
  if (sifre.length < 8) {
    throw new Error("Şifre en az 8 karakter olmalıdır.");
  }

  const sifreHash = await sifreyiHashle(sifre);
  await prisma.kullanici.update({ where: { id }, data: { sifreHash } });
  revalidatePath(AYARLAR_YOLU);
}

export async function kullaniciRolGuncelle(id: string, formData: FormData) {
  const kullanici = await yetkiKontrolEt();
  const rol = rolDogrula(formData.get("rol"));

  if (kullanici.kullaniciId === id && rol !== "YONETICI") {
    throw new Error("Kendi yönetici rolünüzü kaldıramazsınız.");
  }

  await prisma.kullanici.update({ where: { id }, data: { rol } });
  revalidatePath(AYARLAR_YOLU);
}

export async function kullaniciAktifligiDegistir(id: string, aktifMi: boolean) {
  const kullanici = await yetkiKontrolEt();

  if (kullanici.kullaniciId === id && !aktifMi) {
    throw new Error("Kendi hesabınızı pasife alamazsınız.");
  }

  await prisma.kullanici.update({ where: { id }, data: { aktifMi } });
  revalidatePath(AYARLAR_YOLU);
}
