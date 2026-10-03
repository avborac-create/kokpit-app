import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "./mevcut-kullanici";
import { sifreDogrula } from "./password";

// Geri alinamaz silme islemlerinde, oturumu acik kullanicinin KENDI giris
// sifresini yeniden ister - acik birakilmis bir oturumdan ya da yanlislikla
// tiklamayla kayit silinmesin. Kontrol sunucuda yapilir (arayuzdeki sifre
// kutusu tek basina koruma saglamaz).
export async function silmeSifresiniDogrula(sifre: string | undefined): Promise<void> {
  const oturum = await mevcutKullanici();
  if (!oturum) throw new Error("Oturum bulunamadı. Lütfen yeniden giriş yapın.");
  if (!sifre) throw new Error("Silmek için şifrenizi girin.");

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: oturum.kullaniciId },
    select: { sifreHash: true, aktifMi: true },
  });
  if (!kullanici?.aktifMi || !(await sifreDogrula(sifre, kullanici.sifreHash))) {
    throw new Error("Şifre hatalı.");
  }
}
