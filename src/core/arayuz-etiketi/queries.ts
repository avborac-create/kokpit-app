import { cache } from "react";
import { prisma } from "@/core/db/prisma";

// Kullanicinin "Paneli düzenle" ile degistirdigi basliklar/etiketler
// (anahtar -> metin). Kayit olmayan anahtarlar icin cagiran taraf kodda
// tanimli varsayilani kullanir.
export const etiketleriGetir = cache(async (): Promise<Record<string, string>> => {
  const satirlar = await prisma.arayuzEtiketi.findMany();
  return Object.fromEntries(satirlar.map((s) => [s.anahtar, s.metin]));
});
