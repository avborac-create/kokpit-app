import Link from "next/link";

// Sayfanin ustunde, tarayici sekmesi gibi bir gezinme cubugu. Genel
// Bilgiler ve Dosya Ekonomisi gercek (searchParams ile) sekmelerdir; Ara
// Kararlar henuz icerigi olmadigi icin yer tutucu/tiklanamaz kalir.
//
// dosyaId verilmezse (ör. Yeni Dosya olusturma ekrani - dosya henuz yok,
// baska bir sekmeye gidilecek bir yer yok) TUM sekmeler tiklanamaz olur.
export function DavaDosyasiSekmeleri({
  dosyaId,
  aktif,
}: {
  dosyaId?: string;
  aktif: "genel" | "ekonomi";
}) {
  const sekmeler: { anahtar: "genel" | "ekonomi" | "ara-kararlar"; etiket: string; hazirMi: boolean }[] = [
    { anahtar: "genel", etiket: "Genel Bilgiler", hazirMi: true },
    { anahtar: "ara-kararlar", etiket: "Ara Kararlar", hazirMi: false },
    { anahtar: "ekonomi", etiket: "Dosya Ekonomisi", hazirMi: true },
  ];

  return (
    <div className="mb-6 flex gap-1 border-b border-white/[0.08]">
      {sekmeler.map((sekme) => {
        const aktifMi = sekme.anahtar === aktif;
        const siniflar = `-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
          aktifMi
            ? "border-[var(--accent)] text-white"
            : sekme.hazirMi
              ? "border-transparent text-white/55 hover:text-white"
              : "cursor-not-allowed border-transparent text-white/25"
        }`;

        if (!sekme.hazirMi || !dosyaId || aktifMi) {
          return (
            <div key={sekme.anahtar} className={siniflar} title={sekme.hazirMi ? undefined : "Yakında"}>
              {sekme.etiket}
            </div>
          );
        }
        return (
          <Link
            key={sekme.anahtar}
            href={sekme.anahtar === "genel" ? `/kokpit/dava-dosyalari/${dosyaId}` : `/kokpit/dava-dosyalari/${dosyaId}?sekme=ekonomi`}
            className={siniflar}
          >
            {sekme.etiket}
          </Link>
        );
      })}
    </div>
  );
}
