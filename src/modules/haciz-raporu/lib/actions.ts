"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BelgeTuru, HacizIslemDurumu, TeminatMuvafakatDurumu } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { hacizAvukatiMi } from "@/core/auth/yetki";
import { belgeYukle, belgeSil } from "./depo";

function metinYaAlNull(formData: FormData, alan: string): string | null {
  const deger = String(formData.get(alan) ?? "").trim();
  return deger === "" ? null : deger;
}

async function yetkiKontrolEt() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !hacizAvukatiMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok - haciz raporu sadece sorumlu avukatlar tarafından girilebilir.");
  }
  return kullanici;
}

// FormData'daki bos dosya input'lari (kullanici hicbir sey secmediginde)
// tarayicidan boyutu 0 olan bir File nesnesi olarak gelir - gercek bir
// yukleme ile ayirt etmek icin boyut kontrolu sart.
function gercekDosyaMi(deger: FormDataEntryValue | null): deger is File {
  return deger instanceof File && deger.size > 0;
}

async function belgeKaydet(hacizRaporuId: string, dosya: File, tur: BelgeTuru, adOnerisi: string) {
  const buffer = Buffer.from(await dosya.arrayBuffer());
  const { depoUrl, boyutBayt } = await belgeYukle(hacizRaporuId, dosya.name, buffer, dosya.type || "application/octet-stream");
  await prisma.belge.create({
    data: {
      hacizRaporuId,
      tur,
      adOnerisi,
      depoUrl,
      mimeTipi: dosya.type || "application/octet-stream",
      boyutBayt,
    },
  });
}

export async function hacizRaporuOlustur(formData: FormData) {
  const kullanici = await yetkiKontrolEt();

  const davaDosyasiId = String(formData.get("davaDosyasiId") ?? "");
  const hacizTarihiHam = String(formData.get("hacizTarihi") ?? "");
  const islemYapilanBorclular = String(formData.get("islemYapilanBorclular") ?? "").trim();
  const muhafazaDurumu = String(formData.get("muhafazaDurumu") ?? "") as HacizIslemDurumu;
  const istihkakDurumu = String(formData.get("istihkakDurumu") ?? "") as HacizIslemDurumu;
  const kiymetTakdiriDurumu = String(formData.get("kiymetTakdiriDurumu") ?? "") as HacizIslemDurumu;
  const teminatIadesineMuvafakat = String(formData.get("teminatIadesineMuvafakat") ?? "") as TeminatMuvafakatDurumu;
  const tahsilatMiktariHam = String(formData.get("tahsilatMiktari") ?? "").trim();
  const protokolYapildiMi = String(formData.get("protokolYapildiMi") ?? "evet") === "evet";

  if (
    !davaDosyasiId ||
    !hacizTarihiHam ||
    !islemYapilanBorclular ||
    !muhafazaDurumu ||
    !istihkakDurumu ||
    !kiymetTakdiriDurumu ||
    !teminatIadesineMuvafakat ||
    tahsilatMiktariHam === ""
  ) {
    throw new Error("İcra Dosyası, Haciz Tarihi, Borçlular, Haciz İşlemi Detayları ve Tahsilat Miktarı zorunludur.");
  }

  const irtibatNumaralari = String(formData.get("irtibatNumaralari") ?? "")
    .split("\n")
    .map((satir) => satir.trim())
    .filter(Boolean);

  const rapor = await prisma.hacizRaporu.create({
    data: {
      davaDosyasiId,
      avukatId: kullanici.kullaniciId,
      hacizTarihi: new Date(hacizTarihiHam),
      islemYapilanBorclular,
      irtibatNumaralari,
      muhafazaDurumu,
      istihkakDurumu,
      kiymetTakdiriDurumu,
      teminatIadesineMuvafakat,
      tahsilatMiktari: tahsilatMiktariHam,
      tahsilatKanaliId: metinYaAlNull(formData, "tahsilatKanaliId"),
      avukatGorusu: metinYaAlNull(formData, "avukatGorusu"),
      protokolYapildiMi,
    },
  });

  const tutanakDosyasi = formData.get("hacizTutanagiDosyasi");
  if (gercekDosyaMi(tutanakDosyasi)) {
    await belgeKaydet(rapor.id, tutanakDosyasi, "HACIZ_TUTANAGI", tutanakDosyasi.name);
  }

  const protokolDosyasi = formData.get("protokolDosyasi");
  if (gercekDosyaMi(protokolDosyasi)) {
    await belgeKaydet(rapor.id, protokolDosyasi, "PROTOKOL", protokolDosyasi.name);
  }

  const fotograflar = formData.getAll("fotograflar");
  for (const fotograf of fotograflar) {
    if (gercekDosyaMi(fotograf)) {
      await belgeKaydet(rapor.id, fotograf, "FOTOGRAF", fotograf.name);
    }
  }

  revalidatePath("/kokpit/haciz-artcilari");
  redirect(`/kokpit/haciz-artcilari/${rapor.id}`);
}

export async function hacizRaporuSil(id: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !hacizAvukatiMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  const rapor = await prisma.hacizRaporu.findUnique({ where: { id }, include: { belgeler: true } });
  if (!rapor) return;

  for (const belge of rapor.belgeler) {
    await belgeSil(belge.depoUrl);
  }
  await prisma.hacizRaporu.delete({ where: { id } });

  revalidatePath("/kokpit/haciz-artcilari");
}
