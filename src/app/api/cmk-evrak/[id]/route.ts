import { NextResponse } from "next/server";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

// CMK evrakini oturum acmis kullaniciya sunar. ?tur=onizleme (varsayilan:
// tarayicida gosterilecek hali), ?tur=orijinal (indirme), ?tur=metin (UDF metni).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await mevcutKullanici())) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const tur = new URL(request.url).searchParams.get("tur") ?? "onizleme";

  const evrak = await prisma.cMKEvrak.findUnique({ where: { id }, include: { icerik: true } });
  if (!evrak?.icerik) return NextResponse.json({ hata: "Bulunamadı" }, { status: 404 });
  const { icerik } = evrak;

  if (tur === "metin") {
    return new NextResponse(icerik.metin ?? "", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
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
