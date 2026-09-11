import type { ButtonHTMLAttributes } from "react";

type Varyant = "birincil" | "ikincil" | "tehlike";

const varyantSiniflari: Record<Varyant, string> = {
  birincil: "bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-white/80",
  ikincil:
    "border border-black/15 bg-transparent text-black hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10",
  tehlike: "bg-red-600 text-white hover:bg-red-700",
};

export function Dugme({
  varyant = "birincil",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varyant?: Varyant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${varyantSiniflari[varyant]} ${className}`}
    />
  );
}
