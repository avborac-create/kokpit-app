// Basit servis calisani: PWA yuklenebilirligi icin gereken minimum.
// Ilk faz - agresif onbellekleme yok; sadece uygulamanin cevrimdisi acilista
// bos ekran vermemesi icin son gorulen sayfa onbelleklenir.
const ONBELLEK_ADI = "kokpit-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (olay) => {
  olay.waitUntil(
    caches.keys().then((anahtarlar) =>
      Promise.all(
        anahtarlar
          .filter((anahtar) => anahtar !== ONBELLEK_ADI)
          .map((anahtar) => caches.delete(anahtar)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (olay) => {
  if (olay.request.method !== "GET") return;

  olay.respondWith(
    fetch(olay.request)
      .then((yanit) => {
        const kopya = yanit.clone();
        caches.open(ONBELLEK_ADI).then((onbellek) => onbellek.put(olay.request, kopya));
        return yanit;
      })
      .catch(() => caches.match(olay.request)),
  );
});
