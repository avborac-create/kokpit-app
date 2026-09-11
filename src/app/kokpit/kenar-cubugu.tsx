"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODUL_KAYIT_DEFTERI } from "@/core/modul-kayit-defteri";

export function KenarCubugu() {
  const yol = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {MODUL_KAYIT_DEFTERI.map((modul) => {
        const seciliMi = yol.startsWith(modul.yol);
        if (!modul.aktif) {
          return (
            <span
              key={modul.anahtar}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-black/35 dark:text-white/30"
              title="Bu modül henüz geliştirilmedi"
            >
              {modul.ad}
              <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium dark:bg-white/10">
                Yakında
              </span>
            </span>
          );
        }
        return (
          <Link
            key={modul.anahtar}
            href={modul.yol}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              seciliMi
                ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
            }`}
          >
            {modul.ad}
          </Link>
        );
      })}
    </nav>
  );
}
