"use client";

import { useEffect } from "react";

// Uygulamadaki TUM tablolara (telefon + masaustu) sutun genisligi ayarlama tutamaci ekler.
// Her tablonun ilk baslik satirindaki sutunlarin sag kenarina surukleme tutamaci konur;
// genislikler bu cihazda (localStorage) sayfa + tablo sirasi + baslik adlariyla saklanir.
// Tutamaga cift tiklayinca ya da dokununca (iki kez) sutunlar ilk haline doner.
// Kendi genislik duzeni olan tablo icin <table data-sutun-ayari="kapali"> yazilir.
const ANAHTAR_ONEKI = "kokpit-sutun-genislikleri:";
const EN_AZ = 48;

function tabloAnahtari(tablo: HTMLTableElement, basliklar: HTMLTableCellElement[]): string {
  const tumTablolar = Array.from(document.querySelectorAll("table"));
  const sira = tumTablolar.indexOf(tablo);
  const adlar = basliklar.map((h) => (h.textContent ?? "").trim().slice(0, 20)).join("|");
  return `${ANAHTAR_ONEKI}${location.pathname}#${sira}#${adlar}`;
}

function kaydet(anahtar: string, genislikler: number[]) {
  try {
    localStorage.setItem(anahtar, JSON.stringify(genislikler));
  } catch {
    // localStorage erisilemez - sessizce yok say
  }
}

function oku(anahtar: string, sayi: number): number[] | null {
  try {
    const ham = localStorage.getItem(anahtar);
    if (!ham) return null;
    const dizi = JSON.parse(ham) as unknown;
    return Array.isArray(dizi) && dizi.length === sayi && dizi.every((n) => typeof n === "number" && n >= EN_AZ) ? (dizi as number[]) : null;
  } catch {
    return null;
  }
}

function genislikleriUygula(tablo: HTMLTableElement, basliklar: HTMLTableCellElement[], genislikler: number[]) {
  basliklar.forEach((h, i) => {
    h.style.width = `${genislikler[i]}px`;
    h.style.minWidth = `${genislikler[i]}px`;
    h.style.maxWidth = `${genislikler[i]}px`;
  });
  const toplam = genislikler.reduce((a, b) => a + b, 0);
  tablo.classList.add("sutun-ayarli");
  tablo.style.width = `${toplam}px`;
  tablo.style.minWidth = `${toplam}px`;
  const kap = tablo.parentElement;
  if (kap && getComputedStyle(kap).overflowX === "visible") kap.style.overflowX = "auto";
}

function sifirla(tablo: HTMLTableElement, basliklar: HTMLTableCellElement[], anahtar: string) {
  basliklar.forEach((h) => {
    h.style.width = "";
    h.style.minWidth = "";
    h.style.maxWidth = "";
  });
  tablo.classList.remove("sutun-ayarli");
  tablo.style.width = "";
  tablo.style.minWidth = "";
  try {
    localStorage.removeItem(anahtar);
  } catch {
    // yok say
  }
}

function tabloyuHazirla(tablo: HTMLTableElement) {
  if (tablo.dataset.sutunAyari === "kapali") return;
  const satir = tablo.tHead?.rows[0];
  if (!satir) return;
  const basliklar = Array.from(satir.cells) as HTMLTableCellElement[];
  if (basliklar.length < 2 || basliklar.some((h) => h.colSpan > 1)) return;

  // Zaten hazirsa yalniz eksik tutamaclari tamamla (React yeniden cizerse silinmis olabilir).
  const anahtar = tablo.dataset.sutunAnahtar ?? tabloAnahtari(tablo, basliklar);
  tablo.dataset.sutunAnahtar = anahtar;

  basliklar.forEach((h, i) => {
    if (h.querySelector(":scope > .sutun-tutamac")) return;
    h.classList.add("sutun-th");
    const t = document.createElement("span");
    t.className = "sutun-tutamac";
    t.setAttribute("role", "separator");
    t.setAttribute("aria-label", "Sütun genişliğini ayarla");
    t.title = "Sürükleyerek genişliği ayarlayın (çift tıklayınca sıfırlanır)";
    h.appendChild(t);

    t.addEventListener("click", (e) => e.stopPropagation());
    t.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      sifirla(tablo, basliklar, anahtar);
    });
    t.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Ilk kullanimda tum sutunlarin o anki genisligi sabitlenir.
      let genislikler = basliklar.map((x) => x.getBoundingClientRect().width);
      genislikleriUygula(tablo, basliklar, genislikler);
      const baslangicX = e.clientX;
      const baslangicGenislik = genislikler[i];
      t.setPointerCapture(e.pointerId);
      t.classList.add("aktif");
      const tasi = (ev: PointerEvent) => {
        const yeni = Math.max(EN_AZ, Math.round(baslangicGenislik + ev.clientX - baslangicX));
        genislikler = genislikler.map((g, k) => (k === i ? yeni : g));
        genislikleriUygula(tablo, basliklar, genislikler);
      };
      const bitir = () => {
        t.classList.remove("aktif");
        t.removeEventListener("pointermove", tasi);
        t.removeEventListener("pointerup", bitir);
        t.removeEventListener("pointercancel", bitir);
        kaydet(anahtar, genislikler);
      };
      t.addEventListener("pointermove", tasi);
      t.addEventListener("pointerup", bitir);
      t.addEventListener("pointercancel", bitir);
    });
  });

  if (!tablo.classList.contains("sutun-ayarli")) {
    const kayitli = oku(anahtar, basliklar.length);
    if (kayitli) genislikleriUygula(tablo, basliklar, kayitli);
  }
}

export function SutunBoyutlandirici() {
  useEffect(() => {
    let zamanlayici: ReturnType<typeof setTimeout> | undefined;
    const tara = () => document.querySelectorAll("table").forEach((t) => tabloyuHazirla(t as HTMLTableElement));
    const gozlemci = new MutationObserver(() => {
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(tara, 120);
    });
    gozlemci.observe(document.body, { childList: true, subtree: true });
    tara();
    return () => {
      gozlemci.disconnect();
      clearTimeout(zamanlayici);
    };
  }, []);
  return null;
}
