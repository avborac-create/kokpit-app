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

function musteriIdleriniAl(formData: FormData): string[] {
  return formData.getAll("musteriIds").map(String).filter(Boolean);
}

export async function davaDosyasiOlustur(formData: FormData) {
  const konu = String(formData.get("konu") ?? "").trim();
  const durumId = String(formData.get("durumId") ?? "");
  const acilisTarihi = String(formData.get("acilisTarihi") ?? "");
  const musteriIdleri = musteriIdleriniAl(formData);

  if (!konu || !durumId || !acilisTarihi) {
    throw new Error("Konu, durum ve açılış tarihi alanları zorunludur.");
  }
  if (musteriIdleri.length === 0) {
    throw new Error("En az bir müvekkil seçilmelidir.");
  }

  const dosya = await prisma.davaDosyasi.create({
    data: {
      dosyaNo: metinYaAlNull(formData, "dosyaNo"),
      birimAdi: metinYaAlNull(formData, "birimAdi"),
      konu,
      durumId,
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      acilisTarihi: new Date(acilisTarihi),
      aciklama: metinYaAlNull(formData, "aciklama"),
      muvekkiller: {
        create: musteriIdleri.map((musteriId) => ({ musteriId })),
      },
    },
  });

  revalidatePath("/kokpit/dava-dosyalari");
  redirect(`/kokpit/dava-dosyalari/${dosya.id}`);
}

export async function davaDosyasiGuncelle(id: string, formData: FormData) {
  const konu = String(formData.get("konu") ?? "").trim();
  const durumId = String(formData.get("durumId") ?? "");
  const acilisTarihi = String(formData.get("acilisTarihi") ?? "");
  const kapanisTarihiHam = String(formData.get("kapanisTarihi") ?? "").trim();
  const musteriIdleri = musteriIdleriniAl(formData);

  if (!konu || !durumId || !acilisTarihi) {
    throw new Error("Konu, durum ve açılış tarihi alanları zorunludur.");
  }
  if (musteriIdleri.length === 0) {
    throw new Error("En az bir müvekkil seçilmelidir.");
  }

  await prisma.$transaction([
    prisma.davaDosyasi.update({
      where: { id },
      data: {
        dosyaNo: metinYaAlNull(formData, "dosyaNo"),
        birimAdi: metinYaAlNull(formData, "birimAdi"),
        konu,
        durumId,
        sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
        acilisTarihi: new Date(acilisTarihi),
        kapanisTarihi: kapanisTarihiHam ? new Date(kapanisTarihiHam) : null,
        aciklama: metinYaAlNull(formData, "aciklama"),
      },
    }),
    prisma.dosyaMuvekkili.deleteMany({
      where: { dosyaId: id, musteriId: { notIn: musteriIdleri } },
    }),
    ...musteriIdleri.map((musteriId) =>
      prisma.dosyaMuvekkili.upsert({
        where: { dosyaId_musteriId: { dosyaId: id, musteriId } },
        update: {},
        create: { dosyaId: id, musteriId },
      }),
    ),
  ]);

  revalidatePath("/kokpit/dava-dosyalari");
  revalidatePath(`/kokpit/dava-dosyalari/${id}`);
  redirect(`/kokpit/dava-dosyalari/${id}`);
}

export async function davaDosyasiSil(id: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.davaDosyasi.delete({ where: { id } });
  revalidatePath("/kokpit/dava-dosyalari");
  redirect("/kokpit/dava-dosyalari");
}
