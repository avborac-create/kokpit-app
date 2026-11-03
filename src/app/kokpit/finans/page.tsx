import Link from "next/link";

const ALT_MODULLER = [
  {
    anahtar: "kasa", renk: "#f2b04c",
    ad: "Kasa / Nakit Yönetimi",
    aciklama: "Büro kasası: nakit tahsilatlar, personele avans/ödemeler, büro giderleri, kod bazlı takip ve gün sonu sayımı.",
    yol: "/kokpit/finans/kasa",
    aktif: true,
  },
  {
    anahtar: "musteri-iliskileri", renk: "#8b6cf0",
    ad: "Müvekkil Finansal İlişkiler",
    aciklama: "Cari hesap yönetimi, tahsilat/masraf tasnifi ve dosya bazlı bakiye takibi.",
    yol: "/kokpit/finans/musteri-iliskileri",
    aktif: true,
  },
  {
    anahtar: "istenen-paralar", renk: "#f5a524",
    ad: "Müvekkilden İstenen Paralar",
    aciklama: "Müvekkillerden istenen ödemeler: ne zaman istendi, geldi mi, hangi hesaba geldi; para geldi teyidi.",
    yol: "/kokpit/finans/istenen-paralar",
    aktif: true,
  },
  {
    anahtar: "buro-giderleri", renk: "#ef6a5b",
    ad: "Büro Genel Giderleri",
    aciklama: "Kira, personel, sabit giderler gibi büronun kendi masrafları.",
    yol: "/kokpit/finans/buro-giderleri",
    aktif: false,
  },
  { anahtar: "banka", renk: "#4f9cf0", ad: "Banka", aciklama: "Banka hesapları, hareketler ve mutabakat.", yol: "/kokpit/finans/banka", aktif: false },
  { anahtar: "tahsilat-listesi", renk: "#2fb58a", ad: "Tahsilat Listesi", aciklama: "Tüm tahsilatların tek listede takibi ve raporu.", yol: "/kokpit/finans/tahsilat-listesi", aktif: false },
];

export default function FinansSayfasi() {
  return (
    <div className="pt-3">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">Finans / Muhasebe</h1>
      <div className="flex flex-col gap-3">
        {ALT_MODULLER.map((modul) =>
          modul.aktif ? (
            <Link
              key={modul.anahtar}
              href={modul.yol}
              className="glass block rounded-2xl border-l-4 p-5 transition-colors hover:bg-white/[0.06]"
              style={{ borderLeftColor: modul.renk }}
            >
              <p className="font-medium text-white">{modul.ad}</p>
              <p className="mt-1 text-sm text-white/55">{modul.aciklama}</p>
            </Link>
          ) : (
            <div key={modul.anahtar} className="glass rounded-2xl border-l-4 p-5 opacity-50" style={{ borderLeftColor: modul.renk }}>
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">{modul.ad}</p>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/50">
                  Yakında
                </span>
              </div>
              <p className="mt-1 text-sm text-white/40">{modul.aciklama}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
