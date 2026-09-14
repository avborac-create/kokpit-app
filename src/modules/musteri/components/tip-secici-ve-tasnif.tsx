"use client";

import { useState } from "react";
import { Alan, Etiket, Secim } from "@/core/ui/form";
import { TasnifGirisi } from "@/modules/musteri/components/tasnif-girisi";
import { UyusmazlikGrubuSecici } from "@/modules/musteri/components/uyusmazlik-grubu-secici";
import { DagitimSatirlariEkleyici } from "@/modules/musteri/components/dagitim-satirlari-ekleyici";

type Tip = { id: string; kod: string; etiket: string };
type CariKod = { id: string; etiket: string };
type Kume = { id: string; ad: string };
type Dosya = { id: string; konu: string; uyusmazlikGrubuId: string | null };
type KullanimAmaci = { id: string; etiket: string };

// Bu tiplerde Dosya Kumesi secimi ZORUNLU (bkz. actions.ts
// KUME_ZORUNLU_TIP_KODLARI ile birebir ayni liste - orada sunucu
// tarafinda da dogrulanir).
const KUME_ZORUNLU_TIP_KODLARI = ["masraf", "bloke_para", "akdi_vekalet", "avans_talebi"];

// Tip = tasnifin baskin turunu dogrudan ifade eder (bkz. ARCHITECTURE.md).
// "Karma" secilmedigi surece tasnif alanlarini gostermeye gerek yok -
// sunucu tarafi tutarin tamamini secilen tipe karsilik gelen tek cari koda
// otomatik yazar (bkz. paraTrafigiKaydiEkle). Tipe gore Dosya Kumesi
// alaninin ZORUNLU (tekil secici) mi, DAGITIM SATIRLARI mi ("Müvekkilden
// Para Geldi" - birden fazla kumeye bolusturme) yoksa OPSIYONEL tekil
// secici mi gosterilecegi de burada, tip secimiyle AYNI bilesende karar
// verilir (state tek yerde tutulur, kardes bilesenlere prop-drilling
// gerekmez).
export function TipSeciciVeTasnif({
  tipler,
  cariKodlar,
  kumeler,
  dosyalar,
  kullanimAmaclari,
  varsayilanTipId = "",
  varsayilanTasnif = {},
  varsayilanKumeId = "",
  varsayilanDagitimSatirlari = [],
}: {
  tipler: Tip[];
  cariKodlar: CariKod[];
  kumeler: Kume[];
  dosyalar: Dosya[];
  kullanimAmaclari: KullanimAmaci[];
  varsayilanTipId?: string;
  varsayilanTasnif?: Record<string, number>;
  varsayilanKumeId?: string;
  varsayilanDagitimSatirlari?: { kumeId: string; dosyaId: string | null; amaciId: string; tutar: number }[];
}) {
  const [tipId, setTipId] = useState(varsayilanTipId);
  const secilenTip = tipler.find((t) => t.id === tipId);
  const karmaMi = secilenTip?.kod === "karma";
  const paraGeldiMi = secilenTip?.kod === "muvekkilden_para_geldi";
  const kumeZorunluMu = secilenTip ? KUME_ZORUNLU_TIP_KODLARI.includes(secilenTip.kod) : false;

  return (
    <>
      <Alan>
        <Etiket htmlFor="tipId">Tip</Etiket>
        <Secim
          id="tipId"
          name="tipId"
          required
          value={tipId}
          onChange={(e) => setTipId(e.target.value)}
        >
          <option value="" disabled>
            Seçiniz…
          </option>
          {tipler.map((tip) => (
            <option key={tip.id} value={tip.id}>
              {tip.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      {karmaMi && <TasnifGirisi cariKodlar={cariKodlar} varsayilanDegerler={varsayilanTasnif} />}
      {paraGeldiMi ? (
        <DagitimSatirlariEkleyici
          kumeler={kumeler}
          dosyalar={dosyalar}
          kullanimAmaclari={kullanimAmaclari}
          baslangicSatirlari={varsayilanDagitimSatirlari}
        />
      ) : (
        <UyusmazlikGrubuSecici kumeler={kumeler} varsayilanKumeId={varsayilanKumeId} zorunluMu={kumeZorunluMu} />
      )}
    </>
  );
}
