import type { KullaniciRolu } from "@prisma/client";

// Header'daki "ad soyad + rol rozeti" - kokpit-kabuk-verisi.tsx'teki
// UstBilgiVerisi'nden ayri bir dosyada tutulur ki kokpit-kabuk.tsx'in
// iskelet (fallback) surumu de ayni gorsel yapiyi paylasabilsin.
export function UstBilgiRozeti({
  kullaniciAdSoyad,
  kullaniciRol,
}: {
  kullaniciAdSoyad?: string;
  kullaniciRol?: KullaniciRolu;
}) {
  return (
    <div className="hidden text-sm text-white/75 md:block">
      {kullaniciAdSoyad}
      <span className="ml-2 whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6db8ff]">
        {kullaniciRol}
      </span>
    </div>
  );
}
