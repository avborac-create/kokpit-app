import { GirisFormu } from "./giris-formu";

export default function GirisSayfasi() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="glass-strong w-full max-w-sm rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">KOKPİT</h1>
        <p className="mb-6 text-sm text-white/50">Eces Hukuk Bürosu</p>
        <GirisFormu />
      </div>
    </div>
  );
}
