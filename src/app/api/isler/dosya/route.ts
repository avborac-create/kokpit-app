import { get } from "@vercel/blob";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

// Ozel depodaki is eki dosyasini, oturum acmis kullaniciya sunucu uzerinden akitir.
export async function GET(request: Request): Promise<Response> {
  const k = await mevcutKullanici();
  if (!k) return new Response("Oturum gerekli.", { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  const ek = id ? await prisma.isEki.findUnique({ where: { id } }) : null;
  if (!ek) return new Response("Bulunamadı.", { status: 404 });
  const sonuc = await get(ek.url, { access: "private" });
  if (!sonuc || sonuc.stream === null) return new Response("Dosya bulunamadı.", { status: 404 });
  return new Response(sonuc.stream, {
    headers: {
      "Content-Type": ek.tur || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(ek.ad)}`,
    },
  });
}
