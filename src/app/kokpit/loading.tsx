// Tikladigi anda ekranin tepki verdigini hissettirmek icin: Next.js bu
// dosyayi otomatik olarak /kokpit altindaki her sayfanin etrafina bir
// Suspense sinirini "fallback" olarak koyar - link tiklanir tiklanmaz
// (veri hazir olmadan ONCE) bu iskelet gorunur, veri gelince gercek
// sayfayla degisir. Ic sayfa sorgusu ne kadar surerse sursun, kullanici
// hicbir zaman bos/donuk bir ekran gormez.
export default function KokpitYukleniyor() {
  return (
    <div className="pt-3">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-white/[0.06]" />
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 border-t border-white/[0.06] first:border-t-0"
          >
            <div className="flex h-full items-center gap-6 px-4">
              <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-40 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
