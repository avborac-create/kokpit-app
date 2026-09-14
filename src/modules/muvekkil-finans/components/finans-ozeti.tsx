import type { musteriFinansOzetiHesapla } from "@/modules/muvekkil-finans/lib/queries";

type Ozet = Awaited<ReturnType<typeof musteriFinansOzetiHesapla>>;

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// 5 soruya dogrudan cevap veren 5 kutu - bkz. ARCHITECTURE.md "Muvekkil
// Finans V1". Hesap mantigi queries.ts'de tek yerde (musteriFinansOzetiHesapla).
export function FinansOzeti({ ozet }: { ozet: Ozet }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-white/45">Alınan Toplam</p>
        <p className="mt-1 text-lg font-semibold text-white">
          {paraFormatlayici.format(ozet.alinanToplam)}
        </p>
      </div>
      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-white/45">Gerçekleşen Masraf</p>
        <p className="mt-1 text-lg font-semibold text-white">
          {paraFormatlayici.format(ozet.gerceklesenMasraf)}
        </p>
      </div>
      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-white/45">Dış Kurumda</p>
        <p className="mt-1 text-lg font-semibold text-white">
          {paraFormatlayici.format(ozet.disKurumda)}
        </p>
      </div>
      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-white/45">Müvekkile İade</p>
        <p className="mt-1 text-lg font-semibold text-white">
          {paraFormatlayici.format(ozet.musteriyeIade)}
        </p>
      </div>
      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-white/45">Bizde Kalan</p>
        <p
          className={`mt-1 text-lg font-semibold ${
            ozet.bizdeKalan > 0
              ? "text-[#32d74b]"
              : ozet.bizdeKalan < 0
                ? "text-[#ff7a70]"
                : "text-white/60"
          }`}
        >
          {paraFormatlayici.format(ozet.bizdeKalan)}
        </p>
      </div>
    </div>
  );
}
