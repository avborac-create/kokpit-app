// Dosya durumuna gore rozet rengi: her durum kodu ayri bir renkle gosterilir
// (Acik yesil, Arsiv amber, Kapali gri...). Siniflar statik yazilir ki Tailwind bulsun.
const RENKLER: Record<string, string> = {
  acik: "bg-emerald-400/15 text-emerald-300",
  derdest: "bg-sky-400/15 text-sky-300",
  acilacak: "bg-violet-400/15 text-violet-300",
  kapali: "bg-slate-400/20 text-slate-300",
  arsiv: "bg-amber-400/15 text-amber-300",
  incelenmeli: "bg-rose-400/15 text-rose-300",
};

// Listede olmayan (sonradan eklenen) durumlar kodundan turetilen sabit bir renk alir.
const YEDEK_RENKLER = [
  "bg-cyan-400/15 text-cyan-300",
  "bg-fuchsia-400/15 text-fuchsia-300",
  "bg-lime-400/15 text-lime-300",
  "bg-orange-400/15 text-orange-300",
  "bg-indigo-400/15 text-indigo-300",
  "bg-teal-400/15 text-teal-300",
];

export function dosyaDurumSinifi(kod: string | null | undefined): string {
  if (!kod) return "bg-white/10 text-white/70";
  if (RENKLER[kod]) return RENKLER[kod];
  let h = 0;
  for (const c of kod) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return YEDEK_RENKLER[h % YEDEK_RENKLER.length];
}
