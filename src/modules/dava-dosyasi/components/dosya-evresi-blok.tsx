"use client";

import { useState } from "react";
import type { DosyaEvresi } from "@prisma/client";
import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { dosyaEvresiGuncelle } from "@/modules/dava-dosyasi/lib/actions";
import { DOSYA_EVRELERI, DOSYA_EVRESI_ETIKETLERI, DOSYA_EVRESI_ACIKLAMALARI } from "@/modules/dava-dosyasi/lib/sabitler";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

function tarihGirdiDegeri(tarih: Date | null): string {
  return tarih ? tarih.toISOString().slice(0, 10) : "";
}

// Dava detay ekraninin ILK blogu: "Dosya su an nerede?" sorusuna tek
// bakista cevap. Karar Sonrasi Takip'in TEK veri kaynagi burasi -
// DavaDosyasi'nin kendi alanlari, ayri bir tablo yok (bkz.
// ARCHITECTURE.md).
export function DosyaEvresiBlok({
  davaDosyasiId,
  dosyaEvresi,
  evreDegisiklikTarihi,
  sonrakiKontrolTarihi,
  sonrakiKontrolSorusu,
  sonKontrolTarihi,
  sonKontrolSonucu,
}: {
  davaDosyasiId: string;
  dosyaEvresi: DosyaEvresi | null;
  evreDegisiklikTarihi: Date | null;
  sonrakiKontrolTarihi: Date | null;
  sonrakiKontrolSorusu: string | null;
  sonKontrolTarihi: Date | null;
  sonKontrolSonucu: string | null;
}) {
  const [duzenlemeAcikMi, setDuzenlemeAcikMi] = useState(false);

  if (duzenlemeAcikMi) {
    return (
      <div className="glass rounded-2xl p-4">
        <form
          action={async (formData) => {
            await dosyaEvresiGuncelle(davaDosyasiId, formData);
            setDuzenlemeAcikMi(false);
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Alan>
            <Etiket htmlFor="dosyaEvresi">Dosya Evresi</Etiket>
            <Secim id="dosyaEvresi" name="dosyaEvresi" defaultValue={dosyaEvresi ?? ""}>
              <option value="">— Belirlenmedi —</option>
              {DOSYA_EVRELERI.map((e) => (
                <option key={e.deger} value={e.deger}>
                  {e.etiket}
                </option>
              ))}
            </Secim>
          </Alan>
          <div />
          <Alan>
            <Etiket htmlFor="sonrakiKontrolTarihi">Sonraki Kontrol Tarihi</Etiket>
            <Girdi
              id="sonrakiKontrolTarihi"
              name="sonrakiKontrolTarihi"
              type="date"
              defaultValue={tarihGirdiDegeri(sonrakiKontrolTarihi)}
            />
          </Alan>
          <Alan>
            <Etiket htmlFor="sonrakiKontrolSorusu">Sonraki Kontrol Sorusu</Etiket>
            <Girdi
              id="sonrakiKontrolSorusu"
              name="sonrakiKontrolSorusu"
              placeholder='ör. "İstinaftan karar geldi mi?"'
              defaultValue={sonrakiKontrolSorusu ?? ""}
            />
          </Alan>
          <Alan>
            <Etiket htmlFor="sonKontrolTarihi">Son Kontrol Tarihi</Etiket>
            <Girdi id="sonKontrolTarihi" name="sonKontrolTarihi" type="date" defaultValue={tarihGirdiDegeri(sonKontrolTarihi)} />
          </Alan>
          <div className="sm:col-span-2">
            <Alan>
              <Etiket htmlFor="sonKontrolSonucu">Son Kontrolde Ne Görüldü</Etiket>
              <MetinAlani id="sonKontrolSonucu" name="sonKontrolSonucu" rows={2} defaultValue={sonKontrolSonucu ?? ""} />
            </Alan>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Dugme type="submit">Kaydet</Dugme>
            <Dugme type="button" varyant="ikincil" onClick={() => setDuzenlemeAcikMi(false)}>
              İptal
            </Dugme>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/40">Dosya Evresi</p>
          {dosyaEvresi ? (
            <>
              <p className="mt-1 text-lg font-semibold text-white">{DOSYA_EVRESI_ETIKETLERI[dosyaEvresi]}</p>
              <p className="text-sm text-white/55">{DOSYA_EVRESI_ACIKLAMALARI[dosyaEvresi]}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-white/40">Bu dosya için henüz bir evre belirlenmedi.</p>
          )}
        </div>
        <Dugme type="button" varyant="ikincil" onClick={() => setDuzenlemeAcikMi(true)}>
          {dosyaEvresi ? "Evreyi Güncelle" : "Evre Belirle"}
        </Dugme>
      </div>
      {(evreDegisiklikTarihi || sonrakiKontrolTarihi) && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/45">
          {evreDegisiklikTarihi && <span>Son değişiklik: {tarihFormatlayici.format(evreDegisiklikTarihi)}</span>}
          {sonrakiKontrolTarihi && (
            <span>
              Sonraki kontrol: {tarihFormatlayici.format(sonrakiKontrolTarihi)}
              {sonrakiKontrolSorusu && ` — "${sonrakiKontrolSorusu}"`}
            </span>
          )}
        </div>
      )}
      {sonKontrolSonucu && (
        <p className="mt-2 text-xs text-white/40">
          Son kontrol{sonKontrolTarihi ? ` (${tarihFormatlayici.format(sonKontrolTarihi)})` : ""}: {sonKontrolSonucu}
        </p>
      )}
    </div>
  );
}
