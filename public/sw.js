// Basit servis calisani: PWA yuklenebilirligi icin gereken minimum.
// Ilk faz - agresif onbellekleme yok; sadece uygulamanin cevrimdisi acilista
// bos ekran vermemesi icin son gorulen sayfa onbelleklenir.
const ONBELLEK_ADI = "kokpit-v1";

// Web Push: sunucudan gelen bildirimi gosterir; tiklayinca ilgili sayfayi acar.
self.addEventListener("push", (olay) => {
  let v = {};
  try {
    v = olay.data ? olay.data.json() : {};
  } catch (e) {
    v = { baslik: "Kokpit", metin: olay.data ? olay.data.text() : "" };
  }
  olay.waitUntil(
    self.registration.showNotification(v.baslik || "Kokpit", {
      body: v.metin || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: v.etiket || undefined,
      data: { url: v.url || "/kokpit" },
    }),
  );
});

self.addEventListener("notificationclick", (olay) => {
  olay.notification.close();
  const hedef = (olay.notification.data && olay.notification.data.url) || "/kokpit";
  olay.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((pencereler) => {
      for (const p of pencereler) {
        if ("focus" in p) {
          p.navigate(hedef).catch(() => {});
          return p.focus();
        }
      }
      return self.clients.openWindow(hedef);
    }),
  );
});

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
