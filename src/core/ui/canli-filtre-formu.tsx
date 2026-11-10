"use client";

import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Genel kural: arama/filtre kutulari yazdikca (kisa gecikmeyle) canli filtreler
 * ve filtre aktifken liste filtreli oldugu gozden kacmaz (vurgulu kutu +
 * "Liste filtreli" rozeti + temizle dugmesi). Alanlar sunucu bilesenlerinde
 * `name` + `defaultValue` ile tanimlanir; bu sarmalayici degisiklikleri URL
 * parametrelerine yazar.
 */
export function CanliFiltreFormu({ children, className = "" }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const mevcut = useSearchParams();
  const [bekliyor, baslat] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
  }, []);

  const uygula = () => {
    const form = formRef.current;
    if (!form) return;
    const q = new URLSearchParams();
    for (const [anahtar, deger] of new FormData(form).entries()) {
      if (typeof deger === "string" && deger.trim() !== "") q.append(anahtar, deger.trim());
    }
    const qs = q.toString();
    baslat(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const aktif = Array.from(mevcut.entries()).some(([anahtar, deger]) => anahtar !== "vurgu" && deger !== "");

  const temizle = () => {
    const form = formRef.current;
    if (form) {
      for (const el of Array.from(form.elements)) {
        if (el instanceof HTMLInputElement) {
          if (el.type === "checkbox" || el.type === "radio") el.checked = false;
          else el.value = "";
        } else if (el instanceof HTMLSelectElement) el.selectedIndex = 0;
      }
    }
    baslat(() => router.replace(pathname, { scroll: false }));
  };

  return (
    <form
      ref={formRef}
      className={`mb-6 flex flex-wrap items-center gap-3 [&_input[type=search]:not(:placeholder-shown)]:!border-[var(--accent)] [&_input[type=search]:not(:placeholder-shown)]:ring-2 [&_input[type=search]:not(:placeholder-shown)]:ring-[var(--accent)]/40 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (zamanlayici.current) clearTimeout(zamanlayici.current);
        uygula();
      }}
      onInput={() => {
        if (zamanlayici.current) clearTimeout(zamanlayici.current);
        zamanlayici.current = setTimeout(uygula, 250);
      }}
    >
      {children}
      {aktif && (
        <div className="flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-white">
          <span>{bekliyor ? "Filtreleniyor…" : "⚠ Liste filtreli"}</span>
          <button type="button" onClick={temizle} className="rounded-full bg-white/15 px-2 py-0.5 hover:bg-white/30">
            Filtreyi temizle ✕
          </button>
        </div>
      )}
    </form>
  );
}
