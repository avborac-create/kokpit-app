import Link from "next/link";
import { ISLEM_TURU_ETIKETLERI, PARA_AMACI_ETIKETLERI } from "@/modules/muvekkil-finans/lib/sabitler";
import type { MusteriFinansIslemTuru, MusteriFinansParaAmaci } from "@prisma/client";

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

type KarsiTarafAlacagi = {
  id: string;
  tutar: number;
  aciklama: string;
  tahsilEdildiMi: boolean;
};

type FinansHareketi = {
  id: string;
  islemTuru: MusteriFinansIslemTuru;
  paraAmaci: MusteriFinansParaAmaci;
  tutar: number;
  tarih: Date;
  musteriId: string;
};

// Dava detay ekraninin 3. blogu: teminat iadesi, harc iadesi, vekalet
// ucreti tahsili gibi "artci isler" - bkz. ARCHITECTURE.md "Artci Isler -
// Konumlandirma". YENI bir model DEGIL, mevcut KarsiTarafAlacagi ve
// MusteriFinansHareketi kayitlarinin bu dosyaya ait olanlarinin
// birlesik, salt-okunur ozeti. Duzenleme/ekleme icin ilgili mevcut
// ekranlara (Karsi Taraf Alacaklari / Musteri Finans) yonlendirilir.
export function ArtciIslerBlok({
  karsiTarafAlacaklari,
  finansHareketleri,
}: {
  karsiTarafAlacaklari: KarsiTarafAlacagi[];
  finansHareketleri: FinansHareketi[];
}) {
  if (karsiTarafAlacaklari.length === 0 && finansHareketleri.length === 0) {
    return null;
  }

  return (
    <div className="glass rounded-2xl p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-white/40">Artçı İşler</p>
      <div className="flex flex-col gap-2">
        {karsiTarafAlacaklari.map((alacak) => (
          <div key={alacak.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-white/70">{alacak.aciklama}</span>
            <span className="flex items-center gap-2">
              <span className="text-white/85">{paraFormatlayici.format(alacak.tutar)}</span>
              <span
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${
                  alacak.tahsilEdildiMi ? "bg-[#30d158]/15 text-[#30d158]" : "bg-white/[0.06] text-white/50"
                }`}
              >
                {alacak.tahsilEdildiMi ? "Tahsil Edildi" : "Tahsil Edilmedi"}
              </span>
            </span>
          </div>
        ))}
        {finansHareketleri.map((hareket) => (
          <div key={hareket.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-white/70">
              {ISLEM_TURU_ETIKETLERI[hareket.islemTuru]} — {PARA_AMACI_ETIKETLERI[hareket.paraAmaci]}
              <span className="ml-2 text-xs text-white/35">{tarihFormatlayici.format(hareket.tarih)}</span>
            </span>
            <span className="text-white/85">{paraFormatlayici.format(hareket.tutar)}</span>
          </div>
        ))}
      </div>
      {finansHareketleri[0] && (
        <Link
          href={`/kokpit/muvekkil-finans?musteriId=${finansHareketleri[0].musteriId}`}
          className="mt-3 inline-block text-xs text-[#6db8ff] hover:underline"
        >
          Müvekkil Finans&apos;ta görüntüle →
        </Link>
      )}
    </div>
  );
}
