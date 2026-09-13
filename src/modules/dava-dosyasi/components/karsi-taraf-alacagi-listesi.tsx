"use client";

import { useTransition } from "react";
import {
  karsiTarafAlacagiSil,
  karsiTarafAlacagiTahsilDurumuDegistir,
} from "@/modules/dava-dosyasi/lib/actions";
import { Dugme } from "@/core/ui/button";

type Alacak = {
  id: string;
  tutar: number;
  aciklama: string;
  tahsilEdildiMi: boolean;
  tahsilTarihi: Date | null;
  olusturmaTarihi: Date;
};

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

export function KarsiTarafAlacagiListesi({
  alacaklar,
  dosyaId,
  silmeYetkisiVar,
}: {
  alacaklar: Alacak[];
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  if (alacaklar.length === 0) {
    return <p className="text-sm text-white/40">Bu dosyada karşı taraftan beklenen bir alacak yok.</p>;
  }

  const toplam = alacaklar.reduce((t, a) => t + a.tutar, 0);
  const tahsilEdilen = alacaklar.filter((a) => a.tahsilEdildiMi).reduce((t, a) => t + a.tutar, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/70">
          Toplam: {paraFormatlayici.format(toplam)}
        </span>
        <span className="whitespace-nowrap rounded-full bg-[#30d158]/15 px-3 py-1 text-xs text-[#30d158]">
          Tahsil Edilen: {paraFormatlayici.format(tahsilEdilen)}
        </span>
        <span className="whitespace-nowrap rounded-full bg-[#ff7a70]/15 px-3 py-1 text-xs text-[#ff7a70]">
          Bekleyen: {paraFormatlayici.format(toplam - tahsilEdilen)}
        </span>
      </div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium">Tutar</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {alacaklar.map((alacak) => (
              <AlacakSatiri
                key={alacak.id}
                alacak={alacak}
                dosyaId={dosyaId}
                silmeYetkisiVar={silmeYetkisiVar}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlacakSatiri({
  alacak,
  dosyaId,
  silmeYetkisiVar,
}: {
  alacak: Alacak;
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  const [durumPending, durumDegistir] = useTransition();
  const [silmePending, sil] = useTransition();

  return (
    <tr className="border-t border-white/[0.06]">
      <td className="px-4 py-3 text-white/85">{alacak.aciklama}</td>
      <td className="px-4 py-3 font-medium text-white">{paraFormatlayici.format(alacak.tutar)}</td>
      <td className="px-4 py-3">
        {alacak.tahsilEdildiMi ? (
          <span className="whitespace-nowrap rounded-full bg-[#30d158]/15 px-2.5 py-0.5 text-xs text-[#30d158]">
            Tahsil Edildi{alacak.tahsilTarihi ? ` (${tarihFormatlayici.format(alacak.tahsilTarihi)})` : ""}
          </span>
        ) : (
          <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/60">
            Beklemede
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Dugme
            type="button"
            varyant="ikincil"
            disabled={durumPending}
            onClick={() =>
              durumDegistir(() =>
                karsiTarafAlacagiTahsilDurumuDegistir(alacak.id, dosyaId, !alacak.tahsilEdildiMi),
              )
            }
          >
            {alacak.tahsilEdildiMi ? "Beklemede Yap" : "Tahsil Edildi İşaretle"}
          </Dugme>
          {silmeYetkisiVar && (
            <Dugme
              type="button"
              varyant="tehlike"
              disabled={silmePending}
              onClick={() => {
                if (window.confirm("Bu alacak kaydı silinsin mi?")) {
                  sil(() => karsiTarafAlacagiSil(alacak.id, dosyaId));
                }
              }}
            >
              Sil
            </Dugme>
          )}
        </div>
      </td>
    </tr>
  );
}
