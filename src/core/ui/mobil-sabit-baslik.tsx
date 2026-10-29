"use client";

import { useEffect, useState } from "react";

// Telefonda KunyeSeridi uzun oldugu icin sabit degildir (ekrani yer). Seridin
// kendisi ekrandan ciktiginda yerine tek satirlik ince bir baslik belirir ve
// ustte sabit kalir. md ve ustunde hic gorunmez (orada serit zaten sabit).
export function MobilSabitBaslik({ hedefId, children }: { hedefId: string; children: React.ReactNode }) {
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    const hedef = document.getElementById(hedefId);
    if (!hedef) return;
    const gozlemci = new IntersectionObserver(([giris]) => setGorunur(!giris.isIntersecting));
    gozlemci.observe(hedef);
    return () => gozlemci.disconnect();
  }, [hedefId]);

  return (
    <div className="sticky top-0 z-20 h-0 md:hidden">
      {gorunur && (
        <div className="absolute inset-x-[-0.75rem] top-0 truncate border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--background-2)_92%,transparent)] px-3 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-14px_rgba(0,0,0,0.6)] backdrop-blur-md">
          {children}
        </div>
      )}
    </div>
  );
}
