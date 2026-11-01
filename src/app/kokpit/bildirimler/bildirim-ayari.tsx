"use client";

import { useEffect, useState } from "react";
import { pushAboneligiKaydet, pushAboneliginiSil, pushGenelAnahtar, pushTestiGonder } from "@/core/bildirim/actions";

type Durum = "yukleniyor" | "desteklenmiyor" | "iosEkranaEkle" | "kapali" | "izinReddedildi" | "acik";

function anahtarDonustur(base64: string): Uint8Array<ArrayBuffer> {
  const dolgu = "=".repeat((4 - (base64.length % 4)) % 4);
  const ham = atob((base64 + dolgu).replace(/-/g, "+").replace(/_/g, "/"));
  const cikti = new Uint8Array(new ArrayBuffer(ham.length));
  for (let i = 0; i < ham.length; i++) cikti[i] = ham.charCodeAt(i);
  return cikti;
}

function cihazAdi() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone/iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac/.test(ua)) return "Mac";
  return "Cihaz";
}

export function BildirimAyari() {
  const [durum, setDurum] = useState<Durum>("yukleniyor");
  const [mesaj, setMesaj] = useState("");
  const [mesgul, setMesgul] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (ios && !standalone) return setDurum("iosEkranaEkle");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setDurum("desteklenmiyor");
      if (Notification.permission === "denied") return setDurum("izinReddedildi");
      const kayit = await navigator.serviceWorker.ready;
      const abone = await kayit.pushManager.getSubscription();
      setDurum(abone && Notification.permission === "granted" ? "acik" : "kapali");
    })().catch(() => setDurum("desteklenmiyor"));
  }, []);

  async function ac() {
    setMesgul(true);
    setMesaj("");
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setDurum(izin === "denied" ? "izinReddedildi" : "kapali");
        return;
      }
      const kayit = await navigator.serviceWorker.ready;
      const genelAnahtar = await pushGenelAnahtar();
      const abone = await kayit.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: anahtarDonustur(genelAnahtar) });
      const j = abone.toJSON();
      await pushAboneligiKaydet({ endpoint: abone.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "" }, cihazAdi());
      setDurum("acik");
      setMesaj("Bildirimler açıldı. Şimdi “Test bildirimi gönder”e dokunun.");
    } catch (e) {
      setMesaj("Açılamadı: " + (e instanceof Error ? e.message : "bilinmeyen hata"));
    } finally {
      setMesgul(false);
    }
  }

  async function kapat() {
    setMesgul(true);
    try {
      const kayit = await navigator.serviceWorker.ready;
      const abone = await kayit.pushManager.getSubscription();
      if (abone) {
        await pushAboneliginiSil(abone.endpoint);
        await abone.unsubscribe();
      }
      setDurum("kapali");
      setMesaj("Bu cihazda bildirimler kapatıldı.");
    } finally {
      setMesgul(false);
    }
  }

  async function test() {
    setMesgul(true);
    setMesaj("");
    try {
      const s = await pushTestiGonder();
      setMesaj(
        s.gonderilen > 0
          ? `Test bildirimi gönderildi (${s.gonderilen} cihaz). Birkaç saniye içinde gelmesi gerekir.`
          : "Kayıtlı cihaza gönderilemedi. Bildirimleri kapatıp yeniden açmayı deneyin.",
      );
    } catch (e) {
      setMesaj("Gönderilemedi: " + (e instanceof Error ? e.message : "bilinmeyen hata"));
    } finally {
      setMesgul(false);
    }
  }

  const dugme = "rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50";
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      {durum === "yukleniyor" && <p className="text-white/60">Kontrol ediliyor…</p>}
      {durum === "desteklenmiyor" && <p className="text-white/80">Bu tarayıcı bildirimi desteklemiyor. Telefonda Chrome (Android) ya da ana ekrana eklenmiş uygulama (iPhone) kullanın.</p>}
      {durum === "iosEkranaEkle" && (
        <div className="text-white/80">
          <p className="font-medium text-white">iPhone’da önce uygulamayı ana ekrana ekleyin</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>Safari’de bu sayfayı açın, alttaki Paylaş düğmesine dokunun.</li>
            <li>“Ana Ekrana Ekle”yi seçin.</li>
            <li>Ana ekrandaki Kokpit simgesinden açın ve bu sayfaya yeniden gelin.</li>
          </ol>
        </div>
      )}
      {durum === "izinReddedildi" && (
        <p className="text-white/80">
          Bildirim izni kapalı. Telefon Ayarlar › Bildirimler (iPhone) ya da site ayarlarından (Android) Kokpit’e izin verin, sonra bu sayfayı yenileyin.
        </p>
      )}
      {durum === "kapali" && (
        <>
          <p className="text-white/80">Bu cihazda bildirimler kapalı.</p>
          <button type="button" onClick={ac} disabled={mesgul} className={`${dugme} w-fit bg-[var(--accent)] text-white`}>
            Bildirimleri aç
          </button>
        </>
      )}
      {durum === "acik" && (
        <>
          <p className="text-[#7be6a8]">✓ Bu cihazda bildirimler açık.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={test} disabled={mesgul} className={`${dugme} bg-[var(--accent)] text-white`}>
              Test bildirimi gönder
            </button>
            <button type="button" onClick={kapat} disabled={mesgul} className={`${dugme} border border-white/15 text-white/75`}>
              Bu cihazda kapat
            </button>
          </div>
        </>
      )}
      {mesaj && <p className="text-sm text-white/75">{mesaj}</p>}
    </div>
  );
}
