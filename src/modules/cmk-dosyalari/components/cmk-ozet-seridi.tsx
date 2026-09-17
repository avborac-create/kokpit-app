// Gunluk kullanimda en cok onem tasiyan iki sayiyi (bkz. ARCHITECTURE.md
// "CMK Dosyalari - one cikarma") ust seritte gosterir. Filtrelerden bagimsiz,
// her zaman tum kayitlar uzerinden hesaplanir.
export function CMKOzetSeridi({
  yaklasanDurusma,
  gecikmisKontrol,
}: {
  yaklasanDurusma: number;
  gecikmisKontrol: number;
}) {
  if (yaklasanDurusma === 0 && gecikmisKontrol === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {yaklasanDurusma > 0 && (
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[#6db8ff]">
          {yaklasanDurusma} yaklaşan duruşma (7 gün içinde)
        </span>
      )}
      {gecikmisKontrol > 0 && (
        <span className="rounded-full bg-[var(--danger-soft)] px-3 py-1 text-xs font-medium text-[#ff7a70]">
          {gecikmisKontrol} gecikmiş sonraki kontrol
        </span>
      )}
    </div>
  );
}
