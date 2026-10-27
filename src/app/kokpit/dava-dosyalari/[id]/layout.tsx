export default function DosyaKartiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pointer-events-none sticky top-2 z-30 -mb-2 flex justify-end pr-1">
        <span className="glass rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#6db8ff]">
          Dosya Kartı
        </span>
      </div>
      {children}
    </>
  );
}
