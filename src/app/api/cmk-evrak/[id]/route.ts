import { NextResponse } from "next/server";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { udfHtmlUret } from "@/modules/cmk-dosyalari/lib/udf-html";
import { docxHtmlUret } from "@/modules/cmk-dosyalari/lib/docx-html";

// CMK evrakini oturum acmis kullaniciya sunar. ?tur=onizleme (varsayilan:
// tarayicida gosterilecek hali), ?tur=orijinal (indirme), ?tur=metin (UDF metni).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const tur = new URL(request.url).searchParams.get("tur") ?? "onizleme";

  const evrak = await prisma.cMKEvrak.findUnique({ where: { id }, include: { icerik: true } });
  if (!evrak?.icerik || (evrak.ozelKullaniciId && evrak.ozelKullaniciId !== kullanici.kullaniciId)) {
    return NextResponse.json({ hata: "Bulunamadı" }, { status: 404 });
  }
  const { icerik } = evrak;

  if (tur === "metin") {
    return new NextResponse(icerik.metin ?? "", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (tur === "html") {
    const kaynak = Buffer.from(icerik.orijinal);
    const html = evrak.mimeTipi.includes("wordprocessingml") ? await docxHtmlUret(kaynak) : await udfHtmlUret(kaynak);
    if (!html) return NextResponse.json({ hata: "Önizleme üretilemedi" }, { status: 422 });
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "sandbox allow-scripts; default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
        "Cache-Control": "private, max-age=300",
      },
    });
  }
  // Cok sayfali TIF: sayfa sayisi ve her sayfa ayri PNG olarak orijinalden uretilir.
  if (evrak.mimeTipi === "image/tiff" && (tur === "bilgi" || tur === "sayfa")) {
    try {
      const sharp = (await import("sharp")).default;
      const kaynak = Buffer.from(icerik.orijinal);
      if (tur === "bilgi") {
        const meta = await sharp(kaynak).metadata();
        return NextResponse.json({ sayfa: meta.pages ?? 1 });
      }
      const no = Math.max(1, Number(new URL(request.url).searchParams.get("no") ?? "1") || 1);
      const png = await sharp(kaynak, { page: no - 1 })
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .png()
        .toBuffer();
      return new NextResponse(new Uint8Array(png), {
        headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=300" },
      });
    } catch {
      return NextResponse.json({ hata: "Sayfa üretilemedi" }, { status: 422 });
    }
  }
  if (tur === "bilgi") return NextResponse.json({ sayfa: 1 });
  const indir = tur === "orijinal";
  const bayt = !indir && icerik.onizleme ? icerik.onizleme : icerik.orijinal;
  const mime = !indir && icerik.onizlemeMime ? icerik.onizlemeMime : evrak.mimeTipi;
  return new NextResponse(new Uint8Array(bayt), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${indir ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(icerik.orijinalAd)}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
