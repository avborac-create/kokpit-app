export default function DosyaKartiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pt-1">
        <span className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-0.5 text-xs font-semibold uppercase tracking-widest text-[#8fb4e8]">
          Dosya Kartı
        </span>
      </div>
      {children}
    </>
  );
}
