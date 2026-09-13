export function DosyaSecici({
  dosyalar,
}: {
  dosyalar: {
    id: string;
    dosyaNo: string | null;
    konu: string;
    karsiTaraf: { ad: string } | null;
  }[];
}) {
  return (
    <div className="col-span-2 mb-4 md:col-span-4">
      <p className="mb-1 block text-sm font-medium text-white/70">
        Hangi Uyuşmazlık Dosyası/Dosyalarına İstinaden (opsiyonel)
      </p>
      {dosyalar.length === 0 ? (
        <p className="glass rounded-xl px-3 py-2 text-sm text-white/40">
          Bu müvekkile bağlı dava dosyası yok.
        </p>
      ) : (
        <div className="glass max-h-40 overflow-y-auto rounded-xl p-2">
          {dosyalar.map((dosya) => (
            <label
              key={dosya.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/[0.06]"
            >
              <input
                type="checkbox"
                name="dosyaIds"
                value={dosya.id}
                className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--accent)]"
              />
              {dosya.dosyaNo ? `${dosya.dosyaNo} — ` : ""}
              {dosya.konu}
              {dosya.karsiTaraf && (
                <span className="text-white/45"> ({dosya.karsiTaraf.ad})</span>
              )}
            </label>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-white/35">Bazen tek, bazen birden fazla dosya seçilebilir.</p>
    </div>
  );
}
