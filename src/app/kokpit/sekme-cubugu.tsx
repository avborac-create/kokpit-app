"use client";

import { useSekmeler } from "@/core/sekmeler/use-sekmeler";
import { KapatIkonu, EkleIkonu } from "./kenar-cubugu-ikonlari";

// Kokpit'in kuzey kenarinda (Chrome/Notion tarzi) birden fazla sekmede
// calisma serit - bkz. gorev tanimindaki Notion ornegi. Her sekme
// SekmeSaglayici'nin tuttugu bir rotayi temsil eder; tiklamak o rotaya
// gecer, "x" kapatir, "+" yeni (Ana Sayfa'da) bir sekme acar. Sadece
// masaustu genisliginde (md ve ustu) gosterilir - telefonda mevcut
// master-detail gezinme zaten tek panelli oldugundan sekme kavraminin
// bir karsiligi yok.
export function SekmeCubugu() {
  const { sekmeler, aktifId, sekmeyeGec, sekmeKapat, yeniSekmeAc } = useSekmeler();

  return (
    <div
      role="tablist"
      aria-label="Açık sekmeler"
      className="hidden shrink-0 items-center gap-1 overflow-x-auto px-3 pt-2 md:flex"
    >
      {sekmeler.map((sekme) => {
        const aktifMi = sekme.id === aktifId;
        return (
          <div
            key={sekme.id}
            role="tab"
            aria-selected={aktifMi}
            tabIndex={0}
            onClick={() => sekmeyeGec(sekme.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                sekmeyeGec(sekme.id);
              }
            }}
            title={sekme.baslik}
            className={`group flex h-9 max-w-[200px] min-w-[120px] shrink-0 cursor-pointer items-center gap-2 rounded-t-xl border-b-2 px-3.5 text-[13px] outline-none transition-colors ${
              aktifMi
                ? "glass border-[var(--accent)] text-white"
                : "border-transparent text-white/50 hover:bg-white/[0.05] hover:text-white/80"
            }`}
          >
            <span className="flex-1 truncate">{sekme.baslik}</span>
            {sekmeler.length > 1 && (
              <button
                type="button"
                aria-label={`${sekme.baslik} sekmesini kapat`}
                onClick={(e) => {
                  e.stopPropagation();
                  sekmeKapat(sekme.id);
                }}
                className={`shrink-0 rounded-full p-0.5 text-white/40 outline-none transition-opacity hover:bg-white/15 hover:text-white focus-visible:opacity-100 ${
                  aktifMi ? "" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <KapatIkonu className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={yeniSekmeAc}
        aria-label="Yeni sekme aç"
        className="ml-1 shrink-0 rounded-full p-1.5 text-white/40 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <EkleIkonu className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
