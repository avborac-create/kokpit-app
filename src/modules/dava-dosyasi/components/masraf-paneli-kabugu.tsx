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

function degistir(yeni: boolean) {
  oturumDegeri = yeni;
  try {
    localStorage.setItem(ANAHTAR, yeni ? "1" : "0");
  } catch {}
  dinleyiciler.forEach((cb) => cb());
}

// Sekme cubugunda (Dosya Ekonomisi'nin yaninda) duran, paneli acip kapatan dugme (yalniz masaustu).
export function MasrafPaneliDugmesi() {
  const acik = useSyncExternalStore(abone, oku, () => false);
  return (
    <button
      type="button"
      onClick={() => degistir(!acik)}
      aria-pressed={acik}
      title={acik ? "Masraf girişi panelini kapat" : "Masraf girişi panelini aç"}
      className={`hidden shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium md:inline-flex ${
        acik ? "border-[var(--link)] bg-white/10 text-white" : "border-white/15 text-[var(--link)] hover:bg-white/10"
      }`}
    >
      <span aria-hidden>＋</span> Masraf Girişi
    </button>
  );
}

// Dosya sayfasinin soluna acilip kapanan "Masraf Girisi" paneli. Masaustunde icerigin solunda sabit sutun,
// telefonda alttan acilan sayfa olarak calisir. Acik/kapali tercihi bu tarayicida hatirlanir.
export function MasrafPaneliKabugu({ panel, children }: { panel: React.ReactNode; children: React.ReactNode }) {
  const acik = useSyncExternalStore(abone, oku, () => false);

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
          className="glass-strong fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-3 z-30 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium text-[var(--link)] hover:bg-white/10 md:hidden"
        >
          ＋ Masraf Girişi
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
