export function MuvekkilSecici({
  musteriler,
  seciliIdler = [],
}: {
  musteriler: { id: string; adSoyadUnvan: string }[];
  seciliIdler?: string[];
}) {
  return (
    <div className="mb-4">
      <p className="mb-1 block text-sm font-medium text-white/70">Müvekkil</p>
      <div className="glass max-h-48 overflow-y-auto rounded-xl p-2">
        {musteriler.length === 0 && (
          <p className="px-2 py-1 text-sm text-white/40">Kayıtlı müvekkil yok.</p>
        )}
        {musteriler.map((musteri) => (
          <label
            key={musteri.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/[0.06]"
          >
            <input
              type="checkbox"
              name="musteriIds"
              value={musteri.id}
              defaultChecked={seciliIdler.includes(musteri.id)}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--accent)]"
            />
            {musteri.adSoyadUnvan}
          </label>
        ))}
      </div>
    </div>
  );
}
