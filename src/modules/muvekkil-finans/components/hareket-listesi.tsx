import type { musteriFinansHareketleriniListele } from "@/modules/muvekkil-finans/lib/queries";
import {
  MUVEKKIL_FINANS_ISLEM_TURLERI,
  MUVEKKIL_FINANS_PARA_AMACLARI,
} from "@/modules/muvekkil-finans/lib/sabitler";

// Prisma'nin Decimal tipi Server->Client Component sinirini gecemez, bu
// yuzden tutar burada duz number olarak kabul edilir (page.tsx'te
// Number(...) ile donusturulup gecirilir - bkz. ayni desen MasrafListesi'nde).
type Hareket = Omit<
  Awaited<ReturnType<typeof musteriFinansHareketleriniListele>>[number],
  "tutar"
> & { tutar: number };

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

const ISLEM_TURU_ETIKET_HARITASI = new Map(MUVEKKIL_FINANS_ISLEM_TURLERI.map((s) => [s.deger, s.etiket]));
const PARA_AMACI_ETIKET_HARITASI = new Map(MUVEKKIL_FINANS_PARA_AMACLARI.map((s) => [s.deger, s.etiket]));

export function HareketListesi({ hareketler }: { hareketler: Hareket[] }) {
  if (hareketler.length === 0) {
    return <p className="text-sm text-white/40">Bu müvekkil için henüz finans hareketi kaydı yok.</p>;
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Tarih</th>
            <th className="px-4 py-3 font-medium">İşlem Türü</th>
            <th className="px-4 py-3 font-medium">Para Amacı</th>
            <th className="px-4 py-3 font-medium">Dosya</th>
            <th className="px-4 py-3 font-medium">Açıklama</th>
            <th className="px-4 py-3 font-medium">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {hareketler.map((hareket) => (
            <tr key={hareket.id} className="border-t border-white/[0.06]">
              <td className="whitespace-nowrap px-4 py-3 text-white/60">
                {tarihFormatlayici.format(hareket.tarih)}
              </td>
              <td className="px-4 py-3">
                <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                  {ISLEM_TURU_ETIKET_HARITASI.get(hareket.islemTuru) ?? hareket.islemTuru}
                </span>
              </td>
              <td className="px-4 py-3 text-white/70">
                {PARA_AMACI_ETIKET_HARITASI.get(hareket.paraAmaci) ?? hareket.paraAmaci}
              </td>
              <td className="px-4 py-3 text-white/70">{hareket.davaDosyasi?.konu ?? "—"}</td>
              <td className="px-4 py-3 text-white/60">{hareket.aciklama ?? "—"}</td>
              <td className="px-4 py-3 font-medium text-white/85">
                {paraFormatlayici.format(hareket.tutar)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
