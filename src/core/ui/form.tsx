import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const alanSinifi =
  "w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black shadow-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 dark:border-white/15 dark:bg-black dark:text-white";

export function Etiket(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className="mb-1 block text-sm font-medium text-black/80 dark:text-white/80" />;
}

export function Girdi(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={alanSinifi + (props.className ? " " + props.className : "")} />;
}

export function MetinAlani(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={alanSinifi + (props.className ? " " + props.className : "")} />;
}

export function Secim(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={alanSinifi + (props.className ? " " + props.className : "")} />;
}

export function Alan({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}
