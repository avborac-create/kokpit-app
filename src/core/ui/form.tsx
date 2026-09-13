import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const alanSinifi =
  "glass w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/35 outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/40";

export function Etiket(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className="mb-1 block text-sm font-medium text-white/70" />;
}

export function Girdi(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={alanSinifi + (props.className ? " " + props.className : "")} />;
}

export function MetinAlani(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={alanSinifi + (props.className ? " " + props.className : "")} />;
}

export function Secim(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={alanSinifi + " [color-scheme:dark]" + (props.className ? " " + props.className : "")}
    />
  );
}

export function Alan({ children }: { children: React.ReactNode }) {
  // min-w-0: grid/flex hücrelerinin varsayılanı min-width:auto'dur - bir
  // input'un (özellikle iOS'un native <input type="date"> render'ı gibi
  // buyuk intrinsic genislige sahip kontrollerin) icerigi hucrenin adil
  // payindan genis olursa grid sutunu bunu buyutur, komsu hucreye tasar/
  // bindirir. min-w-0 bu hucreyi grid'in verdigi genislige zorlar, input
  // kendi icinde (w-full ile) dogru sekilde daralir.
  return <div className="mb-4 min-w-0">{children}</div>;
}
