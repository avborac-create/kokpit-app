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
    title: "KOKPİT",
  },
  icons: {
    // iOS Safari, ikonlari agresif sekilde onbelleklediginden, ikon her
    // degistiginde bu surum numarasi da artirilmali (cache-busting).
    icon: [{ url: "/icons/favicon-32.png?v=5", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png?v=5", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}
    >
      {/*
        iOS Safari'de adres cubugu goruntulenip/gizlendikce viewport
        yuksekligi degisir. h-full/min-h-full (yuzde bazli) bu degisiklikle
        uyumsuz kalip sayfanin gorunmez sekilde ekrandan taşmasina (kucuk
        bir kaydirmaya) yol aciyordu. h-dvh (dynamic viewport height) +
        overflow-hidden ile govde HER ZAMAN tam olarak gorunen ekran kadar
        olur; ic kaydirma sadece <main> icinde (overflow-y-auto) gerceklesir.
      */}
      <body className="h-dvh flex flex-col overflow-hidden">
        <SwKaydet />
        {children}
      </body>
    </html>
  );
}
