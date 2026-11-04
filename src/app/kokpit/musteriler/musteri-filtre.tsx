"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Girdi, Secim } from "@/core/ui/form";

type Props = {
  arama: string;
  durum: string;
  avukat: string;
  durumlar: { id: string; kod: string; etiket: string }[];
  avukatlar: { id: string; adSoyad: string }[];
};

/** Müvekkil filtreleri: yazdıkça (kısa gecikmeyle) ve seçim değişince anında uygulanır. */
export function MusteriFiltre({ arama, durum, avukat, durumlar, avukatlar }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, baslat] = useTransition();
  const [metin, setMetin] = useState(arama);
  const [durumSecimi, setDurumSecimi] = useState(durum);
  const [avukatSecimi, setAvukatSecimi] = useState(avukat);
  const ilk = useRef(true);

  useEffect(() => {
    if (ilk.current) {
      ilk.current = false;
      return;
    }
    const zamanlayici = setTimeout(() => {
      const q = new URLSearchParams();
      if (metin.trim()) q.set("arama", metin.trim());
      if (durumSecimi) q.set("durum", durumSecimi);
      if (avukatSecimi) q.set("avukat", avukatSecimi);
      const qs = q.toString();
      baslat(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    }, 250);
    return () => clearTimeout(zamanlayici);
  }, [metin, durumSecimi, avukatSecimi, pathname, router]);

  return (
    <form className="mb-6 flex flex-wrap gap-3" onSubmit={(e) => e.preventDefault()}>
      <Girdi
        type="search"
        name="arama"
        placeholder="Ad, soyad, unvan ara…"
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        className="max-w-xs"
        autoComplete="off"
      />
      <Secim
        name="durum"
        value={durumSecimi}
        onChange={(e) => setDurumSecimi(e.target.value)}
        className="max-w-[10rem]"
      >
        <option value="">Tüm durumlar</option>
        {durumlar.map((d) => (
          <option key={d.id} value={d.kod}>
            {d.etiket}
          </option>
        ))}
      </Secim>
      <Secim
        name="avukat"
        value={avukatSecimi}
        onChange={(e) => setAvukatSecimi(e.target.value)}
        className="max-w-[12rem]"
      >
        <option value="">Tüm sorumlu avukatlar</option>
        {avukatlar.map((a) => (
          <option key={a.id} value={a.id}>
            {a.adSoyad}
          </option>
        ))}
      </Secim>
    </form>
  );
}
