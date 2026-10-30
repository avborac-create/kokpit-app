import Link from "next/link";
import type { ReactNode } from "react";

// Dosyalar listesindeki "dosyayi ac" dugmesi stilleri (kisiye ozel secilir).
// Dugme satirin en sagindaki sabit sutunda durur. "dugmesiz": dugme yok, dosya Kokpit No
// baglantisina dokunarak / satira cift tiklayarak acilir.
export const ACMA_STILLERI = [
  { kod: "dugmesiz", ad: "Düğmesiz", not: "KN numarasına dokununca açılır", genislik: 0 },
  { kod: "apple", ad: "Apple", not: "İnce ok, çerçevesiz", genislik: 30 },
  { kod: "microsoft", ad: "Microsoft", not: "Köşeli, ince çerçeve", genislik: 34 },
  { kod: "google", ad: "Google", not: "Tonlu mavi hap", genislik: 50 },
  { kod: "samsung", ad: "Samsung", not: "Yumuşak daire", genislik: 34 },
  { kod: "mercedes", ad: "Mercedes", not: "Gümüş ince halka", genislik: 32 },
  { kod: "bmw", ad: "BMW", not: "Keskin köşe, mavi şerit", genislik: 36 },
  { kod: "audi", ad: "Audi / VW", not: "İnce uzun ok", genislik: 38 },
  { kod: "metin", ad: "Yalnız metin", not: "“Aç” bağlantısı", genislik: 38 },
] as const;

export type AcmaStili = (typeof ACMA_STILLERI)[number]["kod"];
export const VARSAYILAN_ACMA_STILI: AcmaStili = "bmw";

export function acmaStiliGecerliMi(x: unknown): x is AcmaStili {
  return ACMA_STILLERI.some((s) => s.kod === x);
}

function Simge({ d, boyut, kalinlik = 2 }: { d: string; boyut: number; kalinlik?: number }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={kalinlik} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const OK = "M9 5l7 7-7 7";
const DIS = "M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4";
const SAG = "M5 12h14M13 6l6 6-6 6";
const CAPRAZ = "M7 17L17 7M8 7h9v9";
const UZUN = "M3 12h18M16 7l5 5-5 5";

const BICIM: Record<Exclude<AcmaStili, "dugmesiz">, { sinif: string; icerik: ReactNode }> = {
  apple: { sinif: "h-[30px] w-[30px] text-[#6db8ff]", icerik: <Simge d={OK} boyut={20} kalinlik={2.4} /> },
  microsoft: { sinif: "h-8 w-[34px] rounded-[4px] border-[1.5px] border-[#5b6b85] text-[#cfd9ea]", icerik: <Simge d={DIS} boyut={16} kalinlik={1.8} /> },
  google: { sinif: "h-8 w-[50px] rounded-full bg-[#2d3f63] text-[#c6d7ff]", icerik: <Simge d={SAG} boyut={19} kalinlik={2.2} /> },
  samsung: { sinif: "h-[34px] w-[34px] rounded-full bg-[#2a3446] text-[#d6dff0]", icerik: <Simge d={OK} boyut={17} kalinlik={2.4} /> },
  mercedes: { sinif: "h-8 w-8 rounded-full border border-[#c3ccd9] text-[#e6ebf2]", icerik: <Simge d={CAPRAZ} boyut={16} kalinlik={1.6} /> },
  bmw: { sinif: "h-8 w-9 border-l-4 border-[#1c69d4] bg-[#26304a] text-[#e6ebf2]", icerik: <Simge d={OK} boyut={16} kalinlik={2.4} /> },
  audi: { sinif: "h-8 w-[38px] text-[#e6ebf2]", icerik: <Simge d={UZUN} boyut={26} kalinlik={1.5} /> },
  metin: { sinif: "h-8 w-[38px] text-[15px] font-semibold text-[#6db8ff]", icerik: "Aç" },
};

// href verilirse baglanti, verilmezse (menudeki onizleme) duz gorunum.
export function AcmaDugmesi({ stil, href }: { stil: AcmaStili; href?: string }) {
  if (stil === "dugmesiz") return null;
  const b = BICIM[stil];
  const sinif = `inline-flex shrink-0 items-center justify-center ${b.sinif}`;
  if (!href) return <span className={sinif}>{b.icerik}</span>;
  return (
    <Link href={href} title="Dosyayı aç" aria-label="Dosyayı aç" className={`${sinif} hover:brightness-125`}>
      {b.icerik}
    </Link>
  );
}
