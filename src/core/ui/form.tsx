import type { LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const alanSinifi = "alan-bmw";

export function Etiket(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/60" />;
}

export function Girdi(props: React.ComponentProps<"input">) {
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
