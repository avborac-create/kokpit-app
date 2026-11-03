"use client";

// Hata önleme protokolü: kayda geçecek her işaretlemeden önce kullanıcıya "Onaylıyor musunuz?" sorulur.
// Satır içi, iki düğmeli küçük bir onay adımı (pencere açmaz, mobilde de rahat kullanılır).
export function OnayAdimi({
  mesaj,
  uyari,
  onOnay,
  onVazgec,
  bekliyor,
}: {
  mesaj: string;
  uyari?: string;
  onOnay: () => void;
  onVazgec: () => void;
  bekliyor?: boolean;
}) {
  return (
    <div className="w-full rounded-xl border border-white/20 bg-black/20 p-3 text-sm">
      <p className="text-white">{mesaj}</p>
      {uyari && <p className="mt-1 text-xs text-amber-200">{uyari}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={bekliyor} onClick={onOnay} className="rounded-full bg-[var(--accent)] px-4 py-1 text-xs font-medium text-white disabled:opacity-50">
          {bekliyor ? "Kaydediliyor…" : "Onaylıyorum"}
        </button>
        <button type="button" disabled={bekliyor} onClick={onVazgec} className="rounded-full bg-white/10 px-4 py-1 text-xs text-white/70 hover:bg-white/20">
          Vazgeç
        </button>
      </div>
    </div>
  );
}
