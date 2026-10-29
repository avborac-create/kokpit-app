// Kunye seridi: dosya / muvekkil gibi "su an hangi kayittayim" bilgisinin yer
// aldigi baslik alani. Genis ekranda sayfa asagi kaydirilsa da ustte sabit kalir
// (telefonda ekrani yemesin diye normal akista kalir); kaydirma
// kabugunun (main) yan bosluklarina tasar, bu yuzden negatif yan kenar kullanir.
export function KunyeSeridi({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div
      id={id}
      className={`md:sticky md:top-0 z-20 -mx-3 border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--background-2)_95%,transparent)] px-3 py-2 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)] backdrop-blur-md md:-mx-6 md:px-6 md:py-3 ${className}`}
    >
      {children}
    </div>
  );
}
