"use client";

import { useState } from "react";
import { Etiket, Girdi, Secim } from "@/core/ui/form";
import { SecenekDuzenleyiciPenceresi } from "@/core/secenek/secenek-duzenleyici-penceresi";
import { TELEFON_YARDIMI, telefonuDuzenle } from "@/modules/musteri/lib/telefon";

type Satir = { anahtar: number; telefon: string; telefonTipi: string; aidiyet: string; sifat: string };

type SifatListesi = {
  id: string;
  degerler: { id: string; kod: string; etiket: string; aktifMi: boolean; maktuTutar: number | null }[];
};

// Her telefon numarasi icin: numara, tipi (cep / sabit), kime ait oldugu (ad
// soyad) ve sifati. Numara uluslararasi bicime ("+90 506 875 28 05") otomatik
// cevrilir, gecersizse form gonderilemez (tarayicinin dogrulama baloncugu).
// Sifat listesi veritabanindan gelir; yoneticiler listeyi yerinde duzenleyebilir.
export function TelefonSatirlari({
  baslangic,
  sifatlar,
  sifatListesi,
}: {
  baslangic: { telefon: string; telefonTipi: string | null; aidiyet: string | null; sifat: string | null }[];
  sifatlar: string[];
  sifatListesi?: SifatListesi | null;
}) {
  const [satirlar, setSatirlar] = useState<Satir[]>(() =>
    baslangic.map((b, i) => {
      // Eski bicimde (0506 ...) kayitli numaralar acilista standart bicime cevrilir.
      const duz = telefonuDuzenle(b.telefon, b.telefonTipi);
      return { b, duz, i };
    }).map(({ b, duz, i }) => ({
      anahtar: i,
      telefon: "hata" in duz ? b.telefon : duz.deger,
      telefonTipi: b.telefonTipi ?? ("hata" in duz ? null : duz.tip) ?? "CEP",
      aidiyet: b.aidiyet ?? "",
      sifat: b.sifat ?? "",
    })),
  );
  const [sayac, setSayac] = useState(baslangic.length);

  const guncelle = (anahtar: number, alan: keyof Omit<Satir, "anahtar">, deger: string) =>
    setSatirlar((s) => s.map((x) => (x.anahtar === anahtar ? { ...x, [alan]: deger } : x)));

  // Alandan cikinca: numarayi standart bicime cevir, tipi otomatik sec, hata varsa gonderimi engelle.
  function dogrula(anahtar: number, girdi: HTMLInputElement, tip: string) {
    if (girdi.value.trim() === "") {
      girdi.setCustomValidity("");
      return;
    }
    const sonuc = telefonuDuzenle(girdi.value, tip);
    if ("hata" in sonuc) {
      girdi.setCustomValidity(sonuc.hata);
      return;
    }
    girdi.setCustomValidity("");
    setSatirlar((s) =>
      s.map((x) => (x.anahtar === anahtar ? { ...x, telefon: sonuc.deger, telefonTipi: sonuc.tip ?? x.telefonTipi } : x)),
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2">
        <Etiket htmlFor="tel-ekle">Telefon Rehberi</Etiket>
        {sifatListesi && (
          <SecenekDuzenleyiciPenceresi listeId={sifatListesi.id} baslik="Telefon Sıfatı" degerler={sifatListesi.degerler} />
        )}
      </div>
      <datalist id="tel-sifat-onerileri">
        {sifatlar.map((o) => (
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
          <div key={s.anahtar} className="glass flex flex-col gap-2 rounded-xl p-2">
            <div className="grid grid-cols-[1fr_6rem_auto] gap-2">
              <Girdi
                name="tel_no"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                required
                placeholder={s.telefonTipi === "SABIT" ? "+90 2XX XXX XX XX" : "+90 5XX XXX XX XX"}
                title={TELEFON_YARDIMI}
                aria-label="Telefon numarası"
                value={s.telefon}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity("");
                  guncelle(s.anahtar, "telefon", e.target.value);
                }}
                onBlur={(e) => dogrula(s.anahtar, e.currentTarget, s.telefonTipi)}
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Girdi
                name="tel_aidiyet"
                required
                placeholder="Kime ait (Ad Soyad)"
                aria-label="Numara kime ait"
                value={s.aidiyet}
                onChange={(e) => guncelle(s.anahtar, "aidiyet", e.target.value)}
              />
              <Girdi
                name="tel_sifat"
                list="tel-sifat-onerileri"
                required
                placeholder="Sıfatı (listeden seçin ya da yazın)"
                aria-label="Sıfatı"
                value={s.sifat}
                onChange={(e) => guncelle(s.anahtar, "sifat", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-white/45">{TELEFON_YARDIMI} Her numara için kime ait olduğu ve sıfatı zorunludur.</p>
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
