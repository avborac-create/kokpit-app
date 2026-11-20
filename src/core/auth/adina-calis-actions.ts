"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { gercekKullanici } from "./mevcut-kullanici";
import { ADINA_COOKIE_ADI, OTURUM_COOKIE_SECENEKLERI, adinaTokeniOlustur } from "./session";

// Yalniz GERCEK yonetici baslatabilir; secilen kullanici aktif olmali. Her baslangic/bitis kayda gecer.
export async function adinaCalisBaslat(hedefId: string): Promise<{ hata?: string }> {
  try {
    const g = await gercekKullanici();
    if (!g || g.rol !== "YONETICI") throw new Error("Bu özellik yalnız yöneticiler içindir.");
    if (hedefId === g.kullaniciId) throw new Error("Zaten kendi hesabınızdasınız.");
    const h = await prisma.kullanici.findUnique({ where: { id: hedefId }, select: { aktifMi: true } });
    if (!h?.aktifMi) throw new Error("Kullanıcı bulunamadı ya da pasif.");
    await prisma.adinaCalismaKaydi.updateMany({ where: { yoneticiId: g.kullaniciId, bitis: null }, data: { bitis: new Date() } });
    await prisma.adinaCalismaKaydi.create({ data: { yoneticiId: g.kullaniciId, hedefKullaniciId: hedefId } });
    const token = await adinaTokeniOlustur(g.kullaniciId, hedefId);
    (await cookies()).set(ADINA_COOKIE_ADI, token, { ...OTURUM_COOKIE_SECENEKLERI, maxAge: 60 * 60 * 8 });
    revalidatePath("/kokpit", "layout");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Başlatılamadı." };
  }
}

export async function adinaCalisBitir(): Promise<{ hata?: string }> {
  try {
    const g = await gercekKullanici();
    if (g) await prisma.adinaCalismaKaydi.updateMany({ where: { yoneticiId: g.kullaniciId, bitis: null }, data: { bitis: new Date() } });
    (await cookies()).delete(ADINA_COOKIE_ADI);
    revalidatePath("/kokpit", "layout");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Bitirilemedi." };
  }
}
