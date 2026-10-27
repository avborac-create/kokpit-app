import { NextResponse } from "next/server";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { prisma } from "@/core/db/prisma";
import { masrafDokumu } from "@/modules/dava-dosyasi/lib/odeme-talebi";
import { odemeTalebiPdfUret } from "@/modules/dava-dosyasi/lib/odeme-talebi-pdf";
import {
  EK_AZAMI_ADET,
  EK_AZAMI_TOPLAM_BAYT,
  ekGorunenAd,
  ekTuruBul,
  ekleriBirlestir,
  type EkDosya,
} from "@/modules/dava-dosyasi/lib/odeme-talebi-ekler";

export const runtime = "nodejs";

function metin(fd: FormData, alan: string): string {
  return String(fd.get(alan) ?? "").trim();
}

// Müvekkile gönderilecek "Müvekkil Hesap Özeti" belgesini (A4 PDF) üretir.
export async function POST(request: Request) {
  if (!(await mevcutKullanici())) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const fd = await request.formData();

  const musteriId = metin(fd, "musteriId");
  const musteri = await prisma.musteri.findUnique({ where: { id: musteriId }, select: { adSoyadUnvan: true } });
  if (!musteri) return NextResponse.json({ hata: "Müvekkil bulunamadı" }, { status: 404 });

  const basliklar = fd.getAll("satirBaslik").map(String);
  const aciklamalar = fd.getAll("satirAciklama").map(String);
  const tutarlar = fd.getAll("satirTutar").map((t) => Number(String(t).replace(",", ".")));
  const opsiyonelSayi = (alan: string) => fd.getAll(alan).map((t) => (String(t).trim() === "" ? undefined : Number(t)));
  const tahakkuklar = opsiyonelSayi("satirTahakkuk");
  const odenenler = opsiyonelSayi("satirOdenen");
  const kalanlar = opsiyonelSayi("satirKalan");
  const satirlar = basliklar
    .map((baslik, i) => ({
      baslik: baslik.trim(),
      aciklama: (aciklamalar[i] ?? "").trim(),
      tutar: tutarlar[i],
      tahakkuk: Number.isFinite(tahakkuklar[i]) ? tahakkuklar[i] : undefined,
      odenen: Number.isFinite(odenenler[i]) ? odenenler[i] : undefined,
      kalan: Number.isFinite(kalanlar[i]) ? kalanlar[i] : undefined,
    }))
    .filter((x) => x.baslik && Number.isFinite(x.tutar) && x.tutar !== 0)
    .slice(0, 30);
  if (satirlar.length === 0) return NextResponse.json({ hata: "En az bir tutar satırı gerekli." }, { status: 400 });

  // Ek belgeler (PDF / resim): belgenin sonuna EK-1, EK-2... olarak eklenir.
  const ekDosyalari = fd.getAll("ek").filter((x): x is File => x instanceof File && x.size > 0);
  if (ekDosyalari.length > EK_AZAMI_ADET) return NextResponse.json({ hata: `En çok ${EK_AZAMI_ADET} ek yüklenebilir.` }, { status: 400 });
  if (ekDosyalari.reduce((t, x) => t + x.size, 0) > EK_AZAMI_TOPLAM_BAYT) {
    return NextResponse.json({ hata: "Ekler toplamda 4 MB'ı aşamaz." }, { status: 413 });
  }
  const ekler: EkDosya[] = [];
  for (const dosya of ekDosyalari) {
    const tur = ekTuruBul(dosya.name, dosya.type);
    if (!tur) return NextResponse.json({ hata: `${dosya.name}: bu dosya türü eklenemez (PDF, HTML ya da resim olmalı).` }, { status: 415 });
    ekler.push({ ad: ekGorunenAd(dosya.name), tur, bayt: new Uint8Array(await dosya.arrayBuffer()) });
  }

  const dokum = metin(fd, "dokum") === "1" ? await masrafDokumu(musteriId) : null;
  const sonOdeme = metin(fd, "sonOdemeTarihi");

  const anaPdf = await odemeTalebiPdfUret({
    musteriAdi: musteri.adSoyadUnvan,
    hitap: ["Bey", "Hanım"].includes(metin(fd, "hitap")) ? metin(fd, "hitap") : "",
    olusturmaTarihi: new Date().toISOString(),
    sonOdemeTarihi: /^\d{4}-\d{2}-\d{2}$/.test(sonOdeme) ? sonOdeme : null,
    satirlar,
    ekler: ekler.map((e) => e.ad),
    masrafDokumu: dokum,
    banka: metin(fd, "banka").slice(0, 80),
    iban: metin(fd, "iban").slice(0, 60),
    hesapSahibi: metin(fd, "hesapSahibi").slice(0, 120),
    aciklamaKodu: metin(fd, "aciklamaKodu").slice(0, 60),
    not: metin(fd, "not").slice(0, 600),
  });

  let pdf: Uint8Array;
  try {
    pdf = await ekleriBirlestir(new Uint8Array(anaPdf), ekler);
  } catch {
    return NextResponse.json({ hata: "Bir ek okunamadı (şifreli ya da bozuk PDF olabilir)." }, { status: 422 });
  }

  const dosyaAdi = `Muvekkil-Hesap-Ozeti-${musteri.adSoyadUnvan
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)}.pdf`;
  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dosyaAdi}"`,
      "Cache-Control": "no-store",
    },
  });
}
