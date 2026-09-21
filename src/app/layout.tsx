import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SwKaydet } from "./sw-kaydet";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KOKPİT | Eces Hukuk Bürosu",
  description: "Eces Hukuk Bürosu operasyon yönetim sistemi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kokpit",
  },
  icons: {
    // iOS Safari, ikonlari agresif sekilde onbelleklediginden, ikon her
    // degistiginde bu surum numarasi da artirilmali (cache-busting).
    //
    // BILEREK src/app/favicon.ico YOK: Next.js bu ozel dosyayi HER ZAMAN
    // sabit /favicon.ico adresinde sunar (bkz. Next.js "favicon, icon,
    // and apple-icon" API referansi) - adres hicbir zaman degismedigi
    // icin sorgu parametresiyle (?v=) onbellek kirmak MUMKUN DEGIL.
    // Tarayicilar favicon.ico'yu normal HTTP onbellek kurallarindan
    // BAGIMSIZ, alisilmadik derecede israrla onbellekte tutar - bu
    // yuzden ikon degisikliklerinden biri sekme ikonunda gorunmedi
    // (gercek bir kullanicidan bildirildi, kok neden buradan bulundu).
    // Kalici cozum: /favicon.ico rotasini hic uretmemek, sadece asagidaki
    // versiyonlanabilir PNG linkine guvenmek.
    icon: [{ url: "/icons/favicon-32.png?v=15", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png?v=15", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#12151d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-svh overflow-hidden antialiased`}
    >
      {/*
        h-dvh (dynamic viewport height) denendiginde bazi iOS Safari
        surumlerinde adres cubugu gizlenip/gosterilirken dvh degeri anlik
        olarak gercek gorunur alandan buyuk hesaplanabiliyor ve bu da
        sayfanin ekran disina tasmasina (taşma) yol aciyordu. h-svh (small
        viewport height), adres cubugu TAMAMEN acikken olan en kucuk
        yuksekligi kullanir; bu deger asla gorunur alani asmayacagi icin
        taşma bir daha olusamaz (bedeli: adres cubugu gizlendiginde altta
        birkac piksellik bos alan kalabilir - bu, taşmadan cok daha iyi).
      */}
      <body className="h-svh flex flex-col overflow-hidden">
        <SwKaydet />
        {children}
      </body>
    </html>
  );
}
