import { GirisFormu } from "./giris-formu";

export default function GirisSayfasi() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="mb-1 text-xl font-semibold text-black dark:text-white">KOKPİT</h1>
        <p className="mb-6 text-sm text-black/60 dark:text-white/60">Eces Hukuk Bürosu</p>
        <GirisFormu />
      </div>
    </div>
  );
}
