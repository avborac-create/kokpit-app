"use client";

import { useSyncExternalStore } from "react";

const ANAHTAR = "kokpit.masrafPaneli.acik";
const dinleyiciler = new Set<() => void>();
let oturumDegeri: boolean | null = null; // depolama kullanilamazsa oturum boyunca bellekte tutulur

function abone(cb: () => void) {
  dinleyiciler.add(cb);
  return () => {
    dinleyiciler.delete(cb);
  };
}
function oku() {
  if (oturumDegeri !== null) return oturumDegeri;
  try {
    // Masaustunde son tercih hatirlanir; telefonda panel her zaman kapali baslar.
    return window.matchMedia("(min-width: 768px)").matches && localStorage.getItem(ANAHTAR) === "1";
  } catch {
    return false;
  }
}

// Dosya sayfasinin soluna acilip kapanan "Masraf Girisi" paneli. Masaustunde icerigin solunda sabit sutun,
// telefonda alttan acilan sayfa olarak calisir. Acik/kapali tercihi bu tarayicida hatirlanir.
export function MasrafPaneliKabugu({ panel, children }: { panel: React.ReactNode; children: React.ReactNode }) {
  const acik = useSyncExternalStore(abone, oku, () => false);

  function degistir(yeni: boolean) {
    oturumDegeri = yeni;
    try {
      localStorage.setItem(ANAHTAR, yeni ? "1" : "0");
    } catch {}
    dinleyiciler.forEach((cb) => cb());
  }

  return (
    <div className="md:flex md:items-start md:gap-3">
      {acik ? (
        <>
          <button
            type="button"
            aria-label="Paneli kapat"
            onClick={() => degistir(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
          <aside className="glass-strong max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-50 max-md:max-h-[85svh] max-md:overflow-y-auto max-md:rounded-b-none max-md:rounded-t-2xl max-md:pb-[env(safe-area-inset-bottom,0px)] md:sticky md:top-3 md:z-20 md:mt-3 md:max-h-[calc(100svh-8rem)] md:w-80 md:shrink-0 md:overflow-y-auto rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-white">Masraf Girişi</h2>
              <button
                type="button"
                onClick={() => degistir(false)}
                aria-label="Paneli kapat"
                title="Paneli kapat"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            {panel}
          </aside>
        </>
      ) : (
        <button
          type="button"
          onClick={() => degistir(true)}
          title="Masraf girişi panelini aç"
          className="glass-strong max-md:fixed max-md:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] max-md:left-3 max-md:z-30 max-md:rounded-full max-md:px-4 max-md:py-2.5 md:sticky md:top-24 md:z-20 md:mt-24 md:w-8 md:shrink-0 md:rounded-lg md:py-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-[var(--link)] hover:bg-white/10"
        >
          <span className="md:hidden">＋ Masraf Girişi</span>
          <span className="hidden [writing-mode:vertical-rl] md:inline">Masraf Girişi ›</span>
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
