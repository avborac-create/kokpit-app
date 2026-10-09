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

type Secenek = { id: string; etiket: string };

type DosyaDegerleri = {
  buroNo: string | null;
  dosyaNo: string | null;
  birimAdi: string | null;
  hukukiIliskiTuruId: string | null;
  davaTuruId: string | null;
  turId?: string | null;
  yargiKoluId?: string | null;
  muvekkilSifati?: "ALACAKLI" | "BORCLU" | "DIGER";
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
  { baslik: "Dosya Bilgileri", alanlar: ["birimAdi", "dosyaNo"] },
  {
    baslik: "Ek Bilgiler (isteğe bağlı)",
    alanlar: ["hukukiIliskiTuruId", "davaTuruId", "buroNo", "talepSonucu", "durusmaTarihi"],
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
  hukukiIliskiTurleri,
  davaTurleri,
  dosyaTurleri,
  yargiKollari,
  dosya,
  dosyaId,
  baslangicKarsiTaraflar,
  alanSirasi,
  etiketler,
}: {
  action: (oncekiDurum: DavaDosyasiSonucu, formData: FormData) => Promise<DavaDosyasiSonucu>;
  gonderButonuMetni: string;
  dosyaId?: string;
  musteriler: { id: string; adSoyadUnvan: string }[];
  seciliIdler: string[];
  hukukiIliskiTurleri: Secenek[];
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
        etiket={bilgi("hukukiIliskiTuruId", "Uyuşmazlık Türü")}
        turler={hukukiIliskiTurleri}
        varsayilanId={g?.hukukiIliskiTuruId ?? dosya?.hukukiIliskiTuruId ?? ""}
        varsayilanYeniEtiket={g?.yeniHukukiIliskiTuruEtiketi}
      />
    ),
    davaTuruId: () => (
      <UyusmazlikTuruSecici
        turler={davaTurleri}
        varsayilanId={g?.davaTuruId ?? dosya?.davaTuruId ?? ""}
        varsayilanYeniEtiket={g?.yeniDavaTuruEtiketi}
        alanAdi="davaTuruId"
        yeniAlanAdi="yeniDavaTuruEtiketi"
        etiket={bilgi("davaTuruId", "Dava Türü")}
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
    talepSonucu: () => <TalepSonucuListesi baslangicMaddeler={talepMaddeleriGuncel} etiket={talep("talepSonucu", "Talep Sonucu")} />,
    durusmaTarihi: () => (
      <Alan>
        <Etiket htmlFor="durusmaTarihi">{talep("durusmaTarihi", "Duruşma Tarihi")}</Etiket>
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
      {/* Iyimser kilitleme: sunucu, form acildigindaki surumle karsilastirir
          (bkz. davaDosyasiGuncelle). Cakisma sonrasi guncel surum gelir,
          boylece kullanici bilerek ustune yazabilir. Controlled hidden input
          oldugu icin React'in form sifirlamasindan etkilenmez. */}
      {dosya?.surum !== undefined && (
        <input type="hidden" name="surum" value={durum?.guncelSurum ?? dosya.surum} readOnly />
      )}
      <DavaDosyasiSekmeleri dosyaId={dosyaId} aktif="genel" />
      <FormKarti baslik={etiketler["dosya-detay.taraflar.baslik"] ?? "Taraflar"}>
        <div key={anahtar}>
          <MuvekkilSecici musteriler={musteriler} seciliIdler={seciliIdlerGuncel} />
        </div>
        <KarsiTarafEkleyici baslangicKarsiTaraflar={baslangicKarsiTaraflar} />
      </FormKarti>

      {alanSirasi.map((a) => (
        <input key={a} type="hidden" name="gorunenAlanlar" value={a} />
      ))}

      {alanSirasi.includes("dosyaSinifi") && (
      <FormKarti baslik="Dosya Sınıfı">
        <div key={anahtar}>
          <DosyaSinifiAlanlari
            turler={dosyaTurleri}
            yargiKollari={yargiKollari}
            varsayilanTurId={
              g?.turId ?? dosya?.turId ?? dosyaTurleri.find((t) => t.kod === "dava_dosyasi")?.id ?? ""
            }
            varsayilanYargiKoluId={g?.yargiKoluId ?? dosya?.yargiKoluId ?? ""}
            varsayilanSifat={
              ((g?.muvekkilSifati ?? dosya?.muvekkilSifati) === "BORCLU" || (g?.muvekkilSifati ?? dosya?.muvekkilSifati) === "DIGER"
                ? (g?.muvekkilSifati ?? dosya?.muvekkilSifati)
                : "ALACAKLI") as "ALACAKLI" | "BORCLU" | "DIGER"
            }
          />
        </div>
      </FormKarti>
      )}

      {KARTLAR.map((kart) => {
        const kartAlanlari = alanSirasi.filter((a) => kart.alanlar.includes(a));
        const icerik = (
          <div key={anahtar}>
            {kartAlanlari.map((a) => (
              <div key={a}>{alanRenderHaritasi[a]?.()}</div>
            ))}
          </div>
        );
        if (kartAlanlari.length === 0) return null;
        if (kart.ekBilgi) {
          // Duzenlemede dolu alan varsa ya da hata sonrasi acik kalir.
          const doluMu = Boolean(dosya?.davaTuruId || dosya?.talepSonucu || dosya?.hukukiIliskiTuruId || dosya?.buroNo || dosya?.durusmaTarihi);
          return (
            <details key={kart.baslik} open={doluMu || Boolean(durum?.hata)} className="glass mb-6 rounded-2xl p-5">
              <summary className="cursor-pointer text-sm font-medium text-white/80">{kart.baslik}</summary>
              <div className="mt-4">{icerik}</div>
            </details>
          );
        }
        return (
          <FormKarti key={kart.baslik} baslik={etiketler["dosya-detay.dosya-bilgileri.baslik"] ?? kart.baslik}>
            {icerik}
          </FormKarti>
        );
      })}

      {durum?.hata && <p className="mb-4 text-sm text-[#ff7a70]">{durum.hata}</p>}
      <GonderButonu>{gonderButonuMetni}</GonderButonu>
    </form>
  );
}
