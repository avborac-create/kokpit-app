"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { oneriGonder } from "@/core/oneri/actions";
import { Dugme } from "@/core/ui/button";

type Asama = "kapali" | "seciliyor" | "yakalaniyor" | "onizleme" | "gonderiliyor" | "tamamlandi";

type Secim = { x: number; y: number; w: number; h: number };

export function OneriButonu() {
  const pathname = usePathname();
  const [asama, setAsama] = useState<Asama>("kapali");
  const [secim, setSecim] = useState<Secim | null>(null);
  const [gorselVeri, setGorselVeri] = useState<string | null>(null);
  const baslangicRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (asama !== "seciliyor") return;
    function tusaBasildi(e: KeyboardEvent) {
      if (e.key === "Escape") sifirla();
    }
    window.addEventListener("keydown", tusaBasildi);
    return () => window.removeEventListener("keydown", tusaBasildi);
  }, [asama]);

  function sifirla() {
    setAsama("kapali");
    setSecim(null);
    setGorselVeri(null);
    baslangicRef.current = null;
  }

  function mouseDown(e: React.MouseEvent) {
    baslangicRef.current = { x: e.clientX, y: e.clientY };
    setSecim({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  }

  function mouseMove(e: React.MouseEvent) {
    if (!baslangicRef.current) return;
    const bx = baslangicRef.current.x;
    const by = baslangicRef.current.y;
    setSecim({
      x: Math.min(bx, e.clientX),
      y: Math.min(by, e.clientY),
      w: Math.abs(e.clientX - bx),
      h: Math.abs(e.clientY - by),
    });
  }

  async function mouseUp() {
    const suAnkiSecim = secim;
    baslangicRef.current = null;

    if (!suAnkiSecim || suAnkiSecim.w < 10 || suAnkiSecim.h < 10) {
      setAsama("onizleme");
      setGorselVeri(null);
      return;
    }

    setAsama("yakalaniyor");
    // Overlay'in DOM'dan kalkip repaint olmasi icin bir kare bekle - aksi
    // halde secim dikdortgeni de ekran goruntusune dahil olur.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      // html2canvas modern CSS renk fonksiyonlarini (oklab/oklch, Tailwind v4
      // varsayilan paleti) parse edemiyor. html-to-image DOM'u SVG
      // foreignObject icinde tarayiciya cizdirdigi icin bu sinirlamayi tasimaz.
      const { toCanvas } = await import("html-to-image");
      const tamSayfa = await toCanvas(document.body, {
        backgroundColor: "#0b0d12",
        pixelRatio: 1,
      });
      const kirpilmis = document.createElement("canvas");
      kirpilmis.width = suAnkiSecim.w;
      kirpilmis.height = suAnkiSecim.h;
      const ctx = kirpilmis.getContext("2d");
      if (!ctx) throw new Error("canvas context alinamadi");
      ctx.drawImage(
        tamSayfa,
        suAnkiSecim.x + window.scrollX,
        suAnkiSecim.y + window.scrollY,
        suAnkiSecim.w,
        suAnkiSecim.h,
        0,
        0,
        suAnkiSecim.w,
        suAnkiSecim.h,
      );
      setGorselVeri(kirpilmis.toDataURL("image/jpeg", 0.7));
    } catch (err) {
      console.error("Öneri Yolla: bölge yakalanamadı", err);
      setGorselVeri(null);
    }
    setAsama("onizleme");
  }

  async function gonderildi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("sayfaYolu", pathname);
    fd.set("gorselVeri", gorselVeri ?? "");
    setAsama("gonderiliyor");
    await oneriGonder(fd);
    setAsama("tamamlandi");
    setTimeout(() => sifirla(), 1800);
  }

  return (
    <>
      <Dugme
        type="button"
        varyant="ikincil"
        onClick={() => {
          // Sayfada acik kalmis native bir <select>/input odagi, tarayicinin
          // kendi acilir kutusunu (native popup) her zaman en ustte,
          // portal'in z-index'ini yok sayarak cizdirir. Odagi burada
          // kaldirarak boyle bir kutunun secim/onizleme katmaninin
          // uzerinde asili kalmasini onluyoruz.
          (document.activeElement as HTMLElement | null)?.blur();
          setAsama("seciliyor");
        }}
      >
        Öneri Yolla
      </Dugme>

      {asama === "seciliyor" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] cursor-crosshair select-none"
            style={{ background: "rgba(11,13,18,0.15)" }}
            onMouseDown={mouseDown}
            onMouseMove={mouseMove}
            onMouseUp={mouseUp}
          >
            <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white">
              Bir bölge seçin (sürükleyin) — İptal için ESC
            </div>
            {secim && (
              <div
                className="pointer-events-none absolute border-2 border-[var(--accent)] bg-[var(--accent)]/10"
                style={{ left: secim.x, top: secim.y, width: secim.w, height: secim.h }}
              />
            )}
          </div>,
          document.body,
        )}

      {asama === "yakalaniyor" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
            <p className="rounded-2xl border border-white/10 bg-[var(--background-2)] px-6 py-4 text-sm text-white">
              Görsel yakalanıyor…
            </p>
          </div>,
          document.body,
        )}

      {asama === "onizleme" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--background-2)] p-5">
              <p className="mb-3 text-base font-semibold text-white">Öneri</p>
              {gorselVeri && (
                <div className="mb-3">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-white/40">
                    📷 Seçtiğiniz bölgenin görüntüsü
                  </p>
                  <div className="rounded-lg border-2 border-dashed border-white/20 bg-black/30 p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={gorselVeri}
                      alt="Seçilen bölgenin durağan görüntüsü"
                      className="max-h-48 w-full rounded object-contain"
                    />
                  </div>
                </div>
              )}
              <form onSubmit={gonderildi}>
                <textarea
                  name="metin"
                  required
                  rows={3}
                  autoFocus
                  placeholder="Bu bölgede ne değişmeli?"
                  className="glass w-full rounded-xl px-3 py-2 text-sm text-white placeholder-white/35 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/40"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Dugme type="button" varyant="ikincil" onClick={sifirla}>
                    İptal
                  </Dugme>
                  <Dugme type="submit">Gönder</Dugme>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {asama === "gonderiliyor" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
            <p className="rounded-2xl border border-white/10 bg-[var(--background-2)] px-6 py-4 text-sm text-white">Gönderiliyor…</p>
          </div>,
          document.body,
        )}

      {asama === "tamamlandi" &&
        createPortal(
          <div className="fixed inset-x-0 bottom-6 z-[100] flex justify-center">
            <p className="rounded-full border border-white/10 bg-[var(--background-2)] px-5 py-2.5 text-sm text-white">
              ✓ Öneriniz iletildi
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
