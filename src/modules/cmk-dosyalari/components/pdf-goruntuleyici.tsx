"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Dugme } from "@/core/ui/button";

type Mod = "genislik" | "sayfa";

// PDF'i tarayicinin kendi goruntuleyicisine (iframe) birakmak yerine canvas'a cizer:
// telefonda iframe PDF'i kirpar/yalniz ilk sayfayi gosterir. Burada tum sayfalar alt alta,
// "Genisligine sigdir" / "Sayfaya sigdir" / +/- yakinlastirma ile gosterilir.
export function PdfGoruntuleyici({ yol, ad }: { yol: string; ad: string }) {
  const kap = useRef<HTMLDivElement>(null);
  const [belge, setBelge] = useState<PDFDocumentProxy | null>(null);
  const [hata, setHata] = useState("");
  const [mod, setMod] = useState<Mod>("genislik");
  const [carpan, setCarpan] = useState(1);
  const [boyut, setBoyut] = useState({ g: 0, y: 0 });

  useEffect(() => {
    let iptal = false;
    let yuklenen: PDFDocumentProxy | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const cevap = await fetch(yol);
        if (!cevap.ok) throw new Error("indirilemedi");
        const veri = await cevap.arrayBuffer();
        const d = await pdfjs.getDocument({ data: veri }).promise;
        if (iptal) {
          void d.destroy();
          return;
        }
        yuklenen = d;
        setBelge(d);
      } catch {
        if (!iptal) setHata("PDF önizlenemedi; indirerek açabilirsiniz.");
      }
    })();
    return () => {
      iptal = true;
      void yuklenen?.destroy();
    };
  }, [yol]);

  useEffect(() => {
    const el = kap.current;
    if (!el) return;
    const olc = () => setBoyut({ g: Math.max(0, el.clientWidth - 16), y: Math.round(window.innerHeight * 0.72) });
    olc();
    const g = new ResizeObserver(olc);
    g.observe(el);
    return () => g.disconnect();
  }, []);

  function modSec(m: Mod) {
    setMod(m);
    setCarpan(1);
  }
  const yakin = (d: number) => setCarpan((c) => Math.min(4, Math.max(0.3, Math.round((c + d) * 100) / 100)));

  // Çizim başarısız olursa eski yönteme (tarayıcının kendi PDF görüntüleyicisi) dön.
  if (hata) return <iframe src={yol} title={ad} className="h-[75vh] w-full rounded-xl bg-[#ffffff]" />;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Dugme type="button" varyant={mod === "genislik" ? "birincil" : "ikincil"} boyut="kompakt" onClick={() => modSec("genislik")}>
          Genişliğe sığdır
        </Dugme>
        <Dugme type="button" varyant={mod === "sayfa" ? "birincil" : "ikincil"} boyut="kompakt" onClick={() => modSec("sayfa")}>
          Sayfaya sığdır
        </Dugme>
        <Dugme type="button" varyant="ikincil" boyut="kompakt" onClick={() => yakin(-0.25)}>
          −
        </Dugme>
        <span className="min-w-12 text-center text-xs text-white/60">%{Math.round(carpan * 100)}</span>
        <Dugme type="button" varyant="ikincil" boyut="kompakt" onClick={() => yakin(0.25)}>
          +
        </Dugme>
        {belge && <span className="ml-auto text-xs text-white/45">{belge.numPages} sayfa</span>}
      </div>
      <div ref={kap} className="max-h-[72vh] space-y-3 overflow-auto rounded-xl bg-[#e9ebf0] p-2">
        {!belge && <p className="py-24 text-center text-sm text-[#555]">Sayfalar hazırlanıyor…</p>}
        {belge &&
          boyut.g > 0 &&
          Array.from({ length: belge.numPages }, (_, i) => i + 1).map((no) => (
            <PdfSayfasi key={`${yol}-${no}`} belge={belge} no={no} ad={ad} mod={mod} carpan={carpan} genislik={boyut.g} yukseklik={boyut.y} />
          ))}
      </div>
    </div>
  );
}

function PdfSayfasi({ belge, no, ad, mod, carpan, genislik, yukseklik }: { belge: PDFDocumentProxy; no: number; ad: string; mod: Mod; carpan: number; genislik: number; yukseklik: number }) {
  const tuval = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let iptal = false;
    let gorev: { cancel: () => void } | null = null;
    (async () => {
      const sayfa = await belge.getPage(no);
      const vp1 = sayfa.getViewport({ scale: 1 });
      const sigdir = mod === "genislik" ? genislik / vp1.width : Math.min(genislik / vp1.width, yukseklik / vp1.height);
      const vp = sayfa.getViewport({ scale: sigdir * carpan });
      const c = tuval.current;
      if (!c || iptal) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.floor(vp.width * dpr);
      c.height = Math.floor(vp.height * dpr);
      c.style.width = `${Math.floor(vp.width)}px`;
      c.style.height = `${Math.floor(vp.height)}px`;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const t = sayfa.render({ canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
      gorev = t;
      try {
        await t.promise;
      } catch {
        /* iptal edildi */
      }
    })();
    return () => {
      iptal = true;
      gorev?.cancel();
    };
  }, [belge, no, mod, carpan, genislik, yukseklik]);

  return <canvas ref={tuval} aria-label={`${ad} — sayfa ${no}`} className="mx-auto block bg-[#ffffff] shadow" />;
}
