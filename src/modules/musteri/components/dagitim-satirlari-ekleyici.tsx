"use client";

import { useState } from "react";
import { Alan, Etiket, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";

type Kume = { id: string; ad: string };
type Dosya = { id: string; konu: string; uyusmazlikGrubuId: string | null };
type KullanimAmaci = { id: string; etiket: string };

type Satir = { anahtar: number; kumeId: string; dosyaId: string; amaciId: string; tutar: string };

// "Müvekkilden Para Geldi" kaydının tek bir Dosya Kümesine değil, birden
// fazla kümeye/kullanım amacına bölünebilmesi için (bkz. ARCHITECTURE.md,
// gerçek örnek: 172.984,89 TL tahsilat -> 43.984,89 TL geçmiş masraf +
// 114.000 TL vekalet ücreti + 15.000 TL dosya avansı, farklı kümelere).
// Kayıt, dağıtım satırı hiç eklenmeden de kaydedilebilir (kümesiz genel
// tahsilat) - sonradan düzenleme ekranından satır eklenebilir.
export function DagitimSatirlariEkleyici({
  kumeler,
  dosyalar,
  kullanimAmaclari,
  baslangicSatirlari = [],
}: {
  kumeler: Kume[];
  dosyalar: Dosya[];
  kullanimAmaclari: KullanimAmaci[];
  baslangicSatirlari?: { kumeId: string; dosyaId: string | null; amaciId: string; tutar: number }[];
}) {
  const [sayac, setSayac] = useState(baslangicSatirlari.length);
  const [satirlar, setSatirlar] = useState<Satir[]>(() =>
    baslangicSatirlari.map((s, i) => ({
      anahtar: i,
      kumeId: s.kumeId,
      dosyaId: s.dosyaId ?? "",
      amaciId: s.amaciId,
      tutar: String(s.tutar),
    })),
  );

  function satirEkle() {
    setSatirlar((liste) => [...liste, { anahtar: sayac, kumeId: "", dosyaId: "", amaciId: "", tutar: "" }]);
    setSayac((s) => s + 1);
  }

  function satirKaldir(anahtar: number) {
    setSatirlar((liste) => liste.filter((s) => s.anahtar !== anahtar));
  }

  function satirGuncelle(anahtar: number, alan: keyof Omit<Satir, "anahtar">, deger: string) {
    setSatirlar((liste) => liste.map((s) => (s.anahtar === anahtar ? { ...s, [alan]: deger } : s)));
  }

  const dagitilanToplam = satirlar.reduce((t, s) => t + (Number(s.tutar) || 0), 0);

  return (
    <div className="col-span-2 md:col-span-4">
      <p className="mb-2 block text-sm font-medium text-white/70">
        Dağıtım Satırları <span className="font-normal text-white/40">(opsiyonel — boş bırakıp sonradan da ekleyebilirsiniz)</span>
      </p>
      <div className="flex flex-col gap-3">
        {satirlar.map((satir) => {
          const kumeDosyalari = dosyalar.filter((d) => d.uyusmazlikGrubuId === satir.kumeId);
          return (
            <div key={satir.anahtar} className="glass grid grid-cols-1 gap-2 rounded-xl p-3 sm:grid-cols-4">
              <Alan>
                <Etiket htmlFor={`dagitimKume-${satir.anahtar}`}>Dosya Kümesi</Etiket>
                <Secim
                  id={`dagitimKume-${satir.anahtar}`}
                  name="dagitimKumeId"
                  required
                  value={satir.kumeId}
                  onChange={(e) => satirGuncelle(satir.anahtar, "kumeId", e.target.value)}
                >
                  <option value="" disabled>
                    Seçiniz…
                  </option>
                  {kumeler.map((kume) => (
                    <option key={kume.id} value={kume.id}>
                      {kume.ad}
                    </option>
                  ))}
                </Secim>
              </Alan>
              <Alan>
                <Etiket htmlFor={`dagitimDosya-${satir.anahtar}`}>Yargısal Dosya (opsiyonel)</Etiket>
                <Secim
                  id={`dagitimDosya-${satir.anahtar}`}
                  name="dagitimDosyaId"
                  value={satir.dosyaId}
                  onChange={(e) => satirGuncelle(satir.anahtar, "dosyaId", e.target.value)}
                  disabled={!satir.kumeId}
                >
                  <option value="">— Kümenin geneli —</option>
                  {kumeDosyalari.map((dosya) => (
                    <option key={dosya.id} value={dosya.id}>
                      {dosya.konu}
                    </option>
                  ))}
                </Secim>
              </Alan>
              <Alan>
                <Etiket htmlFor={`dagitimAmaci-${satir.anahtar}`}>Kullanım Amacı</Etiket>
                <Secim
                  id={`dagitimAmaci-${satir.anahtar}`}
                  name="dagitimAmaciId"
                  required
                  value={satir.amaciId}
                  onChange={(e) => satirGuncelle(satir.anahtar, "amaciId", e.target.value)}
                >
                  <option value="" disabled>
                    Seçiniz…
                  </option>
                  {kullanimAmaclari.map((amac) => (
                    <option key={amac.id} value={amac.id}>
                      {amac.etiket}
                    </option>
                  ))}
                </Secim>
              </Alan>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Alan>
                    <Etiket htmlFor={`dagitimTutar-${satir.anahtar}`}>Tutar</Etiket>
                    <ParaGirdisi
                      id={`dagitimTutar-${satir.anahtar}`}
                      name="dagitimTutar"
                      required
                      defaultValue={satir.tutar || undefined}
                      onDegerDegisti={(deger) => satirGuncelle(satir.anahtar, "tutar", deger)}
                    />
                  </Alan>
                </div>
                <Dugme type="button" varyant="tehlike" className="mb-4" onClick={() => satirKaldir(satir.anahtar)}>
                  Kaldır
                </Dugme>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Dugme type="button" varyant="ikincil" onClick={satirEkle}>
          + Dağıtım Satırı Ekle
        </Dugme>
        {satirlar.length > 0 && (
          <span className="text-sm text-white/50">
            Dağıtılan Toplam: {dagitilanToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
          </span>
        )}
      </div>
    </div>
  );
}
