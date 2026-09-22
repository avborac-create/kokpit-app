// Uzun formları (ör. Dava Dosyası formu) mobilde taranabilir kılmak için
// tek bir düz alan listesi yerine anlamca gruplanmış "kart" bölümlerine
// ayırır. Grup başlığı burada, tekil alan etiketleri (Etiket bileşeni)
// yine kendi yerinde kalır - iç içe iki seviyeli bir etiketleme.
export function FormKarti({
  baslik,
  children,
}: {
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass mb-4 rounded-2xl p-4 sm:p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-white/40">{baslik}</h3>
      {children}
    </div>
  );
}
