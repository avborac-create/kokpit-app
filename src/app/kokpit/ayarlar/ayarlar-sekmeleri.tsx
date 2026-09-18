"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KullaniciRolu } from "@prisma/client";

const SEKMELER = [
  { yol: "/kokpit/ayarlar/secenekler", ad: "Seçenek Listeleri" },
  { yol: "/kokpit/ayarlar/menu", ad: "Menü Düzeni" },
  { yol: "/kokpit/ayarlar/form-duzeni", ad: "Form Düzeni" },
];

// Geliştirme Kutusu, normal kullanıcının sol menüsünden kaldırıldı (bkz.
// ARCHITECTURE.md) - artık yalnızca sistem yöneticisi (YONETICI) rolüne
// Ayarlar sekmelerinden görünür. Sayfanın kendisi (gelistirme-kutusu/
// page.tsx) hâlâ /kokpit/gelistirme-kutusu adresinde durur ve kendi rota
// seviyesindeki yetki kontrolünü ayrıca yapar - bu sekme sadece bir
// kısayoldur, yetkisiz erişimi TEK BAŞINA engellemez.
export function AyarlarSekmeleri({
  kullaniciRol,
  children,
}: {
  kullaniciRol?: KullaniciRolu;
  children: React.ReactNode;
}) {
  const yol = usePathname();
  const sekmeler =
    kullaniciRol === "YONETICI"
      ? [
          ...SEKMELER,
          { yol: "/kokpit/ayarlar/kullanicilar", ad: "Kullanıcılar" },
          { yol: "/kokpit/gelistirme-kutusu", ad: "Geliştirme Kutusu" },
        ]
      : SEKMELER;

  return (
    <div className="pt-3">
      <div className="mb-6 flex gap-2 border-b border-white/10">
        {sekmeler.map((sekme) => (
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
