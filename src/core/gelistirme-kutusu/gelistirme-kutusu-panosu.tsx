"use client";

import { useState, useTransition } from "react";
import { gelistirmeTalebiDurumTasi, gelistirmeTalebiSil } from "@/core/gelistirme-kutusu/actions";

export type PanoKarti = {
  id: string;
  metin: string;
  durumKodu: string;
  kullaniciAdi: string;
  olusturmaTarihi: string;
};

type PanoSutunu = { kod: string; etiket: string };

export function GelistirmeKutusuPanosu({
  kartlar,
  sutunlar,
}: {
  kartlar: PanoKarti[];
  sutunlar: PanoSutunu[];
}) {
  const [liste, setListe] = useState(kartlar);
  const [, startTransition] = useTransition();
  const [suruklenenId, setSuruklenenId] = useState<string | null>(null);
  const [uzerindeSutun, setUzerindeSutun] = useState<string | null>(null);

  function kartiTasi(id: string, hedefKod: string) {
    setListe((onceki) =>
      onceki.map((kart) => (kart.id === id ? { ...kart, durumKodu: hedefKod } : kart)),
    );
    startTransition(() => {
      gelistirmeTalebiDurumTasi(id, hedefKod);
    });
  }

  function kartiSil(id: string) {
    if (!window.confirm("Bu kart silinsin mi?")) return;
    setListe((onceki) => onceki.filter((kart) => kart.id !== id));
    startTransition(() => {
      gelistirmeTalebiSil(id);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {sutunlar.map((sutun) => {
        const kartlarBu = liste.filter((k) => k.durumKodu === sutun.kod);
        return (
          <div
            key={sutun.kod}
            onDragOver={(e) => {
              e.preventDefault();
              setUzerindeSutun(sutun.kod);
            }}
            onDragLeave={() => setUzerindeSutun((s) => (s === sutun.kod ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setUzerindeSutun(null);
              setSuruklenenId(null);
              if (id) kartiTasi(id, sutun.kod);
            }}
            className={`glass min-h-[16rem] rounded-2xl p-3 transition-colors ${
              uzerindeSutun === sutun.kod ? "ring-2 ring-[var(--accent)]" : ""
            }`}
          >
            <h2 className="mb-3 flex items-center justify-between text-sm font-medium uppercase tracking-wide text-white/40">
              {sutun.etiket}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                {kartlarBu.length}
              </span>
            </h2>
            <div className="flex flex-col gap-2">
              {kartlarBu.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/30">
                  Kart yok
                </div>
              ) : (
                kartlarBu.map((kart) => (
                  <div
                    key={kart.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", kart.id);
                      setSuruklenenId(kart.id);
                    }}
                    onDragEnd={() => setSuruklenenId(null)}
                    className={`cursor-grab rounded-xl bg-white/5 p-3 active:cursor-grabbing ${
                      suruklenenId === kart.id ? "opacity-40" : ""
                    }`}
                  >
                    <p className="mb-2 whitespace-pre-wrap text-sm text-white/85">{kart.metin}</p>
                    <div className="flex items-center justify-between text-xs text-white/35">
                      <span>
                        {kart.kullaniciAdi} ·{" "}
                        {new Date(kart.olusturmaTarihi).toLocaleDateString("tr-TR")}
                      </span>
                      <button
                        type="button"
                        onClick={() => kartiSil(kart.id)}
                        className="text-white/40 hover:text-red-400"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
