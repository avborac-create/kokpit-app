"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi, sistemYoneticisiMi } from "@/core/auth/yetki";
import { sifreyiHashle } from "@/core/auth/password";
import { silmeSifresiniDogrula } from "@/core/auth/silme-dogrulama";
import { buroRoluGecerliMi, uygulamaRoluDbDegeri, type UygulamaRolu } from "./rol-etiketleri";

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
  await yetkiliKullaniciyiGetir();

  const adSoyad = String(formData.get("adSoyad") ?? "").trim();
  const eposta = String(formData.get("eposta") ?? "").trim().toLowerCase();
  const sifre = String(formData.get("sifre") ?? "");
  const rolDegeri = String(formData.get("rol") ?? "");
  const buroRolu = String(formData.get("buroRolu") ?? "");

  if (!adSoyad || !eposta || !sifre || !rolDegeri || !buroRolu) {
    return { hata: "Ad Soyad, e-posta, şifre, uygulama rolü ve büro rolü zorunludur." };
  }
  if (sifre.length < 8) {
    return { hata: "Şifre en az 8 karakter olmalıdır." };
  }
  if (rolDegeri !== "YONETICI" && rolDegeri !== "KULLANICI") {
    return { hata: "Geçersiz uygulama rolü." };
  }
  if (!buroRoluGecerliMi(buroRolu)) {
    return { hata: "Geçersiz büro rolü." };
  }
  const rol = uygulamaRoluDbDegeri(rolDegeri);

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
      buroRolu,
    },
  });

  revalidatePath("/kokpit/ayarlar/kullanicilar");
  redirect("/kokpit/ayarlar/kullanicilar");
}

// Ad Soyad, e-posta (giris adi) ve istege bagli yeni sifre guncellenir.
// Sifre bos birakilirsa mevcut sifre korunur.
export async function kullaniciGuncelle(
  id: string,
  adSoyad: string,
  eposta: string,
  yeniSifre: string,
  uygulamaRolu: UygulamaRolu,
  buroRolu: string,
  dogumTarihi = "",
): Promise<void> {
  const islemiYapan = await yetkiliKullaniciyiGetir();

  const ad = adSoyad.trim();
  const posta = eposta.trim().toLowerCase();
  if (!ad || !posta) {
    throw new Error("Ad Soyad ve e-posta boş bırakılamaz.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(posta)) {
    throw new Error("Geçerli bir e-posta adresi girin.");
  }
  if (yeniSifre && yeniSifre.length < 8) {
    throw new Error("Şifre en az 8 karakter olmalıdır.");
  }

  if (uygulamaRolu !== "YONETICI" && uygulamaRolu !== "KULLANICI") {
    throw new Error("Geçersiz uygulama rolü.");
  }
  if (!buroRoluGecerliMi(buroRolu)) {
    throw new Error("Geçersiz büro rolü.");
  }
  if (id === islemiYapan.kullaniciId && uygulamaRolu !== "YONETICI") {
    throw new Error("Kendi yönetici rolünüzü kaldıramazsınız.");
  }

  const hedef = await prisma.kullanici.findUnique({ where: { id } });
  if (!hedef) throw new Error("Kullanıcı bulunamadı.");

  if (posta !== hedef.eposta) {
    const baska = await prisma.kullanici.findUnique({ where: { eposta: posta } });
    if (baska) throw new Error("Bu e-posta adresiyle kayıtlı başka bir kullanıcı var.");
  }

  await prisma.kullanici.update({
    where: { id },
    data: {
      adSoyad: ad,
      eposta: posta,
      rol: uygulamaRoluDbDegeri(uygulamaRolu),
      buroRolu,
      dogumTarihi: /^\d{4}-\d{2}-\d{2}$/.test(dogumTarihi) ? new Date(`${dogumTarihi}T00:00:00Z`) : null,
      ...(yeniSifre ? { sifreHash: await sifreyiHashle(yeniSifre) } : {}),
    },
  });
  revalidatePath("/kokpit/ayarlar/kullanicilar");
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

// Kullaniciyi kalici siler. Dosya/musteri sorumlulugu gibi kayitlari varsa
// veritabani silmeye izin vermez; bu durumda "Girisi Kapat" onerilir.
export async function kullaniciSil(id: string, sifre: string): Promise<void> {
  const islemiYapan = await yetkiliKullaniciyiGetir();
  await silmeSifresiniDogrula(sifre);

  if (id === islemiYapan.kullaniciId) {
    throw new Error("Kendi hesabınızı silemezsiniz.");
  }
  const hedef = await prisma.kullanici.findUnique({ where: { id } });
  if (!hedef) return;
  if (hedef.rol === "YONETICI" && !sistemYoneticisiMi(islemiYapan.rol)) {
    throw new Error("Bir yöneticiyi silme yetkiniz yok.");
  }

  try {
    await prisma.kullanici.delete({ where: { id } });
  } catch {
    throw new Error(
      "Bu kullanıcının üzerinde kayıtlı dosya/müvekkil/rapor kayıtları var, silinemez. Bunun yerine “Girişi Kapat” kullanın.",
    );
  }
  revalidatePath("/kokpit/ayarlar/kullanicilar");
}
