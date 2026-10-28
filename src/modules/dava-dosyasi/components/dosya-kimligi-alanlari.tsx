"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import {
  BIRIM_HATASI,
  DOSYA_NO_TURLERI,
  birimDosyaNosuGibiMi,
  dosyaNoAyristir,
  dosyaNoBirlestir,
  yilHatasi,
} from "@/modules/dava-dosyasi/lib/dosya-kimligi";

// Birim + Dosya No tek blokta: "İstanbul 1. İş Mahkemesi · 2026 / 1 · Esas".
// Dosya no uc ayri kutudan (yil, sira, tur) kurulur ve forma tek "dosyaNo"
// metni olarak gider. Yil 4 haneli olmak zorundadir (26 yazilamaz); birim
// kutusuna numara yazilirsa kaydetmeye izin verilmez. Ayni kurallar sunucuda
// da denetlenir (bkz. dosya-kimligi.ts). Eski, bu bicime uymayan bir dosya
// no varsa duz metin kutusunda aynen gosterilir.
export function DosyaKimligiAlanlari({
  varsayilanBirim,
  varsayilanDosyaNo,
  birimGoster,
  dosyaNoGoster,
  etiketler,
}: {
  varsayilanBirim: string;
  varsayilanDosyaNo: string;
  birimGoster: boolean;
  dosyaNoGoster: boolean;
  etiketler: { birim: string; dosyaNo: string };
}) {
  const ayri = dosyaNoAyristir(varsayilanDosyaNo);
  const eskiBicim = Boolean(varsayilanDosyaNo.trim()) && !ayri;

  const [birim, setBirim] = useState(varsayilanBirim);
  const [yil, setYil] = useState(ayri?.yil ?? "");
  const [sira, setSira] = useState(ayri?.sira ?? "");
  const [tur, setTur] = useState(ayri?.tur || "Esas");
  const [eski, setEski] = useState(varsayilanDosyaNo);
  const [yilDokunuldu, setYilDokunuldu] = useState(false);

  const birimHatasi = birimDosyaNosuGibiMi(birim) ? BIRIM_HATASI : "";
  const yilHata = yil || sira ? (yilHatasi(yil) ?? "") : "";
  const siraEksik = yil && !sira ? "Sıra numarasını da girin (ör. 423)." : sira && !yil ? "Yılı da girin (ör. 2026)." : "";

  const dosyaNoDegeri = eskiBicim ? eski.trim() : yil && sira ? dosyaNoBirlestir(yil, sira, tur) : "";

  return (
    <>
      {birimGoster && (
        <Alan>
          <Etiket htmlFor="birimAdi">{etiketler.birim}</Etiket>
          <Girdi
            id="birimAdi"
            name="birimAdi"
            placeholder="İstanbul 1. İş Mahkemesi · Ankara 5. İcra Dairesi"
            value={birim}
            onChange={(e) => {
              setBirim(e.target.value);
              e.currentTarget.setCustomValidity(birimDosyaNosuGibiMi(e.target.value) ? BIRIM_HATASI : "");
            }}
            ref={(el) => el?.setCustomValidity(birimHatasi)}
          />
          {birimHatasi && <p className="mt-1 text-xs text-[#ff7a70]">{birimHatasi}</p>}
        </Alan>
      )}
      {dosyaNoGoster && (
        <Alan>
          <Etiket htmlFor="dosyaNoYil">{etiketler.dosyaNo}</Etiket>
          {eskiBicim ? (
            <>
              <Girdi value={eski} onChange={(e) => setEski(e.target.value)} aria-label="Dosya numarası (eski biçim)" />
              <p className="mt-1 text-xs text-white/45">
                Bu numara eski biçimde kayıtlı. Değiştirecekseniz yıl/sıra biçimini kullanın (ör. 2026/423 Esas).
              </p>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Girdi
                id="dosyaNoYil"
                inputMode="numeric"
                maxLength={4}
                placeholder="Yıl (2026)"
                aria-label="Dosya yılı"
                value={yil}
                onChange={(e) => setYil(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onBlur={() => setYilDokunuldu(true)}
                ref={(el) => el?.setCustomValidity(yilHata || siraEksik)}
                className="!w-28"
              />
              <span className="text-white/40">/</span>
              <Girdi
                inputMode="numeric"
                placeholder="Sıra (423)"
                aria-label="Dosya sıra numarası"
                value={sira}
                onChange={(e) => setSira(e.target.value.replace(/\D/g, ""))}
                className="!w-28"
              />
              <Secim value={tur} onChange={(e) => setTur(e.target.value)} aria-label="Dosya numarası tipi" className="!w-auto">
                {(DOSYA_NO_TURLERI as readonly string[]).includes(tur) ? null : <option value={tur}>{tur}</option>}
                {DOSYA_NO_TURLERI.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Secim>
            </div>
          )}
          {!eskiBicim && (yilDokunuldu || yil.length === 4) && (yilHata || siraEksik) && (
            <p className="mt-1 text-xs text-[#ff7a70]">{yilHata || siraEksik}</p>
          )}
          <p className="mt-1 text-sm text-white/60">Tip: Esas / Talimat / Değişik İş / Soruşturma / İhbar vs.</p>
          <input type="hidden" name="dosyaNo" value={dosyaNoDegeri} readOnly />
        </Alan>
      )}
    </>
  );
}
