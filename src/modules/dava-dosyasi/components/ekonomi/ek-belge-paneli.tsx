"use client";

import { useEffect, useRef, useState } from "react";

type Ek = {
  id: number;
  ad: string; // gorunen ad (orijinal dosya adi)
  tur: "PDF" | "HTML" | "RESİM";
  durum: "isleniyor" | "hazir" | "hata";
  dosya: File | null; // sunucuya gidecek dosya
  hata?: string;
  bayt: number;
};

const AZAMI_TOPLAM = 4 * 1024 * 1024;
const AZAMI_ADET = 10;
const KABUL = ".pdf,.html,.htm,.png,.jpg,.jpeg,.webp,.tif,.tiff";

const kb = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const tabanAd = (ad: string) => ad.replace(/\.[^.]+$/, "");

function jpegOlarak(canvas: HTMLCanvasElement, ad: string, kalite = 0.88): Promise<File> {
  return new Promise((coz, reddet) =>
    canvas.toBlob((b) => (b ? coz(new File([b], `${ad}.jpg`, { type: "image/jpeg" })) : reddet(new Error("Görüntü üretilemedi"))), "image/jpeg", kalite),
  );
}

// Buyuk fotograf/tarama resimlerini yukleme sinirina sigsin diye kucultur.
async function resmiKucult(dosya: File): Promise<File> {
  if (dosya.size < 900 * 1024) return dosya;
  const bitmap = await createImageBitmap(dosya);
  const oran = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * oran);
  canvas.height = Math.round(bitmap.height * oran);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dosya;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const kucuk = await jpegOlarak(canvas, tabanAd(dosya.name), 0.85);
  return kucuk.size < dosya.size ? kucuk : dosya;
}

// UYAP makbuzlari gibi HTML belgeleri tarayicida (betik calistirmadan) cizilip goruntuye cevrilir.
async function htmlGoruntuyeCevir(dosya: File): Promise<File> {
  const metin = new TextDecoder("utf-8").decode(await dosya.arrayBuffer());
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-same-origin"); // betikler calismaz
  iframe.style.cssText = "position:fixed;left:-12000px;top:0;width:900px;height:1200px;border:0;background:#fff";
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((coz) => {
      iframe.onload = () => coz();
      iframe.srcdoc = metin;
    });
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("HTML açılamadı");
    const genislik = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth, 400);
    const yukseklik = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, 400);
    iframe.style.width = `${genislik}px`;
    iframe.style.height = `${yukseklik}px`;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(doc.documentElement, { scale: 2, backgroundColor: "#ffffff", width: genislik, height: yukseklik, windowWidth: genislik, windowHeight: yukseklik, logging: false });
    return await jpegOlarak(canvas, tabanAd(dosya.name), 0.9);
  } finally {
    iframe.remove();
  }
}

// Surukle-birak (ya da dosya sec) ek belge paneli. Hazir dosyalar, bulundugu <form>'a "ek" alaniyla eklenir;
// sunucu bunlari Musteri Hesap Ozeti PDF'inin sonuna EK-1, EK-2... olarak koyar.
export function EkBelgePaneli({ onDurum }: { onDurum?: (durum: { hazir: boolean }) => void }) {
  const [ekler, setEkler] = useState<Ek[]>([]);
  const [suruklenen, setSuruklenen] = useState(false);
  const [uyari, setUyari] = useState("");
  const girdi = useRef<HTMLInputElement>(null);
  const secici = useRef<HTMLInputElement>(null);
  const sayac = useRef(0);

  const hazirlar = ekler.filter((e) => e.durum === "hazir" && e.dosya);
  const toplam = hazirlar.reduce((t, e) => t + (e.dosya?.size ?? 0), 0);
  const asildi = toplam > AZAMI_TOPLAM;
  const isleniyor = ekler.some((e) => e.durum === "isleniyor");

  useEffect(() => {
    const dt = new DataTransfer();
    hazirlar.forEach((e) => e.dosya && dt.items.add(e.dosya));
    if (girdi.current) girdi.current.files = dt.files;
    onDurum?.({ hazir: !isleniyor && !asildi });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ekler]);

  function guncelle(id: number, yama: Partial<Ek>) {
    setEkler((o) => o.map((e) => (e.id === id ? { ...e, ...yama } : e)));
  }

  async function dosyalariEkle(liste: FileList | File[]) {
    setUyari("");
    const dosyalar = [...liste];
    if (ekler.length + dosyalar.length > AZAMI_ADET) setUyari(`En çok ${AZAMI_ADET} ek eklenebilir.`);
    for (const dosya of dosyalar.slice(0, Math.max(0, AZAMI_ADET - ekler.length))) {
      const id = ++sayac.current;
      const ad = dosya.name.toLowerCase();
      const tur: Ek["tur"] | null = ad.endsWith(".pdf") ? "PDF" : /\.html?$/.test(ad) ? "HTML" : /\.(png|jpe?g|webp|tiff?)$/.test(ad) ? "RESİM" : null;
      if (!tur) {
        setEkler((o) => [...o, { id, ad: dosya.name, tur: "PDF", durum: "hata", dosya: null, hata: "Bu dosya türü eklenemez (PDF, HTML ya da resim olmalı).", bayt: dosya.size }]);
        continue;
      }
      setEkler((o) => [...o, { id, ad: dosya.name, tur, durum: "isleniyor", dosya: null, bayt: dosya.size }]);
      try {
        let son = dosya;
        if (tur === "HTML") son = await htmlGoruntuyeCevir(dosya);
        else if (tur === "RESİM" && !/\.tiff?$/.test(ad)) son = await resmiKucult(dosya);
        guncelle(id, { durum: "hazir", dosya: son });
      } catch (e) {
        guncelle(id, { durum: "hata", hata: e instanceof Error ? e.message : "Dosya işlenemedi." });
      }
    }
  }

  function tasi(id: number, yon: -1 | 1) {
    setEkler((o) => {
      const i = o.findIndex((e) => e.id === id);
      const j = i + yon;
      if (i < 0 || j < 0 || j >= o.length) return o;
      const kopya = [...o];
      [kopya[i], kopya[j]] = [kopya[j], kopya[i]];
      return kopya;
    });
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSuruklenen(true);
        }}
        onDragLeave={() => setSuruklenen(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSuruklenen(false);
          if (e.dataTransfer.files.length > 0) void dosyalariEkle(e.dataTransfer.files);
        }}
        onClick={() => secici.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") secici.current?.click();
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors ${
          suruklenen ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-white/20 bg-white/[0.03] hover:bg-white/[0.06]"
        }`}
      >
        <p className="text-base font-semibold text-white">📎 Belgeleri buraya sürükleyip bırakın</p>
        <p className="mt-1 text-sm text-white/55">ya da dokunup dosya seçin · PDF, HTML (UYAP makbuzu) ve resim</p>
      </div>
      <input
        ref={secici}
        type="file"
        multiple
        accept={KABUL}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void dosyalariEkle(e.target.files);
          e.target.value = "";
        }}
      />
      {/* Forma giden gercek alan: hazir dosyalar buraya aktarilir */}
      <input ref={girdi} type="file" name="ek" multiple className="hidden" tabIndex={-1} />

      {uyari && <p className="mt-2 text-sm text-[#ffb340]">{uyari}</p>}

      {ekler.length > 0 && (
        <ul className="mt-3 divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-white/10 bg-black/10">
          {ekler.map((e, i) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/80">EK-{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{e.ad}</p>
                <p className={`text-xs ${e.durum === "hata" ? "text-[#ff7a70]" : "text-white/45"}`}>
                  {e.durum === "isleniyor" && "Hazırlanıyor…"}
                  {e.durum === "hata" && (e.hata ?? "Eklenemedi")}
                  {e.durum === "hazir" && `${e.tur} · ${kb(e.dosya?.size ?? e.bayt)}${e.tur === "HTML" ? " · görüntüye çevrildi" : ""}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => tasi(e.id, -1)} disabled={i === 0} className="h-8 w-8 rounded-full text-white/60 hover:bg-white/10 disabled:opacity-25" aria-label="Yukarı taşı">
                  ▲
                </button>
                <button type="button" onClick={() => tasi(e.id, 1)} disabled={i === ekler.length - 1} className="h-8 w-8 rounded-full text-white/60 hover:bg-white/10 disabled:opacity-25" aria-label="Aşağı taşı">
                  ▼
                </button>
                <button type="button" onClick={() => setEkler((o) => o.filter((x) => x.id !== e.id))} className="h-8 w-8 rounded-full text-lg text-white/50 hover:bg-white/10 hover:text-[#ff7a70]" aria-label="Kaldır">
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {ekler.length > 0 && (
        <p className={`mt-2 text-xs ${asildi ? "text-[#ff7a70]" : "text-white/40"}`}>
          Toplam {kb(toplam)} / 4 MB {asildi && "— sınır aşıldı, bazı ekleri çıkarın"}
        </p>
      )}
    </div>
  );
}
