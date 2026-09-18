"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

const AYARLAR_YOLU = "/kokpit/ayarlar/secenekler";

async function yetkiKontrolEt() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
}

// "Peşin Harç" -> "pesin_harc" gibi makine-okunur bir anahtar uretir. Kod
// bir kere olusturulunca DEGISTIRILMEZ (bkz. secenekDegeriGuncelle) - baska
// yerlerdeki kod bazli eslemeler (orn. TIP_KOD_ILE_ESLESEN_CARI_KOD_KODU)
// bu yuzden guvenlidir.
function etiketiKoduDonustur(etiket: string): string {
  const harfDonusumleri: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  const donusturulmus = etiket
    .split("")
    .map((harf) => harfDonusumleri[harf] ?? harf)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return donusturulmus || "deger";
}

export async function secenekDegeriEkle(listeId: string, formData: FormData) {
  await yetkiKontrolEt();

  const etiket = String(formData.get("etiket") ?? "").trim();
  if (!etiket) {
    throw new Error("Etiket alanı zorunludur.");
  }

  const temelKod = etiketiKoduDonustur(etiket);
  let kod = temelKod;
  let sayac = 2;
  while (await prisma.secenekDegeri.findUnique({ where: { listeId_kod: { listeId, kod } } })) {
    kod = `${temelKod}_${sayac}`;
    sayac += 1;
  }

  const enBuyukSira = await prisma.secenekDegeri.aggregate({
    where: { listeId },
    _max: { siraNo: true },
  });

  await prisma.secenekDegeri.create({
    data: {
      listeId,
      kod,
      etiket,
      siraNo: (enBuyukSira._max.siraNo ?? -1) + 1,
    },
  });

  revalidatePath(AYARLAR_YOLU);
  updateTag("secenek-listeleri");
}

export async function secenekDegeriEtiketGuncelle(id: string, formData: FormData) {
  await yetkiKontrolEt();

  const etiket = String(formData.get("etiket") ?? "").trim();
  if (!etiket) {
    throw new Error("Etiket alanı zorunludur.");
  }

  await prisma.secenekDegeri.update({ where: { id }, data: { etiket } });
  revalidatePath(AYARLAR_YOLU);
  updateTag("secenek-listeleri");
}

export async function secenekDegeriAktifligiDegistir(id: string, aktifMi: boolean) {
  await yetkiKontrolEt();
  await prisma.secenekDegeri.update({ where: { id }, data: { aktifMi } });
  revalidatePath(AYARLAR_YOLU);
  updateTag("secenek-listeleri");
}

export async function secenekDegeriSiraDegistir(id: string, yon: "yukari" | "asagi") {
  await yetkiKontrolEt();

  const deger = await prisma.secenekDegeri.findUnique({ where: { id } });
  if (!deger) return;

  const komsu = await prisma.secenekDegeri.findFirst({
    where: {
      listeId: deger.listeId,
      siraNo: yon === "yukari" ? { lt: deger.siraNo } : { gt: deger.siraNo },
    },
    orderBy: { siraNo: yon === "yukari" ? "desc" : "asc" },
  });
  if (!komsu) return;

  await prisma.$transaction([
    prisma.secenekDegeri.update({ where: { id: deger.id }, data: { siraNo: komsu.siraNo } }),
    prisma.secenekDegeri.update({ where: { id: komsu.id }, data: { siraNo: deger.siraNo } }),
  ]);

  revalidatePath(AYARLAR_YOLU);
  updateTag("secenek-listeleri");
}
