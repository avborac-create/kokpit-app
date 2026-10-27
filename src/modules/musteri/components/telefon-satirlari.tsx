"use client";

import { useState } from "react";
import { Etiket, Girdi, Secim } from "@/core/ui/form";

const SIFAT_ONERILERI = [
  "Firma sahibi",
  "Firma ortağı",
  "Yönetim kurulu üyesi",
  "Genel müdür",
  "Satış müdürü",
  "Muhasebe",
  "Çalışan personel",
  "Yetkili",
  "Aile yakını",
];

type Satir = { anahtar: number; telefon: string; telefonTipi: string; aidiyet: string; sifat: string };

// Her telefon numarasi icin: numara, tipi (cep / sabit), kime ait oldugu (ad
// soyad) ve sifati (listeden secilebilir ya da serbestce yazilabilir). Satir
// ekle / sil ile cogaltilir; alanlar paralel tel_* dizileri olarak gonderilir.
export function TelefonSatirlari({
  baslangic,
}: {
  baslangic: { telefon: string; telefonTipi: string | null; aidiyet: string | null; sifat: string | null }[];
}) {
  const [satirlar, setSatirlar] = useState<Satir[]>(() =>
    baslangic.map((b, i) => ({
      anahtar: i,
      telefon: b.telefon,
      telefonTipi: b.telefonTipi ?? "CEP",
      aidiyet: b.aidiyet ?? "",
      sifat: b.sifat ?? "",
    })),
  );
  const [sayac, setSayac] = useState(baslangic.length);

  const guncelle = (anahtar: number, alan: keyof Omit<Satir, "anahtar">, deger: string) =>
    setSatirlar((s) => s.map((x) => (x.anahtar === anahtar ? { ...x, [alan]: deger } : x)));

  return (
    <div className="mb-4">
      <Etiket htmlFor="tel-ekle">Telefon Rehberi</Etiket>
      <datalist id="tel-sifat-onerileri">
        {SIFAT_ONERILERI.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      {/* Tum satirlar silinse de alan gelsin ki rehber temizlenebilsin; bos numara sunucuda atlanir */}
      <input type="hidden" name="tel_no" value="" />
      <input type="hidden" name="tel_tip" value="" />
      <input type="hidden" name="tel_aidiyet" value="" />
      <input type="hidden" name="tel_sifat" value="" />
      <div className="flex flex-col gap-2">
        {satirlar.map((s) => (
          <div key={s.anahtar} className="glass grid grid-cols-1 gap-2 rounded-xl p-2 sm:grid-cols-[1fr_5.5rem_1.2fr_1fr_auto]">
            <Girdi
              name="tel_no"
              type="tel"
              placeholder="Tel No (123 123 12 12)"
              aria-label="Telefon numarası"
              value={s.telefon}
              onChange={(e) => guncelle(s.anahtar, "telefon", e.target.value)}
            />
            <Secim
              name="tel_tip"
              aria-label="Telefon tipi"
              value={s.telefonTipi}
              onChange={(e) => guncelle(s.anahtar, "telefonTipi", e.target.value)}
            >
              <option value="CEP">Cep</option>
              <option value="SABIT">Sabit</option>
            </Secim>
            <Girdi
              name="tel_aidiyet"
              placeholder="Kime ait (Ad Soyad)"
              aria-label="Numara kime ait"
              value={s.aidiyet}
              onChange={(e) => guncelle(s.anahtar, "aidiyet", e.target.value)}
            />
            <Girdi
              name="tel_sifat"
              list="tel-sifat-onerileri"
              placeholder="Sıfatı (satış müdürü…)"
              aria-label="Sıfatı"
              value={s.sifat}
              onChange={(e) => guncelle(s.anahtar, "sifat", e.target.value)}
            />
            <button
              type="button"
              onClick={() => setSatirlar((x) => x.filter((y) => y.anahtar !== s.anahtar))}
              className="rounded-xl px-3 text-sm text-[#ff7a70] hover:bg-[#ff7a70]/10"
              aria-label="Bu numarayı kaldır"
              title="Kaldır"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        id="tel-ekle"
        type="button"
        onClick={() => {
          setSatirlar((x) => [...x, { anahtar: sayac, telefon: "", telefonTipi: "CEP", aidiyet: "", sifat: "" }]);
          setSayac((n) => n + 1);
        }}
        className="mt-2 text-sm text-[#6db8ff] hover:underline"
      >
        + Numara ekle
      </button>
    </div>
  );
}
