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
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white/30"
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
            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
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
