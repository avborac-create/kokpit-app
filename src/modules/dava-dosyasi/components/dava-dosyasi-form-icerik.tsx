"use client";

import { useActionState } from "react";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { FormKarti } from "@/core/ui/form-karti";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import type { DavaDosyasiSonucu } from "@/modules/dava-dosyasi/lib/actions";
import { MuvekkilSecici } from "./muvekkil-secici";
import { UyusmazlikTuruSecici } from "./uyusmazlik-turu-secici";
import { KarsiTarafEkleyici } from "./karsi-taraf-ekleyici";
import { DosyaSinifiAlanlari } from "./dosya-sinifi-alanlari";
import { TalepSonucuListesi } from "./talep-sonucu-listesi";
import { DavaDosyasiSekmeleri } from "./dava-dosyasi-sekmeleri";
import { DosyaKimligiAlanlari } from "./dosya-kimligi-alanlari";

type Secenek = { id: string; etiket: string; ustId?: string | null };

type DosyaDegerleri = {
  buroNo: string | null;
  dosyaNo: string | null;
  birimAdi: string | null;
  davaKonusu?: string | null;
  hukukiIliskiTuruId: string | null;
  davaTuruId: string | null;
  turId?: string | null;
  yargiKoluId?: string | null;
  muvekkilSifati?: "ALACAKLI" | "BORCLU" | "DIGER";
  muvekkilSifatiDiger?: string | null;
  muvekkilSifatiId?: string | null;
  talepSonucu: string | null;
  durusmaTarihi: Date | null;
  surum?: number;
};

// Hangi alanin hangi kartta gorunecegini sabitler - admin panelinden
// (Ayarlar > Form Duzeni) degisen sadece bir kart ICINDEKI goreceli sira,
// kartin kendisi degil (bkz. eski dava-dosyasi-formu.tsx'teki ayni desen,
// simdi cok daha az alanla).
// Acilista yalniz muvekkil, karsi taraf, dosya sinifi, birim ve dosya no
// istenir; gerisi "Ek bilgiler" altinda opsiyoneldir (dosya detayindan da
// sonradan girilebilir).
const KARTLAR: { baslik: string; alanlar: string[]; ekBilgi?: boolean }[] = [
  { baslik: "İçerik Bilgileri", alanlar: ["hukukiIliskiTuruId", "davaKonusu", "davaTuruId", "talepSonucu"] },
  {
    baslik: "Ek Bilgiler (isteğe bağlı)",
    alanlar: ["buroNo"],
    ekBilgi: true,
  },
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
  hukukDallari,
  hukukiIliskiTurleri,
  muvekkilSifatlari,
  davaTurleri,
  dosyaTurleri,
  yargiKollari,
  dosya,
  dosyaId,
  baslangicKarsiTaraflar,
  alanSirasi,
  etiketler,
  yoneticiMi,
}: {
  yoneticiMi: boolean;
  action: (oncekiDurum: DavaDosyasiSonucu, formData: FormData) => Promise<DavaDosyasiSonucu>;
  gonderButonuMetni: string;
  dosyaId?: string;
  musteriler: { id: string; adSoyadUnvan: string }[];
  seciliIdler: string[];
  hukukDallari: { id: string; etiket: string }[];
  hukukiIliskiTurleri: Secenek[];
  muvekkilSifatlari: { id: string; etiket: string; kod: string }[];
  davaTurleri: Secenek[];
  dosyaTurleri: (Secenek & { kod: string })[];
  yargiKollari: (Secenek & { kod: string })[];
  dosya?: DosyaDegerleri;
  baslangicKarsiTaraflar: { id: string; ad: string; tc?: string | null }[];
  alanSirasi: string[];
  // "Paneli düzenle" ile degistirilmis baslik/etiketler (dosya detayindaki
  // kartlarla ayni anahtarlar, boylece bir yerde degisen ad formda da degisir).
  etiketler: Record<string, string>;
}) {
  const bilgi = (alan: string, varsayilan: string) =>
    etiketler[`dosya-detay.dosya-bilgileri.alan.${alan}`] ?? varsayilan;
  const talep = (alan: string, varsayilan: string) =>
    etiketler[`dosya-detay.talep-durusma.alan.${alan}`] ?? varsayilan;
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
      <UyusmazlikTuruSecici
        etiket={bilgi("hukukiIliskiTuruId", "Davanın Konusu (Maddi Hak)")}
        dallar={hukukDallari}
        turler={hukukiIliskiTurleri}
        varsayilanId={g?.hukukiIliskiTuruId ?? dosya?.hukukiIliskiTuruId ?? ""}
        varsayilanYeniEtiket={g?.yeniHukukiIliskiTuruEtiketi}
        yoneticiMi={yoneticiMi}
      />
    ),
    davaTuruId: () => (
      <UyusmazlikTuruSecici
        turler={davaTurleri}
        varsayilanId={g?.davaTuruId ?? dosya?.davaTuruId ?? ""}
        varsayilanYeniEtiket={g?.yeniDavaTuruEtiketi}
        alanAdi="davaTuruId"
        yeniAlanAdi="yeniDavaTuruEtiketi"
        etiket={bilgi("davaTuruId", "Davanın Türü (Talep Türü)")}
        yoneticiMi={yoneticiMi}
      />
    ),
    birimAdi: () => (
      <Alan>
        <Etiket htmlFor="birimAdi">{bilgi("birimAdi", "Birim Adı (Mahkeme/İcra Dairesi)")}</Etiket>
        <Girdi
          id="birimAdi"
          name="birimAdi"
          placeholder="İstanbul 19. İcra Dairesi vb."
          defaultValue={g?.birimAdi ?? dosya?.birimAdi ?? ""}
        />
      </Alan>
    ),
    davaKonusu: () => (
      <Alan>
        <Etiket htmlFor="davaKonusu">{bilgi("davaKonusu", "Konu Açıklaması (isteğe bağlı)")}</Etiket>
        <Girdi
          id="davaKonusu"
          name="davaKonusu"
          placeholder="ör. 1.000.000 TL para alacağı"
          defaultValue={g?.davaKonusu ?? dosya?.davaKonusu ?? ""}
        />
      </Alan>
    ),
    buroNo: () => (
      <Alan>
        <Etiket htmlFor="buroNo">{bilgi("buroNo", "Objekt Büro No (BN)")}</Etiket>
        <Girdi
          id="buroNo"
          name="buroNo"
          placeholder="Büronun iç dosya numarası (ör. 8714)"
          defaultValue={g?.buroNo ?? dosya?.buroNo ?? ""}
        />
      </Alan>
    ),
    dosyaNo: () => (
      <Alan>
        <Etiket htmlFor="dosyaNo">{bilgi("dosyaNo", "Dosya Numarası")}</Etiket>
        <Girdi
          id="dosyaNo"
          name="dosyaNo"
          placeholder="Esas no vb."
          defaultValue={g?.dosyaNo ?? dosya?.dosyaNo ?? ""}
        />
      </Alan>
    ),
    talepSonucu: () => <TalepSonucuListesi baslangicMaddeler={talepMaddeleriGuncel} etiket="Talep Sonucu / Takip Miktarı" />,
  };

  // Yeni dosya acilisinda tek kart ve en az alan: muvekkil, karsi taraf,
  // tur/sifat, birim, dosya no. Digerleri dosya detayindan girilir.
  const yeniMi = !dosyaId;

  const sinifVarMi = alanSirasi.includes("dosyaSinifi");
  const sinifOzellikleri = {
    turler: dosyaTurleri,
    yargiKollari,
    varsayilanTurId: g?.turId ?? dosya?.turId ?? dosyaTurleri.find((t) => t.kod === "dava_dosyasi")?.id ?? "",
    varsayilanYargiKoluId: g?.yargiKoluId ?? dosya?.yargiKoluId ?? "",
    sifatlar: muvekkilSifatlari,
    varsayilanSifatId:
      g?.muvekkilSifatiId ??
      dosya?.muvekkilSifatiId ??
      muvekkilSifatlari.find((x) => x.kod === "alacakli")?.id ??
      "",
    varsayilanYeniSifatEtiketi: g?.yeniMuvekkilSifatiEtiketi,
    yoneticiMi,
  };

  const yeniAlanlar = alanSirasi.filter((a) => KARTLAR[0].alanlar.includes(a));
  const ekAlanlar = alanSirasi.filter((a) => KARTLAR[1].alanlar.includes(a));
  const ekDoluMu = Boolean(dosya?.buroNo);

  return (
    <form action={formAction} className="max-w-2xl" autoComplete="off">
      {/* Iyimser kilitleme: sunucu, form acildigindaki surumle karsilastirir
          (bkz. davaDosyasiGuncelle). Controlled hidden input oldugu icin
          React'in form sifirlamasindan etkilenmez. */}
      {dosya?.surum !== undefined && (
        <input type="hidden" name="surum" value={durum?.guncelSurum ?? dosya.surum} readOnly />
      )}
      {!yeniMi && <DavaDosyasiSekmeleri dosyaId={dosyaId} aktif="genel" />}
      {alanSirasi.map((a) => (
        <input key={a} type="hidden" name="gorunenAlanlar" value={a} />
      ))}
      <FormKarti baslik="1 · Taraf Bilgileri">
        <div key={anahtar}>
          <MuvekkilSecici musteriler={musteriler} seciliIdler={seciliIdlerGuncel} />
        </div>
        <KarsiTarafEkleyici baslangicKarsiTaraflar={baslangicKarsiTaraflar} />
        {sinifVarMi && (
          <div key={`${anahtar}-s`}>
            <DosyaSinifiAlanlari {...sinifOzellikleri} bolum="sifat" />
          </div>
        )}
      </FormKarti>
      <FormKarti baslik="2 · Dosya Bilgileri (Tür · Birim · Dosya No)">
        {sinifVarMi && (
          <div key={`${anahtar}-t`}>
            <DosyaSinifiAlanlari {...sinifOzellikleri} bolum="tur" />
          </div>
        )}
        <div key={`${anahtar}-k`}>
          <DosyaKimligiAlanlari
            varsayilanBirim={g?.birimAdi ?? dosya?.birimAdi ?? ""}
            varsayilanDosyaNo={g?.dosyaNo ?? dosya?.dosyaNo ?? ""}
            birimGoster={alanSirasi.includes("birimAdi")}
            dosyaNoGoster={alanSirasi.includes("dosyaNo")}
            etiketler={{
              birim: bilgi("birimAdi", "Birim (Mahkeme/İcra Dairesi)"),
              dosyaNo: bilgi("dosyaNo", "Dosya Numarası"),
            }}
          />
        </div>
      </FormKarti>
      <FormKarti baslik="3 · İçerik Bilgileri (Hukuk Dalı · Konu · Tür)">
        <div key={`${anahtar}-b`}>
          {yeniAlanlar.map((a) => (
            <div key={a}>{alanRenderHaritasi[a]?.()}</div>
          ))}
        </div>
        {!yeniMi && ekAlanlar.length > 0 && (
          <details open={ekDoluMu || Boolean(durum?.hata)} className="mt-2">
            <summary className="cursor-pointer text-sm font-medium text-white/80">Ek Bilgiler (isteğe bağlı)</summary>
            <div key={`${anahtar}-e`} className="mt-4">
              {ekAlanlar.map((a) => (
                <div key={a}>{alanRenderHaritasi[a]?.()}</div>
              ))}
            </div>
          </details>
        )}
      </FormKarti>
      {durum?.hata && <p className="mb-4 text-sm text-[#ff7a70]">{durum.hata}</p>}
      <GonderButonu>{gonderButonuMetni}</GonderButonu>
    </form>
  );
}
