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
  const ic = useRef<HTMLDivElement>(null);
  const carpanRef = useRef(1);
  const bekleyen = useRef<{ x: number; y: number; bitis: number } | null>(null);
  const [belge, setBelge] = useState<PDFDocumentProxy | null>(null);
  const [hata, setHata] = useState("");
  const [mod, setMod] = useState<Mod>("genislik");
  const [carpan, setCarpan] = useState(1);
  const [boyut, setBoyut] = useState({ g: 0, y: 0 });
  const [tamEkran, setTamEkran] = useState(false);
  const [aktifSayfa, setAktifSayfa] = useState(1);
  useEffect(() => {
    carpanRef.current = carpan;
  }, [carpan]);

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
    const olc = () => setBoyut({ g: Math.max(0, el.clientWidth - 16), y: tamEkran ? Math.max(200, window.innerHeight - 90) : Math.round(window.innerHeight * 0.72) });
    olc();
    const g = new ResizeObserver(olc);
    g.observe(el);
    return () => g.disconnect();
  }, [tamEkran]);

  // Tam ekran: arka plan kaymasın, Esc ile kapansın.
  useEffect(() => {
    if (!tamEkran) return;
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTamEkran(false);
    };
    window.addEventListener("keydown", tus);
    return () => {
      document.body.style.overflow = eski;
      window.removeEventListener("keydown", tus);
    };
  }, [tamEkran]);

  // Kaydırdıkça "Sayfa x / y" göstergesini güncelle.
  useEffect(() => {
    const el = kap.current;
    if (!el) return;
    let kare = 0;
    const hesapla = () => {
      kare = 0;
      const cocuklar = ic.current?.children;
      if (!cocuklar) return;
      const esik = el.getBoundingClientRect().top + el.clientHeight / 3;
      let n = 1;
      for (let i = 0; i < cocuklar.length; i++) {
        if (cocuklar[i].getBoundingClientRect().top <= esik) n = i + 1;
        else break;
      }
      setAktifSayfa(n);
    };
    const kaydir = () => {
      if (!kare) kare = requestAnimationFrame(hesapla);
    };
    el.addEventListener("scroll", kaydir, { passive: true });
    return () => {
      el.removeEventListener("scroll", kaydir);
      if (kare) cancelAnimationFrame(kare);
    };
  }, []);

  function sayfayaGit(n: number) {
    const el = kap.current;
    const hedef = ic.current?.children[n - 1] as HTMLElement | undefined;
    if (!el || !hedef) return;
    el.scrollTo({ top: hedef.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 8, behavior: "smooth" });
  }

  // İki parmakla yakınlaştırma yalnız evrakı büyütür; sayfa/üst düğmeler büyümez.
  // Yakınlaştırma parmakların bastığı noktaya doğru yapılır: hareket sırasında hafif CSS ölçeklemesi
  // (parmakların ortası sabit kalır), parmaklar kalkınca gerçek (keskin) yeniden çizim ve kaydırma düzeltmesi.
  useEffect(() => {
    const el = kap.current;
    if (!el) return;
    let d0 = 0;
    let k = 1;
    let ox = 0;
    let oy = 0;
    let bx = 0;
    let by = 0;
    let sx = 0;
    let sy = 0;
    let ex = 0;
    let ey = 0;
    let tek = false;
    let tx = 0;
    let ty = 0;
    let sonT = 0;
    let sonX = 0;
    let sonY = 0;
    const mesafe = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const orta = (t: TouchList) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
    const basla = (e: TouchEvent) => {
      bekleyen.current = null;
      tek = e.touches.length === 1;
      if (tek) {
        tx = e.touches[0].clientX;
        ty = e.touches[0].clientY;
      }
      if (e.touches.length === 2 && ic.current) {
        d0 = mesafe(e.touches);
        k = 1;
        const m = orta(e.touches);
        const r = ic.current.getBoundingClientRect();
        bx = m.x;
        by = m.y;
        ex = m.x;
        ey = m.y;
        ox = m.x - r.left;
        oy = m.y - r.top;
        sx = el.scrollLeft;
        sy = el.scrollTop;
      }
    };
    const hareket = (e: TouchEvent) => {
      if (tek && Math.hypot(e.touches[0].clientX - tx, e.touches[0].clientY - ty) > 10) tek = false;
      if (e.touches.length !== 2 || d0 <= 0) return;
      e.preventDefault();
      const mevcut = carpanRef.current;
      const hedef = Math.min(4, Math.max(0.3, (mevcut * mesafe(e.touches)) / d0));
      k = hedef / mevcut;
      const m = orta(e.touches);
      ex = m.x;
      ey = m.y;
      if (ic.current) {
        ic.current.style.transformOrigin = `${ox}px ${oy}px`;
        ic.current.style.transform = `translate(${ex - bx}px, ${ey - by}px) scale(${k})`;
      }
    };
    // Çift dokunuş: dokunulan noktaya %200 yakınlaştır; yakınsa eski boyuta dön.
    const ciftDokunma = (x: number, y: number) => {
      if (!ic.current) return;
      const c = carpanRef.current;
      const hedef = c > 1.2 ? 1 : 2;
      const kat = hedef / c;
      const r = ic.current.getBoundingClientRect();
      bekleyen.current = { x: el.scrollLeft + (x - r.left) * (kat - 1), y: el.scrollTop + (y - r.top) * (kat - 1), bitis: Date.now() + 900 };
      setCarpan(hedef);
    };
    const bitir = (e: TouchEvent) => {
      if (tek && e.type === "touchend" && e.touches.length === 0 && e.changedTouches.length === 1) {
        tek = false;
        const t = e.changedTouches[0];
        const simdi = Date.now();
        if (simdi - sonT < 350 && Math.hypot(t.clientX - sonX, t.clientY - sonY) < 30) {
          sonT = 0;
          ciftDokunma(t.clientX, t.clientY);
        } else {
          sonT = simdi;
          sonX = t.clientX;
          sonY = t.clientY;
        }
      }
      if (d0 > 0 && e.touches.length < 2) {
        d0 = 0;
        if (ic.current) {
          ic.current.style.transform = "";
          ic.current.style.transformOrigin = "";
        }
        if (k !== 1) {
          // Parmakların altındaki evrak noktası, parmakların bıraktığı yerde kalsın.
          bekleyen.current = { x: sx + bx + ox * (k - 1) - ex, y: sy + by + oy * (k - 1) - ey, bitis: Date.now() + 900 };
          setCarpan(Math.round(carpanRef.current * k * 100) / 100);
        }
        k = 1;
      }
    };
    el.addEventListener("touchstart", basla, { passive: true });
    el.addEventListener("touchmove", hareket, { passive: false });
    el.addEventListener("touchend", bitir);
    el.addEventListener("touchcancel", bitir);
    return () => {
      el.removeEventListener("touchstart", basla);
      el.removeEventListener("touchmove", hareket);
      el.removeEventListener("touchend", bitir);
      el.removeEventListener("touchcancel", bitir);
    };
  }, []);

  // Yeniden çizim sırasında sayfa boyutları değiştikçe, bekleyen kaydırma konumunu uygula.
  useEffect(() => {
    const el = kap.current;
    const icEl = ic.current;
    if (!el || !icEl) return;
    const uygula = () => {
      const b = bekleyen.current;
      if (!b) return;
      if (Date.now() > b.bitis) {
        bekleyen.current = null;
        return;
      }
      el.scrollLeft = b.x;
      el.scrollTop = b.y;
    };
    const g = new ResizeObserver(uygula);
    g.observe(icEl);
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
    <div className={tamEkran ? "fixed inset-0 z-[100] flex flex-col bg-[var(--background-2)] p-2" : ""}>
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
        {belge && (
          <span className="flex items-center gap-1">
            <Dugme type="button" varyant="ikincil" boyut="kompakt" onClick={() => sayfayaGit(Math.max(1, aktifSayfa - 1))} aria-label="Önceki sayfa">
              ‹
            </Dugme>
            <span className="min-w-20 text-center text-xs text-white/70">
              Sayfa {Math.min(aktifSayfa, belge.numPages)} / {belge.numPages}
            </span>
            <Dugme type="button" varyant="ikincil" boyut="kompakt" onClick={() => sayfayaGit(Math.min(belge.numPages, aktifSayfa + 1))} aria-label="Sonraki sayfa">
              ›
            </Dugme>
          </span>
        )}
        <Dugme type="button" varyant="ikincil" boyut="kompakt" className="ml-auto" onClick={() => setTamEkran((t) => !t)}>
          {tamEkran ? "Tam ekranı kapat" : "Tam ekran"}
        </Dugme>
      </div>
      <div
        ref={kap}
        style={{ touchAction: "pan-x pan-y" }}
        className={`overflow-auto overscroll-contain rounded-xl bg-[#e9ebf0] p-2 ${tamEkran ? "min-h-0 flex-1" : "max-h-[72vh]"}`}
      >
        <div ref={ic} className="w-max min-w-full space-y-3">
          {!belge && <p className="py-24 text-center text-sm text-[#555]">Sayfalar hazırlanıyor…</p>}
          {belge &&
            boyut.g > 0 &&
            Array.from({ length: belge.numPages }, (_, i) => i + 1).map((no) => (
              <PdfSayfasi key={`${yol}-${no}`} belge={belge} no={no} ad={ad} mod={mod} carpan={carpan} genislik={boyut.g} yukseklik={boyut.y} kok={kap} />
            ))}
        </div>
      </div>
    </div>
  );
}

// Her sayfa önce yalnız ölçülür (hızlı); asıl çizim sayfa ekrana yaklaşınca yapılır, uzaklaşınca bellek boşaltılır.
function PdfSayfasi({ belge, no, ad, mod, carpan, genislik, yukseklik, kok }: { belge: PDFDocumentProxy; no: number; ad: string; mod: Mod; carpan: number; genislik: number; yukseklik: number; kok: React.RefObject<HTMLDivElement | null> }) {
  const tuval = useRef<HTMLCanvasElement>(null);
  const sar = useRef<HTMLDivElement>(null);
  const [olcu, setOlcu] = useState<{ g: number; y: number; olcek: number } | null>(null);
  const [gorunur, setGorunur] = useState(no <= 2);

  useEffect(() => {
    let iptal = false;
    (async () => {
      const sayfa = await belge.getPage(no);
      const vp1 = sayfa.getViewport({ scale: 1 });
      const sigdir = mod === "genislik" ? genislik / vp1.width : Math.min(genislik / vp1.width, yukseklik / vp1.height);
      const olcek = sigdir * carpan;
      const vp = sayfa.getViewport({ scale: olcek });
      if (!iptal) setOlcu({ g: Math.floor(vp.width), y: Math.floor(vp.height), olcek });
    })();
    return () => {
      iptal = true;
    };
  }, [belge, no, mod, carpan, genislik, yukseklik]);

  useEffect(() => {
    const el = sar.current;
    if (!el) return;
    const g = new IntersectionObserver((k) => setGorunur(k.some((x) => x.isIntersecting)), { root: kok.current, rootMargin: "100% 0px" });
    g.observe(el);
    return () => g.disconnect();
  }, [kok]);

  useEffect(() => {
    const c = tuval.current;
    if (!c) return;
    if (!gorunur || !olcu) {
      c.width = 0;
      c.height = 0;
      return;
    }
    let iptal = false;
    let gorev: { cancel: () => void } | null = null;
    (async () => {
      const sayfa = await belge.getPage(no);
      const vp = sayfa.getViewport({ scale: olcu.olcek });
      if (iptal) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.floor(vp.width * dpr);
      c.height = Math.floor(vp.height * dpr);
      c.style.width = `${olcu.g}px`;
      c.style.height = `${olcu.y}px`;
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
  }, [belge, no, olcu, gorunur]);

  return (
    <div ref={sar} className="mx-auto" style={olcu ? { width: olcu.g, height: olcu.y } : { width: "100%", minHeight: 300 }}>
      <canvas ref={tuval} aria-label={`${ad} — sayfa ${no}`} className="block bg-[#ffffff] shadow" />
    </div>
  );
}
