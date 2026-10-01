"use client";

import { useState, useTransition } from "react";
import {
  secenekDegeriAktifligiDegistir,
  secenekDegeriEtiketGuncelle,
  secenekDegeriMaktuTutarGuncelle,
  secenekDegeriSiraDegistir,
} from "@/core/secenek/admin-actions";
import { Dugme } from "@/core/ui/button";
import { Girdi } from "@/core/ui/form";

function maktuTutarBicimlendir(tutar: number): string {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(tutar);
}

type Deger = {
  id: string;
  kod: string;
  etiket: string;
  aktifMi: boolean;
  maktuTutar: number | null;
};

export function SecenekDegeriSatiri({
  deger,
  ilkMi,
  sonMu,
}: {
  deger: Deger;
  ilkMi: boolean;
  sonMu: boolean;
}) {
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [etiket, setEtiket] = useState(deger.etiket);
  const [kaydetPending, kaydet] = useTransition();
  const [siraPending, siraDegistir] = useTransition();
  const [aktiflikPending, aktifligiDegistir] = useTransition();

  const [maktuDuzenleniyor, setMaktuDuzenleniyor] = useState(false);
  const [maktuTutar, setMaktuTutar] = useState(deger.maktuTutar?.toString() ?? "");
  const [maktuKaydetPending, maktuKaydet] = useTransition();

  return (
    <tr className={`border-t border-white/[0.06] ${!deger.aktifMi ? "opacity-45" : ""}`}>
      <td className="px-4 py-2.5">
        {duzenleniyor ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("etiket", etiket);
              kaydet(async () => {
                await secenekDegeriEtiketGuncelle(deger.id, fd);
                setDuzenleniyor(false);
              });
            }}
          >
            <Girdi
              value={etiket}
              onChange={(e) => setEtiket(e.target.value)}
              autoFocus
              className="!py-1"
            />
            <Dugme type="submit" disabled={kaydetPending} className="!px-3 !py-1 text-xs">
              Kaydet
            </Dugme>
            <Dugme
              type="button"
              varyant="ikincil"
              className="!px-3 !py-1 text-xs"
              onClick={() => {
                setEtiket(deger.etiket);
                setDuzenleniyor(false);
              }}
            >
              Vazgeç
            </Dugme>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setDuzenleniyor(true)}
            className="text-left text-white/85 hover:text-[#6db8ff] hover:underline"
          >
            {deger.etiket}
          </button>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs text-white/35">{deger.kod}</td>
      <td className="px-4 py-2.5">
        {maktuDuzenleniyor ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("maktuTutar", maktuTutar.trim());
              maktuKaydet(async () => {
                await secenekDegeriMaktuTutarGuncelle(deger.id, fd);
                setMaktuDuzenleniyor(false);
              });
            }}
          >
            <Girdi
              value={maktuTutar}
              onChange={(e) => setMaktuTutar(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="Tanımsız"
              inputMode="decimal"
              autoFocus
              className="!w-28 !py-1"
            />
            <Dugme type="submit" disabled={maktuKaydetPending} className="!px-3 !py-1 text-xs">
              Kaydet
            </Dugme>
            <Dugme
              type="button"
              varyant="ikincil"
              className="!px-3 !py-1 text-xs"
              onClick={() => {
                setMaktuTutar(deger.maktuTutar?.toString() ?? "");
                setMaktuDuzenleniyor(false);
              }}
            >
              Vazgeç
            </Dugme>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setMaktuDuzenleniyor(true)}
            className="text-left text-white/85 hover:text-[#6db8ff] hover:underline"
          >
            {deger.maktuTutar !== null ? `₺${maktuTutarBicimlendir(deger.maktuTutar)}` : (
              <span className="text-white/35">Tanımsız</span>
            )}
          </button>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex gap-1">
          <button
            type="button"
            disabled={ilkMi || siraPending}
            onClick={() => siraDegistir(() => secenekDegeriSiraDegistir(deger.id, "yukari"))}
            className="rounded px-1.5 py-0.5 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-20"
            title="Yukarı taşı"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={sonMu || siraPending}
            onClick={() => siraDegistir(() => secenekDegeriSiraDegistir(deger.id, "asagi"))}
            className="rounded px-1.5 py-0.5 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-20"
            title="Aşağı taşı"
          >
            ↓
          </button>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <Dugme
          type="button"
          varyant={deger.aktifMi ? "ikincil" : "birincil"}
          disabled={aktiflikPending}
          className="!px-3 !py-1 text-xs"
          onClick={() =>
            aktifligiDegistir(() => secenekDegeriAktifligiDegistir(deger.id, !deger.aktifMi))
          }
        >
          {deger.aktifMi ? "Pasife Al" : "Aktif Et"}
        </Dugme>
      </td>
    </tr>
  );
}
