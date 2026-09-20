"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { KullaniciRolu } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi, sistemYoneticisiMi } from "@/core/auth/yetki";
import { sifreyiHashle } from "@/core/auth/password";
import { atanabilirRoller } from "./rol-etiketleri";

async function yetkiliKullaniciyiGetir() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  return kullanici;
}

export type KullaniciOlusturSonucu = { hata: string } | undefined;

export async function kullaniciOlustur(
  _oncekiDurum: KullaniciOlusturSonucu,
  formData: FormData,
): Promise<KullaniciOlusturSonucu> {
  const islemiYapan = await yetkiliKullaniciyiGetir();

  const adSoyad = String(formData.get("adSoyad") ?? "").trim();
  const eposta = String(formData.get("eposta") ?? "").trim().toLowerCase();
  const sifre = String(formData.get("sifre") ?? "");
  const rol = String(formData.get("rol") ?? "") as KullaniciRolu;

  if (!adSoyad || !eposta || !sifre || !rol) {
    return { hata: "Ad Soyad, e-posta, şifre ve rol zorunludur." };
  }
  if (sifre.length < 8) {
    return { hata: "Şifre en az 8 karakter olmalıdır." };
  }
  if (!atanabilirRoller(islemiYapan.rol).includes(rol)) {
    return { hata: "Bu rolü atama yetkiniz yok." };
  }

  const mevcut = await prisma.kullanici.findUnique({ where: { eposta } });
  if (mevcut) {
    return { hata: "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten var." };
  }

  await prisma.kullanici.create({
    data: {
      adSoyad,
      eposta,
      sifreHash: await sifreyiHashle(sifre),
      rol,
    },
  });

  revalidatePath("/kokpit/ayarlar/kullanicilar");
  redirect("/kokpit/ayarlar/kullanicilar");
}

export async function kullaniciDurumDegistir(id: string, aktifMi: boolean) {
  const islemiYapan = await yetkiliKullaniciyiGetir();

  if (id === islemiYapan.kullaniciId) {
    throw new Error("Kendi hesabınızı pasife alamazsınız.");
  }

  const hedefKullanici = await prisma.kullanici.findUnique({ where: { id } });
  if (!hedefKullanici) return;
  if (hedefKullanici.rol === "YONETICI" && !sistemYoneticisiMi(islemiYapan.rol)) {
    throw new Error("Bir yöneticinin durumunu değiştirme yetkiniz yok.");
  }

  await prisma.kullanici.update({ where: { id }, data: { aktifMi } });
  revalidatePath("/kokpit/ayarlar/kullanicilar");
}
