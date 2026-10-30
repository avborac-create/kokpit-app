import Link from "next/link";

export type DosyaSekmesi = "genel" | "evrak" | "gorevler" | "ekonomi";

// Sayfanin ustunde, tarayici sekmesi gibi bir gezinme cubugu; sekmeler
// searchParams (?sekme=) ile calisir. Ara kararlar ve her turlu is "Dosya
// Görevleri" uzerinden takip edilir.
//
// dosyaId verilmezse (ör. Yeni Dosya olusturma ekrani - dosya henuz yok,
// baska bir sekmeye gidilecek bir yer yok) TUM sekmeler tiklanamaz olur.
export function DavaDosyasiSekmeleri({ dosyaId, aktif }: { dosyaId?: string; aktif: DosyaSekmesi }) {
  const sekmeler: { anahtar: DosyaSekmesi; etiket: string }[] = [
    { anahtar: "genel", etiket: "Genel Bilgiler" },
    { anahtar: "evrak", etiket: "Dosya Evrakları" },
    { anahtar: "gorevler", etiket: "Dosya Görevleri" },
    { anahtar: "ekonomi", etiket: "Dosya Ekonomisi" },
  ];

  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-white/[0.08]">
      {sekmeler.map((sekme) => {
        const aktifMi = sekme.anahtar === aktif;
        const siniflar = `-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${
          aktifMi ? "border-[var(--accent)] text-white" : "border-transparent text-white/55 hover:text-white"
        }`;
        if (!dosyaId || aktifMi) {
          return (
            <div key={sekme.anahtar} className={siniflar}>
              {sekme.etiket}
            </div>
          );
        }
        return (
          <Link
            key={sekme.anahtar}
            href={sekme.anahtar === "genel" ? `/kokpit/dava-dosyalari/${dosyaId}` : `/kokpit/dava-dosyalari/${dosyaId}?sekme=${sekme.anahtar}`}
            className={siniflar}
          >
            {sekme.etiket}
          </Link>
        );
      })}
    </div>
  );
}
