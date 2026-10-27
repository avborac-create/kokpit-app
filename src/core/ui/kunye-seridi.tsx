// Kunye seridi: dosya / muvekkil gibi "su an hangi kayittayim" bilgisinin yer
// aldigi baslik alani. Sayfa asagi kaydirilsa da ustte sabit kalir; kaydirma
// kabugunun (main) yan bosluklarina tasar, bu yuzden negatif yan kenar kullanir.
export function KunyeSeridi({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`sticky top-0 z-20 -mx-4 border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--background-2)_95%,transparent)] px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6 ${className}`}
    >
      {children}
    </div>
  );
}
