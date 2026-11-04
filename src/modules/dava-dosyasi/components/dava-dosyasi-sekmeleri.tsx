import Link from "next/link";

export type DosyaSekmesi = "genel" | "evrak" | "gorevler" | "ekonomi";

// Sayfanin ustunde sekme cubugu (BMW stili: keskin bloklar, aktif sekme dolgulu ve altinda kirmizi serit);
// sekmeler searchParams (?sekme=) ile calisir. Dort kisa baslik tek satira sigar, yana kayma olmaz.
// scroll={false}: sekme degisince sayfa basa atlamaz, bulundugunuz yerde kalir.
// Ara kararlar ve her turlu is "Dosya Görevleri" uzerinden takip edilir.
//
// dosyaId verilmezse (ör. Yeni Dosya olusturma ekrani - dosya henuz yok,
// baska bir sekmeye gidilecek bir yer yok) TUM sekmeler tiklanamaz olur.
// Sekme cubugu sayfa kaydirilinca da ustte sabit kalir (md ve uzeri); solunda hangi dosyada olundugu kisaca yazar.
export function DavaDosyasiSekmeleri({ dosyaId, aktif, kimlik }: { dosyaId?: string; aktif: DosyaSekmesi; kimlik?: string }) {
  const sekmeler: { anahtar: DosyaSekmesi; etiket: string }[] = [
    { anahtar: "genel", etiket: "Genel" },
    { anahtar: "evrak", etiket: "Evraklar" },
    { anahtar: "gorevler", etiket: "Görevler" },
    { anahtar: "ekonomi", etiket: "Dosya Ekonomisi" },
  ];

  return (
    <div className="sticky top-0 z-30 -mx-3 mb-4 flex items-center gap-4 border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--background-2)_95%,transparent)] px-3 py-1.5 backdrop-blur-md md:-mx-6 md:px-6">
      {kimlik && <span className="hidden min-w-0 max-w-[40%] shrink truncate text-sm font-semibold text-white/80 lg:block">{kimlik}</span>}
    <div className="flex w-full max-w-2xl gap-0.5" role="tablist" aria-label="Dosya bölümleri">
      {sekmeler.map((sekme) => {
        const aktifMi = sekme.anahtar === aktif;
        const siniflar = `min-w-0 flex-1 truncate border-b-[3px] px-1 py-1.5 text-center text-xs font-bold uppercase tracking-wide sm:text-sm ${
          aktifMi
            ? "border-[#e7222e] bg-[var(--accent)] text-white"
            : "border-transparent bg-white/[0.07] text-white/70 hover:bg-white/[0.12] hover:text-white"
        }`;
        if (!dosyaId || aktifMi) {
          return (
            <div key={sekme.anahtar} role="tab" aria-selected={aktifMi} className={siniflar}>
              {sekme.etiket}
            </div>
          );
        }
        return (
          <Link
            key={sekme.anahtar}
            role="tab"
            aria-selected={false}
            scroll={false}
            href={sekme.anahtar === "genel" ? `/kokpit/dava-dosyalari/${dosyaId}` : `/kokpit/dava-dosyalari/${dosyaId}?sekme=${sekme.anahtar}`}
            className={siniflar}
          >
            {sekme.etiket}
          </Link>
        );
      })}
    </div>
    </div>
  );
}
