"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

export async function oneriGonder(formData: FormData) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) {
    throw new Error("Giriş yapmalısınız.");
  }

  const metin = String(formData.get("metin") ?? "").trim();
  const sayfaYolu = String(formData.get("sayfaYolu") ?? "").trim();
  const gorselVeriHam = String(formData.get("gorselVeri") ?? "").trim();

  if (!metin) {
    throw new Error("Öneri metni zorunludur.");
  }

  await prisma.oneri.create({
    data: {
      kullaniciId: kullanici.kullaniciId,
      metin,
      sayfaYolu: sayfaYolu || "/",
      gorselVeri: gorselVeriHam || null,
    },
  });

  revalidatePath("/kokpit/oneriler");
}

export async function oneriIslendiIsaretle(id: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.oneri.update({ where: { id }, data: { islendiMi: true } });
  revalidatePath("/kokpit/oneriler");
}

export async function oneriSil(id: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.oneri.delete({ where: { id } });
  revalidatePath("/kokpit/oneriler");
}
