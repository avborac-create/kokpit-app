import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { hacizAvukatiMi } from "@/core/auth/yetki";

// Haciz avukatlari cogunlukla mobil/saha baglantisiyla calisiyor - telefon
// kamerasiyla cekilen fotograflar tek basina birkac MB olabilir, birden
// fazlasi birlikte kolayca Next.js Server Action'larinin varsayilan 1MB
// govde sinirini (ve Vercel'in kendi ~4.5MB platform sinirini) asar. Bu
// yuzden dosyalar sunucu action'indan DEGIL, tarayicidan DOGRUDAN Vercel
// Blob'a yuklenir (bkz. dosya-yukleme-alani.tsx) - bu route sadece o
// yuklemenin gerektirdigi, KISA OMURLU, tek-dosyaya-ozel bir token uretir.
// Token uretmeden ONCE oturum + rol kontrolu yapilmazsa, oturumsuz herkes
// bu route'u cagirip Blob deposuna keyfi dosya yukleyebilirdi.
export async function POST(request: Request): Promise<NextResponse> {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !hacizAvukatiMi(kullanici.rol)) {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const sonuc = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
          "image/heif",
        ],
        // Telefon kamerasi fotograflari icin comert bir ust sinir.
        maximumSizeInBytes: 25 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(sonuc);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
