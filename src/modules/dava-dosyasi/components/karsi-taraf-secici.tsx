// Bir icra takibi genelde TEK bir karsi tarafa degil, cek/bono
// zincirindeki TUM muteselsil sorumlulara (kesideci + cirantalar) birden
// acilir - bu yuzden coklu secim (MuvekkilSecici ile ayni desen).
export function KarsiTarafSecici({
  karsiTaraflar,
  seciliIdler = [],
}: {
  karsiTaraflar: { id: string; ad: string }[];
  seciliIdler?: string[];
}) {
  return (
    <div className="mb-4">
      <p className="mb-1 block text-sm font-medium text-white/70">Karşı Taraf(lar)</p>
      <div className="glass max-h-48 overflow-y-auto rounded-xl p-2">
        {karsiTaraflar.length === 0 && (
          <p className="px-2 py-1 text-sm text-white/40">Kayıtlı karşı taraf yok.</p>
        )}
        {karsiTaraflar.map((kt) => (
          <label
            key={kt.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/[0.06]"
          >
            <input
              type="checkbox"
              name="karsiTarafIds"
              value={kt.id}
              defaultChecked={seciliIdler.includes(kt.id)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--accent)]"
            />
            {kt.ad}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-white/35">
        Aynı takipte birden fazla müteselsil sorumlu (keşideci + cirantalar) varsa hepsini seçin.
      </p>
    </div>
  );
}
