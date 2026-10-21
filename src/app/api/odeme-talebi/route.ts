import { NextResponse } from "next/server";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { prisma } from "@/core/db/prisma";
import { masrafDokumu } from "@/modules/dava-dosyasi/lib/odeme-talebi";
import { odemeTalebiPdfUret } from "@/modules/dava-dosyasi/lib/odeme-talebi-pdf";

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
  const satirlar = basliklar
    .map((baslik, i) => ({ baslik: baslik.trim(), aciklama: (aciklamalar[i] ?? "").trim(), tutar: tutarlar[i] }))
    .filter((x) => x.baslik && Number.isFinite(x.tutar) && x.tutar !== 0)
    .slice(0, 30);
  if (satirlar.length === 0) return NextResponse.json({ hata: "En az bir tutar satırı gerekli." }, { status: 400 });

  const dokum = metin(fd, "dokum") === "1" ? await masrafDokumu(musteriId) : null;
  const sonOdeme = metin(fd, "sonOdemeTarihi");

  const pdf = await odemeTalebiPdfUret({
    musteriAdi: musteri.adSoyadUnvan,
    olusturmaTarihi: new Date().toISOString(),
    sonOdemeTarihi: /^\d{4}-\d{2}-\d{2}$/.test(sonOdeme) ? sonOdeme : null,
    satirlar,
    masrafDokumu: dokum,
    banka: metin(fd, "banka").slice(0, 80),
    iban: metin(fd, "iban").slice(0, 60),
    hesapSahibi: metin(fd, "hesapSahibi").slice(0, 120),
    aciklamaKodu: metin(fd, "aciklamaKodu").slice(0, 60),
    not: metin(fd, "not").slice(0, 600),
  });

  const dosyaAdi = `Muvekkil-Hesap-Ozeti-${musteri.adSoyadUnvan.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 40)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dosyaAdi}"`,
      "Cache-Control": "no-store",
    },
  });
}
