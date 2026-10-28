import type { BuroRolu, KullaniciRolu } from "@prisma/client";
import {
  BURO_ROLU_ETIKETLERI,
  UYGULAMA_ROLU_ETIKETLERI,
  uygulamaRoluOf,
} from "@/core/kullanici/rol-etiketleri";

// Header'daki "ad soyad + rol rozeti" - kokpit-kabuk-verisi.tsx'teki
// UstBilgiVerisi'nden ayri bir dosyada tutulur ki kokpit-kabuk.tsx'in
// iskelet (fallback) surumu de ayni gorsel yapiyi paylasabilsin.
export function UstBilgiRozeti({
  kullaniciAdSoyad,
  kullaniciRol,
  buroRolu,
}: {
  kullaniciAdSoyad?: string;
  kullaniciRol?: KullaniciRolu;
  buroRolu?: BuroRolu;
}) {
  return (
    <div className="hidden text-sm text-white/75 md:block">
      {kullaniciAdSoyad}
      <span className="ml-2 whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6db8ff]">
        {kullaniciRol ? UYGULAMA_ROLU_ETIKETLERI[uygulamaRoluOf(kullaniciRol)] : ""}
        {buroRolu ? ` · ${BURO_ROLU_ETIKETLERI[buroRolu]}` : ""}
      </span>
    </div>
  );
}
