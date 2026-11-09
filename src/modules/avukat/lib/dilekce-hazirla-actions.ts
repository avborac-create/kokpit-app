"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { udfUret, type UdfSatiri } from "@/modules/avukat/lib/udf-uret";

const buyuk = (s: string) => s.toLocaleUpperCase("tr");
const satirlaraBol = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

// Duruşma Dosyaları > "Dilekçe hazırla": formdan UDF üretir ve dosyanın evrakları arasına
// "Hazırlanan Dilekçeler" klasörüne kaydeder; böylece sonradan da indirilip paylaşılabilir.
export async function dilekceHazirla(hedef: "cmk" | "dava", dosyaId: string, formData: FormData): Promise<{ evrakId: string; ad: string }> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Oturum bulunamadı.");

  const alan = (ad: string) => String(formData.get(ad) ?? "").trim();
  const mahkeme = alan("mahkeme");
  const dosyaNo = alan("dosyaNo");
  const konu = alan("konu");
  const aciklama = alan("aciklama");
  if (!mahkeme || !konu || !aciklama) throw new Error("Mahkeme, konu ve açıklamalar boş olamaz.");
  const taraflar = satirlaraBol(alan("taraflar"));
  const sonuc = alan("sonuc");
  const vekil = alan("vekil") || kullanici.adSoyad;
  const tarih = alan("tarih") || new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });

  const satirlar: UdfSatiri[] = [
    { metin: `${buyuk(mahkeme)} SAYIN HAKİMLİĞİNE`, kalin: true, hiza: "orta" },
    { metin: "" },
    ...(dosyaNo ? [{ metin: `DOSYA NO : ${dosyaNo}`, kalin: true } as UdfSatiri] : []),
    { metin: "" },
    ...taraflar.map((t) => ({ metin: t }) as UdfSatiri),
    ...(taraflar.length ? [{ metin: "" } as UdfSatiri] : []),
    { metin: `KONU : ${konu}`, kalin: true },
    { metin: "" },
    { metin: "AÇIKLAMALAR :", kalin: true },
    ...satirlaraBol(aciklama).map((p) => ({ metin: p, hiza: "iki-yana", ilkSatirGirintisi: true }) as UdfSatiri),
    { metin: "" },
    ...(sonuc ? [{ metin: "SONUÇ VE İSTEM :", kalin: true } as UdfSatiri, ...satirlaraBol(sonuc).map((p) => ({ metin: p, hiza: "iki-yana", ilkSatirGirintisi: true }) as UdfSatiri)] : []),
    { metin: "" },
    { metin: tarih, hiza: "sag" },
    { metin: `Av. ${vekil}`, hiza: "sag", kalin: true },
  ];

  const { udf, duzMetin } = await udfUret(satirlar);
  const bugun = new Date().toISOString().slice(0, 10).split("-").reverse().join(".");
  const ad = `${konu} (hazırlanan dilekçe ${bugun})`;
  const evrak = await prisma.cMKEvrak.create({
    data: {
      ...(hedef === "dava" ? { davaDosyasiId: dosyaId } : { cmkDosyasiId: dosyaId }),
      klasor: "Hazırlanan Dilekçeler",
      ad,
      evrakTarihi: new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`),
      mimeTipi: "application/vnd.uyap.udf",
      boyutBayt: udf.length,
      onizlemeTuru: "METIN",
      icerik: { create: { orijinalAd: `${konu.replace(/[\\/:*?"<>|]/g, "").slice(0, 80)}.udf`, orijinal: new Uint8Array(udf), metin: duzMetin } },
    },
    select: { id: true },
  });
  revalidatePath("/kokpit/avukat/durusma-dosyalari");
  return { evrakId: evrak.id, ad };
}
