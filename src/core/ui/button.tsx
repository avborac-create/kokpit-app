import type { ButtonHTMLAttributes } from "react";

type Varyant = "birincil" | "ikincil" | "tehlike";
type Boyut = "normal" | "kompakt";

const varyantSiniflari: Record<Varyant, string> = {
  birincil:
    "bg-[var(--accent)] text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_20px_-8px_rgba(10,132,255,0.6)] hover:bg-[#2b95ff] active:bg-[#0a74e0]",
  ikincil: "glass text-white/85 hover:bg-white/10 active:bg-white/[0.14]",
  tehlike:
    "bg-[var(--danger-soft)] text-[#ff7a70] border border-[rgba(255,69,58,0.35)] hover:bg-[rgba(255,69,58,0.24)]",
};

// "kompakt": cok satirli/yogun tablolarda (ör. Dosyalar listesi) satir
// yuksekligini varsayilan buton boyutunun dikte etmesini onlemek icin.
const boyutSiniflari: Record<Boyut, string> = {
  normal: "px-4 py-2 text-sm",
  kompakt: "px-2.5 py-1 text-xs",
};

export function Dugme({
  varyant = "birincil",
  boyut = "normal",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varyant?: Varyant; boyut?: Boyut }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-full font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#12151d] ${boyutSiniflari[boyut]} ${varyantSiniflari[varyant]} ${className}`}
    />
  );
}
