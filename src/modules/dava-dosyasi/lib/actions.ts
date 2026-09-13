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

// Karsi taraf secimini cozumler: "yeniKarsiTarafAdi" doluysa yeni bir
// KarsiTaraf olusturup id'sini dondurur, degilse secilen "karsiTarafId"yi
// (varsa) kullanir.
async function karsiTarafIdCozumle(formData: FormData, musteriIdleri: string[]): Promise<string | null> {
  const yeniAd = metinYaAlNull(formData, "yeniKarsiTarafAdi");
  if (yeniAd) {
    const yeni = await prisma.karsiTaraf.create({
      data: { musteriId: musteriIdleri[0], ad: yeniAd },
    });
    return yeni.id;
  }
  return metinYaAlNull(formData, "karsiTarafId");
}

// Uyusmazlik grubu secimini cozumler: "yeniUyusmazlikGrubuAdi" doluysa yeni
// bir UyusmazlikGrubu olusturup id'sini dondurur, degilse secilen
// "uyusmazlikGrubuId"yi (varsa) kullanir. Ayni alacagin/uyusmazligin birden
// fazla dosyaya (asil borclu + sonradan devreye giren kefil vb.) yayilmasi
// durumunda dosyalari tek bir grup altinda toplamak icin kullanilir.
async function uyusmazlikGrubuIdCozumle(formData: FormData, musteriIdleri: string[]): Promise<string | null> {
  const yeniAd = metinYaAlNull(formData, "yeniUyusmazlikGrubuAdi");
  if (yeniAd) {
    const yeni = await prisma.uyusmazlikGrubu.create({
      data: { musteriId: musteriIdleri[0], ad: yeniAd },
    });
    return yeni.id;
  }
  return metinYaAlNull(formData, "uyusmazlikGrubuId");
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

  const karsiTarafId = await karsiTarafIdCozumle(formData, musteriIdleri);
  const uyusmazlikGrubuId = await uyusmazlikGrubuIdCozumle(formData, musteriIdleri);

  const dosya = await prisma.davaDosyasi.create({
    data: {
      dosyaNo: metinYaAlNull(formData, "dosyaNo"),
      birimAdi: metinYaAlNull(formData, "birimAdi"),
      konu,
      karsiTarafId,
      uyusmazlikGrubuId,
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

  const karsiTarafId = await karsiTarafIdCozumle(formData, musteriIdleri);
  const uyusmazlikGrubuId = await uyusmazlikGrubuIdCozumle(formData, musteriIdleri);

  await prisma.$transaction([
    prisma.davaDosyasi.update({
      where: { id },
      data: {
        dosyaNo: metinYaAlNull(formData, "dosyaNo"),
        birimAdi: metinYaAlNull(formData, "birimAdi"),
        konu,
        karsiTarafId,
        uyusmazlikGrubuId,
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

export async function dosyaMasrafiEkle(dosyaId: string, formData: FormData) {
  const tarih = String(formData.get("tarih") ?? "");
  const cariKodId = String(formData.get("cariKodId") ?? "");
  const turId = String(formData.get("turId") ?? "");
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const tutar = String(formData.get("tutar") ?? "");

  if (!tarih || !cariKodId || !turId || !aciklama || !tutar) {
    throw new Error("Tarih, cari kod, tür, açıklama ve tutar alanları zorunludur.");
  }

  await prisma.dosyaMasrafi.create({
    data: {
      dosyaId,
      cariKodId,
      turId,
      tarih: new Date(tarih),
      aciklama,
      tutar,
    },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

export async function dosyaMasrafiSil(id: string, dosyaId: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.dosyaMasrafi.delete({ where: { id } });
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}
