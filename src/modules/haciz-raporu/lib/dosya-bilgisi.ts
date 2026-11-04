// Haciz raporunun dosya basligi/muvekkil bilgisi: rapor Kokpit'teki bir
// dosyaya bagliysa ondan, "Kokpit'te yok" secildiyse serbest metinden gelir.
type DosyaliRapor = {
  kokpitteOlmayanDosya: string | null;
  davaDosyasi: {
    dosyaNo: string | null;
    konu: string;
    muvekkiller: { musteri: { adSoyadUnvan: string } }[];
  } | null;
};

export function hacizDosyaBasligi(rapor: DosyaliRapor): string {
  if (!rapor.davaDosyasi) return `${rapor.kokpitteOlmayanDosya ?? "—"} (Kokpit'te kayıtlı değil)`;
  return `${rapor.davaDosyasi.dosyaNo ? `${rapor.davaDosyasi.dosyaNo} — ` : ""}${rapor.davaDosyasi.konu}`;
}

export function hacizMuvekkilleri(rapor: DosyaliRapor): string {
  return rapor.davaDosyasi?.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—";
}
