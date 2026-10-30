"use client";

import { useState, useTransition, type ReactNode } from "react";
import { anaSayfaDuzeniKaydet } from "./takvim-actions";

export type PanelTanimi = { kod: string; ad: string };
export type Duzen = { sira: string[]; gizli: string[]; genis: string[] };

// iCloud benzeri ozellestirilebilir ana sayfa: panelleri sirala, gizle, tam genislige al.
export function AnaSayfaDuzeni({
  paneller,
  tanimlar,
  baslangic,
}: {
  paneller: Record<string, ReactNode>;
  tanimlar: PanelTanimi[];
  baslangic: Duzen;
}) {
  const [duzen, setDuzen] = useState<Duzen>(baslangic);
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [, basla] = useTransition();

  const kodlar = tanimlar.map((t) => t.kod);
  const ad = (kod: string) => tanimlar.find((t) => t.kod === kod)?.ad ?? kod;
  const sira = [...duzen.sira.filter((k) => kodlar.includes(k)), ...kodlar.filter((k) => !duzen.sira.includes(k))];
  const gorunen = sira.filter((k) => !duzen.gizli.includes(k));
  const gizlenen = sira.filter((k) => duzen.gizli.includes(k));

  function kaydet(yeni: Duzen | null) {
    setDuzen(yeni ?? { sira: [], gizli: [], genis: [] });
    basla(async () => {
      try {
        await anaSayfaDuzeniKaydet(yeni);
      } catch {
        /* kayit basarisizsa ekrandaki duzen yine de bu oturumda gecerli kalir */
      }
    });
  }

  function tasi(kod: string, yon: -1 | 1) {
    const i = gorunen.indexOf(kod);
    const j = i + yon;
    if (i < 0 || j < 0 || j >= gorunen.length) return;
    const yeniGorunen = [...gorunen];
    [yeniGorunen[i], yeniGorunen[j]] = [yeniGorunen[j], yeniGorunen[i]];
    kaydet({ ...duzen, sira: [...yeniGorunen, ...gizlenen] });
  }

  const dugme = "flex h-7 min-w-7 items-center justify-center rounded-full bg-black/55 px-2 text-xs text-white hover:bg-black/75 disabled:opacity-30";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {duzenleniyor && (
          <button
            type="button"
            onClick={() => kaydet(null)}
            className="rounded-full px-3 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            Varsayılana dön
          </button>
        )}
        <button
          type="button"
          onClick={() => setDuzenleniyor((d) => !d)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            duzenleniyor ? "bg-[var(--accent)] text-white" : "text-[var(--link)] hover:bg-white/10"
          }`}
        >
          {duzenleniyor ? "Bitti" : "Ana sayfayı düzenle"}
        </button>
      </div>

      {duzenleniyor && gizlenen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/20 p-3 text-sm text-white/70">
          <span>Gizlenen paneller:</span>
          {gizlenen.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => kaydet({ ...duzen, gizli: duzen.gizli.filter((x) => x !== k) })}
              className="rounded-full bg-white/10 px-3 py-0.5 text-xs text-white hover:bg-white/20"
            >
              + {ad(k)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {gorunen.map((kod, i) => {
          const genis = duzen.genis.includes(kod);
          return (
            <div key={kod} className={`relative flex min-w-0 flex-col [&>*]:flex-1 ${genis ? "lg:col-span-2" : ""} ${duzenleniyor ? "rounded-3xl ring-2 ring-[var(--accent)]/60" : ""}`}>
              {duzenleniyor && (
                <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
                  <button type="button" className={dugme} disabled={i === 0} onClick={() => tasi(kod, -1)} aria-label="Öne al" title="Öne al">
                    ◀
                  </button>
                  <button type="button" className={dugme} disabled={i === gorunen.length - 1} onClick={() => tasi(kod, 1)} aria-label="Sona al" title="Sona al">
                    ▶
                  </button>
                  <button
                    type="button"
                    className={dugme}
                    onClick={() => kaydet({ ...duzen, genis: genis ? duzen.genis.filter((x) => x !== kod) : [...duzen.genis, kod] })}
                    title={genis ? "Yarım genişlik" : "Tam genişlik"}
                  >
                    {genis ? "▯ Yarım" : "▭ Tam"}
                  </button>
                  <button type="button" className={dugme} onClick={() => kaydet({ ...duzen, gizli: [...duzen.gizli, kod] })} aria-label="Gizle" title="Gizle">
                    ✕
                  </button>
                </div>
              )}
              {paneller[kod]}
            </div>
          );
        })}
      </div>
      {gorunen.length === 0 && <p className="text-sm text-white/50">Tüm paneller gizli. “Ana sayfayı düzenle” ile geri ekleyebilirsiniz.</p>}
    </div>
  );
}
