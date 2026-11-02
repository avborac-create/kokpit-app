"use client";

import { usePathname, useRouter } from "next/navigation";

// Her sayfada ust cubukta "Geri": tarayici gecmisinde bir onceki sayfaya doner (ana ekrana eklenmis
// uygulamada tarayicinin geri dugmesi olmadigi icin gerekli). Gecmis yoksa Ana Sayfa'ya gider.
export function GeriButonu() {
  const yonlendirici = useRouter();
  const pathname = usePathname();
  if (pathname === "/kokpit") return null;

  function geri() {
    if (window.history.length > 1) yonlendirici.back();
    else yonlendirici.push("/kokpit");
  }

  return (
    <button
      type="button"
      onClick={geri}
      aria-label="Geri"
      title="Geri"
      className="glass inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/90 outline-none transition-colors hover:bg-white/10 active:opacity-60 md:h-9 md:w-9"
    >
      <svg viewBox="0 0 12 20" className="h-[16px] w-[10px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 2 2 10l8 8" />
      </svg>
    </button>
  );
}
