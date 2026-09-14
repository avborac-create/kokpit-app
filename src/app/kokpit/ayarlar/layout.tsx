"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SEKMELER = [
  { yol: "/kokpit/ayarlar/secenekler", ad: "Seçenek Listeleri" },
  { yol: "/kokpit/ayarlar/menu", ad: "Menü Düzeni" },
  { yol: "/kokpit/ayarlar/form-duzeni", ad: "Form Düzeni" },
];

export default function AyarlarLayout({ children }: { children: React.ReactNode }) {
  const yol = usePathname();

  return (
    <div className="pt-3">
      <div className="mb-6 flex gap-2 border-b border-white/10">
        {SEKMELER.map((sekme) => (
          <Link
            key={sekme.yol}
            href={sekme.yol}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              yol.startsWith(sekme.yol)
                ? "border-[var(--accent)] text-white"
                : "border-transparent text-white/45 hover:text-white/70"
            }`}
          >
            {sekme.ad}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
