"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KullaniciRolu } from "@prisma/client";
import { MODUL_KAYIT_DEFTERI } from "@/core/modul-kayit-defteri";

export function KenarCubugu({
  kullaniciRol,
  menuDuzeni,
}: {
  kullaniciRol?: KullaniciRolu;
  menuDuzeni: { anahtar: string; gizliMi: boolean }[];
}) {
  const yol = usePathname();

  // Modulun HANGI SAYFAYA gittigi/adi kod tarafinda (MODUL_KAYIT_DEFTERI)
  // kalir; SIRASI ve GORUNURLUGU artik veritabanindan (menuDuzeni, admin'in
  // Ayarlar > Menü Düzeni'nden surukle-birakla degistirdigi) geliyor.
  // menuDuzeni'nde henuz karsiligi olmayan (ör. seed henuz calismadiysa)
  // bir modul listenin sonuna, gorunur olarak eklenir.
  const siraHaritasi = new Map(menuDuzeni.map((oge, index) => [oge.anahtar, index]));
  const gizliSeti = new Set(menuDuzeni.filter((oge) => oge.gizliMi).map((oge) => oge.anahtar));

  const gorunurModuller = MODUL_KAYIT_DEFTERI.filter(
    (modul) =>
      (!modul.rolGorebilir || (kullaniciRol && modul.rolGorebilir.includes(kullaniciRol))) &&
      !gizliSeti.has(modul.anahtar),
  ).sort((a, b) => {
    const siraA = siraHaritasi.get(a.anahtar) ?? Number.MAX_SAFE_INTEGER;
    const siraB = siraHaritasi.get(b.anahtar) ?? Number.MAX_SAFE_INTEGER;
    return siraA - siraB;
  });

  return (
    <nav className="flex flex-col gap-1 p-3">
      {gorunurModuller.map((modul) => {
        const seciliMi = yol.startsWith(modul.yol);
        if (!modul.aktif) {
          return (
            <span
              key={modul.anahtar}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-base text-white/30"
              title="Bu modül henüz geliştirilmedi"
            >
              {modul.ad}
              <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium">
                Yakında
              </span>
            </span>
          );
        }
        return (
          <Link
            key={modul.anahtar}
            href={modul.yol}
            className={`rounded-xl px-3 py-2.5 text-base font-medium transition-colors ${
              seciliMi
                ? "bg-[var(--accent)] text-white shadow-[0_6px_16px_-6px_rgba(10,132,255,0.7)]"
                : "text-white/65 hover:bg-white/[0.08]"
            }`}
          >
            {modul.ad}
          </Link>
        );
      })}
    </nav>
  );
}
