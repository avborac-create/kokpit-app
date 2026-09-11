import { SignJWT, jwtVerify } from "jose";
import type { KullaniciRolu } from "@prisma/client";

// Oturum, veritabaninda tutulmayan imzali bir JWT olarak cookie'de saklanir.
// Bu, middleware'in (edge runtime) veritabanina gitmeden oturumu dogrulamasini
// saglar. Ilk faz icin yeterli; oturum iptali gerekiyorsa (orn. kullanici
// pasife alindiginda) sure sonunda (30 gun) kendiliginden duser.

export const OTURUM_COOKIE_ADI = "kokpit_oturum";
const OTURUM_SURESI_SANIYE = 60 * 60 * 24 * 30; // 30 gun

function gizliAnahtar() {
  const sir = process.env.SESSION_SECRET;
  if (!sir) {
    throw new Error("SESSION_SECRET ortam degiskeni tanimli degil.");
  }
  return new TextEncoder().encode(sir);
}

export type OturumVerisi = {
  kullaniciId: string;
  adSoyad: string;
  eposta: string;
  rol: KullaniciRolu;
};

export async function oturumTokeniOlustur(veri: OturumVerisi): Promise<string> {
  return new SignJWT({ ...veri })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OTURUM_SURESI_SANIYE}s`)
    .sign(gizliAnahtar());
}

export async function oturumTokeniDogrula(
  token: string | undefined,
): Promise<OturumVerisi | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, gizliAnahtar());
    return {
      kullaniciId: payload.kullaniciId as string,
      adSoyad: payload.adSoyad as string,
      eposta: payload.eposta as string,
      rol: payload.rol as KullaniciRolu,
    };
  } catch {
    return null;
  }
}

export const OTURUM_COOKIE_SECENEKLERI = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: OTURUM_SURESI_SANIYE,
};
