"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

function metin(f: FormData, ad: string): string | null {
  const d = String(f.get(ad) ?? "").trim();
  return d === "" ? null : d;
}

function tarih(f: FormData, ad: string): Date | null {
  const d = metin(f, ad);
  if (!d) return null;
  const t = new Date(`${d}T12:00:00`);
  if (Number.isNaN(t.getTime())) throw new Error("Geçersiz tarih.");
  return t;
}

export async function ihtarGonderimiKaydet(dosyaId: string, f: FormData): Promise<{ hata?: string }> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return { hata: "Bu işlem için yetkiniz yok." };
  try {
    const dosya = await prisma.davaDosyasi.findUnique({ where: { id: dosyaId }, select: { tur: { select: { kod: true } } } });
    if (dosya?.tur?.kod !== "ihtar_dosyasi") return { hata: "Bu panel yalnızca ihtar dosyaları içindir." };
    const yolHam = metin(f, "yol");
    const yol = yolHam === "NOTER" || yolHam === "KEP" ? yolHam : null;
    const durumHam = metin(f, "tebligDurumu");
    const tebligDurumu = durumHam === "BEKLIYOR" || durumHam === "TEBLIG_EDILDI" || durumHam === "IADE" ? durumHam : null;
    const sureHam = metin(f, "cevapSuresiGun");
    const cevapSuresiGun = sureHam ? Number.parseInt(sureHam, 10) : null;
    if (cevapSuresiGun !== null && (!Number.isFinite(cevapSuresiGun) || cevapSuresiGun < 0)) {
      return { hata: "Cevap süresi gün olarak girilmelidir." };
    }
    const veri = {
      yol,
      noterlik: yol === "NOTER" ? metin(f, "noterlik") : null,
      yevmiyeNo: yol === "NOTER" ? metin(f, "yevmiyeNo") : null,
      kepAdresi: yol === "KEP" ? metin(f, "kepAdresi") : null,
      kepGonderimNo: yol === "KEP" ? metin(f, "kepGonderimNo") : null,
      gonderimTarihi: tarih(f, "gonderimTarihi"),
      muhatap: metin(f, "muhatap"),
      tebligDurumu,
      tebligTarihi: tarih(f, "tebligTarihi"),
      cevapSuresiGun,
      cevapGeldi: f.get("cevapGeldi") === "on",
      not: metin(f, "not"),
    };
    await prisma.ihtarGonderimi.upsert({ where: { dosyaId }, create: { dosyaId, ...veri }, update: veri });
    revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}
