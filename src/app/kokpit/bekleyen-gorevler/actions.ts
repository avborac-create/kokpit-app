"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

async function girisliKullanici() {
  const k = await mevcutKullanici();
  if (!k) throw new Error("Oturum bulunamadı.");
  return k;
}

export async function gorevEkle(baslik: string, sorumluId: string | null) {
  const k = await girisliKullanici();
  const metin = baslik.trim();
  if (!metin) return { hata: "Görev başlığı yazın." };
  await prisma.bekleyenGorev.create({
    data: { baslik: metin.slice(0, 300), sorumluId: sorumluId || k.kullaniciId, olusturanId: k.kullaniciId },
  });
  revalidatePath("/kokpit/bekleyen-gorevler");
  return { hata: null };
}

export async function gorevDurumuDegistir(id: string, tamam: boolean) {
  await girisliKullanici();
  await prisma.bekleyenGorev.update({
    where: { id },
    data: { tamamlandiMi: tamam, tamamlanmaTarihi: tamam ? new Date() : null },
  });
  revalidatePath("/kokpit/bekleyen-gorevler");
}

export async function gorevSil(id: string) {
  await girisliKullanici();
  await prisma.bekleyenGorev.delete({ where: { id } });
  revalidatePath("/kokpit/bekleyen-gorevler");
}
