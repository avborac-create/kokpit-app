"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BelgeTuru, HacizIslemDurumu, TeminatMuvafakatDurumu } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { hacizAvukatiMi } from "@/core/auth/yetki";
import { belgeSil } from "./depo";

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

// Dosyalar artik bu action'a HIC gelmiyor - tarayici secilir secilmez
// dogrudan Vercel Blob'a yukluyor (bkz. dosya-yukleme-alani.tsx,
// /api/haciz-raporu/blob-upload). Buraya sadece yuklemenin SONUCU
// (kucuk bir url + tarayicinin zaten bildigi ad/mime/boyut metadata'si)
// gizli input'lar olarak ulasir - Next.js Server Action'larinin 1MB'lik
// govde sinirini asmadan, zayif mobil sinyalde bile guvenilir calisir.
function tekBelgeOku(formData: FormData, alanAdi: string): { url: string; ad: string; mimeTipi: string; boyutBayt: number } | null {
  const url = metinYaAlNull(formData, `${alanAdi}Url`);
  if (!url) return null;
  return {
    url,
    ad: String(formData.get(`${alanAdi}Ad`) ?? alanAdi),
    mimeTipi: String(formData.get(`${alanAdi}MimeTipi`) ?? "application/octet-stream"),
    boyutBayt: Number(formData.get(`${alanAdi}Boyut`) ?? 0),
  };
}

function cokluBelgeOku(formData: FormData, alanAdi: string): { url: string; ad: string; mimeTipi: string; boyutBayt: number }[] {
  const urller = formData.getAll(`${alanAdi}Url`).map(String);
  const adlar = formData.getAll(`${alanAdi}Ad`).map(String);
  const mimeTipleri = formData.getAll(`${alanAdi}MimeTipi`).map(String);
  const boyutlar = formData.getAll(`${alanAdi}Boyut`).map(Number);
  return urller.map((url, i) => ({ url, ad: adlar[i] ?? alanAdi, mimeTipi: mimeTipleri[i] ?? "application/octet-stream", boyutBayt: boyutlar[i] ?? 0 }));
}

async function belgeKaydet(
  hacizRaporuId: string,
  belge: { url: string; ad: string; mimeTipi: string; boyutBayt: number },
  tur: BelgeTuru,
) {
  await prisma.belge.create({
    data: {
      hacizRaporuId,
      tur,
      adOnerisi: belge.ad,
      depoUrl: belge.url,
      mimeTipi: belge.mimeTipi,
      boyutBayt: belge.boyutBayt,
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

  const tutanakBelgesi = tekBelgeOku(formData, "hacizTutanagi");
  if (tutanakBelgesi) {
    await belgeKaydet(rapor.id, tutanakBelgesi, "HACIZ_TUTANAGI");
  }

  const protokolBelgesi = tekBelgeOku(formData, "protokol");
  if (protokolBelgesi) {
    await belgeKaydet(rapor.id, protokolBelgesi, "PROTOKOL");
  }

  for (const fotograf of cokluBelgeOku(formData, "fotograf")) {
    await belgeKaydet(rapor.id, fotograf, "FOTOGRAF");
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
