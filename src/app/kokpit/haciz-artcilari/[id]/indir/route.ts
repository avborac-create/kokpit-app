import { NextResponse } from "next/server";
import { hacizRaporuGetir } from "@/modules/haciz-raporu/lib/queries";
import { hacizRaporuZipOlustur } from "@/modules/haciz-raporu/lib/zip";

// "Tek tıkla indir": tüm belgeleri (rapor PDF'i dahil, taze üretilir) tek
// bir ZIP'e paketleyip döner - kullanıcı ayrıca hiçbir belgeyi tek tek
// indirmez. Kimlik doğrulama proxy.ts'de (bkz. matcher) zaten zorunlu -
// oturumsuz istek buraya hiç ulaşmaz.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rapor = await hacizRaporuGetir(id);
  if (!rapor) {
    return NextResponse.json({ hata: "Haciz raporu bulunamadı." }, { status: 404 });
  }

  const zipBuffer = await hacizRaporuZipOlustur(rapor);
  const tarih = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
    .format(rapor.hacizTarihi)
    .replaceAll(".", "-");

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Haciz-${tarih}.zip"`,
    },
  });
}
