"use client";

import { useActionState } from "react";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { FormKarti } from "@/core/ui/form-karti";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import type { DavaDosyasiSonucu } from "@/modules/dava-dosyasi/lib/actions";
import { MuvekkilSecici } from "./muvekkil-secici";
import { KarsiTarafEkleyici } from "./karsi-taraf-ekleyici";
import { TalepSonucuListesi } from "./talep-sonucu-listesi";
import { DavaDosyasiSekmeleri } from "./dava-dosyasi-sekmeleri";

type Secenek = { id: string; etiket: string };

type DosyaDegerleri = {
  dosyaNo: string | null;
  birimAdi: string | null;
  hukukiIliskiTuruId: string | null;
  davaTuruId: string | null;
  talepSonucu: string | null;
  durusmaTarihi: Date | null;
};

// Hangi alanin hangi kartta gorunecegini sabitler - admin panelinden
// (Ayarlar > Form Duzeni) degisen sadece bir kart ICINDEKI goreceli sira,
// kartin kendisi degil (bkz. eski dava-dosyasi-formu.tsx'teki ayni desen,
// simdi cok daha az alanla).
const KARTLAR: { baslik: string; alanlar: string[] }[] = [
  { baslik: "Dosya Bilgileri", alanlar: ["hukukiIliskiTuruId", "davaTuruId", "birimAdi", "dosyaNo"] },
  { baslik: "Talep ve Duruşma", alanlar: ["talepSonucu", "durusmaTarihi"] },
];

// DavaDosyasiFormu (sunucu bileseni) veriyi ceker, gerceklestirmeyi
// (useActionState, hata sonrasi deger geri yukleme, admin siralamasi)
// burada, istemci tarafinda yapariz - async veri cekimi ile interaktif
// form state'i ayni bilesende bir arada olamadigi icin bu ayrim sart.
export function DavaDosyasiFormIcerik({
  action,
  gonderButonuMetni,
  musteriler,
  seciliIdler,
  hukukiIliskiTurleri,
  davaTurleri,
  dosya,
  dosyaId,
  baslangicKarsiTaraflar,
  alanSirasi,
}: {
  action: (oncekiDurum: DavaDosyasiSonucu, formData: FormData) => Promise<DavaDosyasiSonucu>;
  gonderButonuMetni: string;
  dosyaId?: string;
  musteriler: { id: string; adSoyadUnvan: string }[];
  seciliIdler: string[];
  hukukiIliskiTurleri: Secenek[];
  davaTurleri: Secenek[];
  dosya?: DosyaDegerleri;
  baslangicKarsiTaraflar: { id: string; ad: string }[];
  alanSirasi: string[];
}) {
  const [durum, formAction] = useActionState(action, undefined);

  // React, action tamamlaninca (hata donse de - throw etmedigi surece)
  // uncontrolled alanlari otomatik sifirlar. Bunu asmak icin: hata sonrasi
  // "son gonderilen degerler" defaultValue olarak kullanilir VE alanlarin
  // sarildigi div'e, her yeni `durum` icin degisen bir key verilir -
  // boylece React onlari sifirlamak yerine YENIDEN MOUNT eder, dogru
  // defaultValue ile. KarsiTarafEkleyici bu sorundan ETKILENMEZ (kendi
  // React state'i var, controlled hidden input kullanir) - kasitli olarak
  // bu keyli sarmalayicinin DISINDA birakildi.
  const g = durum?.gonderilenAlanlar;
  const anahtar = durum ? JSON.stringify(durum) : "ilk";
  const seciliIdlerGuncel = durum?.gonderilenMusteriIdleri ?? seciliIdler;
  const talepMaddeleriGuncel = durum?.gonderilenTalepMaddeleri ?? dosya?.talepSonucu?.split("\n") ?? [];

  const alanRenderHaritasi: Record<string, () => React.ReactNode> = {
    hukukiIliskiTuruId: () => (
      <Alan>
        <Etiket htmlFor="hukukiIliskiTuruId">Uyuşmazlık Türü</Etiket>
        <Secim
          id="hukukiIliskiTuruId"
          name="hukukiIliskiTuruId"
          defaultValue={g?.hukukiIliskiTuruId ?? dosya?.hukukiIliskiTuruId ?? ""}
        >
          <option value="">Seçiniz…</option>
          {hukukiIliskiTurleri.map((t) => (
            <option key={t.id} value={t.id}>
              {t.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
    ),
    davaTuruId: () => (
      <Alan>
        <Etiket htmlFor="davaTuruId">Dava Türü</Etiket>
        <Secim id="davaTuruId" name="davaTuruId" required defaultValue={g?.davaTuruId ?? dosya?.davaTuruId ?? ""}>
          <option value="" disabled>
            Seçiniz…
          </option>
          {davaTurleri.map((t) => (
            <option key={t.id} value={t.id}>
              {t.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
    ),
    birimAdi: () => (
      <Alan>
        <Etiket htmlFor="birimAdi">Birim Adı (Mahkeme/İcra Dairesi)</Etiket>
        <Girdi
          id="birimAdi"
          name="birimAdi"
          placeholder="İstanbul 19. İcra Dairesi vb."
          defaultValue={g?.birimAdi ?? dosya?.birimAdi ?? ""}
        />
      </Alan>
    ),
    dosyaNo: () => (
      <Alan>
        <Etiket htmlFor="dosyaNo">Dosya Numarası</Etiket>
        <Girdi
          id="dosyaNo"
          name="dosyaNo"
          placeholder="Esas no vb."
          defaultValue={g?.dosyaNo ?? dosya?.dosyaNo ?? ""}
        />
      </Alan>
    ),
    talepSonucu: () => <TalepSonucuListesi baslangicMaddeler={talepMaddeleriGuncel} />,
    durusmaTarihi: () => (
      <Alan>
        <Etiket htmlFor="durusmaTarihi">Duruşma Tarihi</Etiket>
        <Girdi
          id="durusmaTarihi"
          name="durusmaTarihi"
          type="date"
          defaultValue={g?.durusmaTarihi ?? dosya?.durusmaTarihi?.toISOString().slice(0, 10) ?? ""}
        />
      </Alan>
    ),
  };

  return (
    <form action={formAction} className="max-w-2xl" autoComplete="off">
      <DavaDosyasiSekmeleri dosyaId={dosyaId} aktif="genel" />
      <FormKarti baslik="Taraflar">
        <div key={anahtar}>
          <MuvekkilSecici musteriler={musteriler} seciliIdler={seciliIdlerGuncel} />
        </div>
        <KarsiTarafEkleyici baslangicKarsiTaraflar={baslangicKarsiTaraflar} />
      </FormKarti>

      {KARTLAR.map((kart) => {
        const kartAlanlari = alanSirasi.filter((a) => kart.alanlar.includes(a));
        return (
          <FormKarti key={kart.baslik} baslik={kart.baslik}>
            <div key={anahtar}>
              {kartAlanlari.map((a) => (
                <div key={a}>{alanRenderHaritasi[a]?.()}</div>
              ))}
            </div>
          </FormKarti>
        );
      })}

      {durum?.hata && <p className="mb-4 text-sm text-[#ff7a70]">{durum.hata}</p>}
      <GonderButonu>{gonderButonuMetni}</GonderButonu>
    </form>
  );
}
