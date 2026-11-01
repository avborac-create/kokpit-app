import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

// Isler yorumlarina fotograf/belge yuklemek icin tarayicidan dogrudan Vercel Blob'a yukleme tokeni uretir
// (telefon fotograflari Server Action govde sinirini asar). Oturumu olan her kullanici yukleyebilir.
export async function POST(request: Request): Promise<NextResponse> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return NextResponse.json({ error: "Oturum gerekli." }, { status: 403 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const sonuc = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "application/pdf"],
        maximumSizeInBytes: 25 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(sonuc);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
