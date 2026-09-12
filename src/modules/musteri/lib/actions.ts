"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

function metinYaAlNull(formData: FormData, alan: string): string | null {
  const deger = String(formData.get(alan) ?? "").trim();
  return deger === "" ? null : deger;
}

export async function musteriOlustur(formData: FormData) {
  const adSoyadUnvan = String(formData.get("adSoyadUnvan") ?? "").trim();
  const tipId = String(formData.get("tipId") ?? "");
  const durumId = String(formData.get("durumId") ?? "");

  if (!adSoyadUnvan || !tipId || !durumId) {
    throw new Error("Ad/Soyad/Unvan, tip ve durum alanları zorunludur.");
  }

  const musteri = await prisma.musteri.create({
    data: {
      adSoyadUnvan,
      tipId,
      durumId,
      telefon: metinYaAlNull(formData, "telefon"),
      eposta: metinYaAlNull(formData, "eposta"),
      adres: metinYaAlNull(formData, "adres"),
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      notlar: metinYaAlNull(formData, "notlar"),
    },
  });

  revalidatePath("/kokpit/musteriler");
  redirect(`/kokpit/musteriler/${musteri.id}`);
}

export async function musteriGuncelle(id: string, formData: FormData) {
  const adSoyadUnvan = String(formData.get("adSoyadUnvan") ?? "").trim();
  const tipId = String(formData.get("tipId") ?? "");
  const durumId = String(formData.get("durumId") ?? "");

  if (!adSoyadUnvan || !tipId || !durumId) {
    throw new Error("Ad/Soyad/Unvan, tip ve durum alanları zorunludur.");
  }

  await prisma.musteri.update({
    where: { id },
    data: {
      adSoyadUnvan,
      tipId,
      durumId,
      telefon: metinYaAlNull(formData, "telefon"),
      eposta: metinYaAlNull(formData, "eposta"),
      adres: metinYaAlNull(formData, "adres"),
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      notlar: metinYaAlNull(formData, "notlar"),
    },
  });

  revalidatePath("/kokpit/musteriler");
  revalidatePath(`/kokpit/musteriler/${id}`);
  redirect(`/kokpit/musteriler/${id}`);
}

export async function musteriSil(id: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.musteri.delete({ where: { id } });
  revalidatePath("/kokpit/musteriler");
  redirect("/kokpit/musteriler");
}

export async function paraTrafigiKaydiEkle(musteriId: string, formData: FormData) {
  const tarih = String(formData.get("tarih") ?? "");
  const tipId = String(formData.get("tipId") ?? "");
  const durumId = String(formData.get("durumId") ?? "");
  const kaynakId = String(formData.get("kaynakId") ?? "");
  const tutar = String(formData.get("tutar") ?? "");

  if (!tarih || !tipId || !durumId || !kaynakId || !tutar) {
    throw new Error("Tarih, tip, durum, kaynak ve tutar alanları zorunludur.");
  }

  await prisma.musteriParaTrafigi.create({
    data: {
      musteriId,
      tarih: new Date(tarih),
      tipId,
      durumId,
      kaynakId,
      tutar,
      aciklama: metinYaAlNull(formData, "aciklama"),
      ilgiliDosyaId: metinYaAlNull(formData, "ilgiliDosyaId"),
      dosyaId: metinYaAlNull(formData, "dosyaId"),
    },
  });

  revalidatePath(`/kokpit/musteriler/${musteriId}`);
}

export async function paraTrafigiKaydiSil(musteriId: string, kayitId: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.musteriParaTrafigi.delete({ where: { id: kayitId } });
  revalidatePath(`/kokpit/musteriler/${musteriId}`);
}
