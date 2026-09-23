"use client";

import { useTransition } from "react";
import type { davaDosyasiGetir } from "@/modules/dava-dosyasi/lib/queries";
import { adliBirimHareketiSil } from "@/modules/dava-dosyasi/lib/actions";
import { Dugme } from "@/core/ui/button";

type DosyaDetay = NonNullable<Awaited<ReturnType<typeof davaDosyasiGetir>>>;
// Prisma'nin Decimal tipi Server->Client Component sinirini gecemez;
// bu yuzden tutar burada duz number olarak kabul edilir (bkz. ayni
// desen: masraf-listesi.tsx).
type Hareket = Omit<DosyaDetay["adliBirimHareketleri"][number], "tutar"> & { tutar: number };

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

// Klasik cari hesap mantigi: Odeme (buro -> adli birim) borc hanesine,
// Tahsilat (adli birim -> buro) alacak hanesine yazilir. Bakiye = toplam
// Borc - toplam Alacak; pozitifse buro net avans vermis/alacaklidir.
export function AdliBirimHareketListesi({ hareketler, dosyaId }: { hareketler: Hareket[]; dosyaId: string }) {
  if (hareketler.length === 0) {
    return <p className="text-sm text-white/40">Bu dosyada adli birimle işlenmiş bir hareket yok.</p>;
  }

  const toplamBorc = hareketler.filter((h) => h.yon === "ODEME").reduce((t, h) => t + Number(h.tutar), 0);
  const toplamAlacak = hareketler.filter((h) => h.yon === "TAHSILAT").reduce((t, h) => t + Number(h.tutar), 0);
  const bakiye = toplamBorc - toplamAlacak;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/70">
          Borç (Ödeme): {paraFormatlayici.format(toplamBorc)}
        </span>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/70">
          Alacak (Tahsilat): {paraFormatlayici.format(toplamAlacak)}
        </span>
        <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[#6db8ff]">
          Bakiye: {paraFormatlayici.format(bakiye)}
        </span>
      </div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">Yön</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium">Tutar</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {hareketler.map((hareket) => (
              <HareketSatiri key={hareket.id} hareket={hareket} dosyaId={dosyaId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HareketSatiri({ hareket, dosyaId }: { hareket: Hareket; dosyaId: string }) {
  const [silmePending, sil] = useTransition();
  const odemeMi = hareket.yon === "ODEME";

  return (
    <tr className="border-t border-white/[0.06]">
      <td className="px-4 py-3 text-white/60">{tarihFormatlayici.format(hareket.tarih)}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${
            odemeMi ? "bg-white/[0.06] text-white/70" : "bg-[var(--accent-soft)] text-[#6db8ff]"
          }`}
        >
          {odemeMi ? "Ödeme (Borç)" : "Tahsilat (Alacak)"}
        </span>
      </td>
      <td className="px-4 py-3 text-white/85">{hareket.aciklama}</td>
      <td className="px-4 py-3 font-medium text-white">{paraFormatlayici.format(Number(hareket.tutar))}</td>
      <td className="px-4 py-3">
        <Dugme
          type="button"
          varyant="tehlike"
          disabled={silmePending}
          onClick={() => {
            if (window.confirm("Bu hareket silinsin mi?")) {
              sil(() => adliBirimHareketiSil(hareket.id, dosyaId));
            }
          }}
        >
          Sil
        </Dugme>
      </td>
    </tr>
  );
}
