import { NextResponse, type NextRequest } from "next/server";
import { OTURUM_COOKIE_ADI, oturumTokeniDogrula } from "@/core/auth/session";

const GIRIS_YOLU = "/giris";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(OTURUM_COOKIE_ADI)?.value;
  const oturum = await oturumTokeniDogrula(token);

  const girisSayfasindaMi = request.nextUrl.pathname.startsWith(GIRIS_YOLU);

  if (!oturum && !girisSayfasindaMi) {
    const url = request.nextUrl.clone();
    url.pathname = GIRIS_YOLU;
    return NextResponse.redirect(url);
  }

  if (oturum && girisSayfasindaMi) {
    const url = request.nextUrl.clone();
    url.pathname = "/kokpit";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)"],
};
