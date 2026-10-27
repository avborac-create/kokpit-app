"use client";

import { useEffect } from "react";
import { baslikDuzeni, cumleDuzeni } from "@/core/metin/bicim";

// Alandan çıkınca (blur) metin biçimi ekranda hemen düzelir. Kurallar sunucudaki
// yazma düzeniyle (src/core/db/metin-duzeni.ts) aynı fonksiyonları kullanır; sunucu
// yine de yazarken düzeltir, burası yalnızca kullanıcıya sonucu önceden gösterir.
// Elle belirtmek için alana data-metin-duzeni="baslik" | "cumle" | "yok" verilir.
const BASLIK_ALANLARI = new Set(["adSoyad", "adSoyadUnvan", "unvanGorev", "birimAdi", "birim"]);
const CUMLE_ALANLARI = new Set([
  "notlar", "aciklama", "konuBasligi", "davaKonusu", "suc", "adres", "baslik", "dayanak",
  "odemePlani", "basariPrimi", "avukatGorusu", "islemYapilanBorclular", "talepMaddeleri",
  "sonrakiKontrolSorusu", "sonKontrolSonucu",
]);
const METIN_TIPLERI = new Set(["text", "search", ""]);

function kuralBul(el: HTMLInputElement | HTMLTextAreaElement) {
  const acik = el.closest<HTMLElement>("[data-metin-duzeni]")?.dataset.metinDuzeni;
  if (acik === "yok") return null;
  if (acik === "baslik") return baslikDuzeni;
  if (acik === "cumle") return cumleDuzeni;
  if (el instanceof HTMLInputElement && !METIN_TIPLERI.has(el.type)) return null;
  if (BASLIK_ALANLARI.has(el.name)) return baslikDuzeni;
  if (CUMLE_ALANLARI.has(el.name)) return cumleDuzeni;
  return null;
}

export function MetinDuzeniDinleyici() {
  useEffect(() => {
    const cikinca = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      const kural = kuralBul(el);
      if (!kural || !el.value) return;
      const yeni = kural(el.value);
      if (yeni === el.value) return;
      // React'in kontrollü alanları da görsün diye yerel setter + input olayı.
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, yeni);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    document.addEventListener("focusout", cikinca);
    return () => document.removeEventListener("focusout", cikinca);
  }, []);
  return null;
}
