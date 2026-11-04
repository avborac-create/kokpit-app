"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { FormKarti } from "@/core/ui/form-karti";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import type { DavaDosyasiSonucu } from "@/modules/dava-dosyasi/lib/actions";
import { MuvekkilSecici } from "./muvekkil-secici";
import { IcerikSiniflandirma } from "./icerik-siniflandirma";
import { KarsiTarafEkleyici, type KarsiTarafCipi } from "./karsi-taraf-ekleyici";
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
  { baslik: "İçerik Bilgileri", alanlar: ["davaTuruId", "hukukiIliskiTuruId", "talepSonucu"] },
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
  anaDosyaBilgisi,
  baslangicKarsiTaraflar,
  alanSirasi,
  etiketler,
  yoneticiMi,
  birimler,
}: {
  yoneticiMi: boolean;
  birimler: string[];
  action: (oncekiDurum: DavaDosyasiSonucu, formData: FormData) => Promise<DavaDosyasiSonucu>;
  gonderButonuMetni: string;
  dosyaId?: string;
  anaDosyaBilgisi?: { id: string; etiket: string; altOlabilir: boolean; ustOlabilir: boolean };
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

  // TASLAK KORUMASI: Form her degisiklikte tarayicinin oturum belleginde (sessionStorage) yedeklenir.
  // Sayfa herhangi bir nedenle yeniden yuklenir ya da form yeniden kurulursa (ornegin yeni surum
  // yayinlandiginda, liste duzenlerken) yazilanlar, ayrilmadan hemen sonraki ilk 8 saniyede geri yuklenir.
  // Normal bir gezinmeden sonra acilan form bos baslar. Gonderimde taslak silinir.
  const formRef = useRef<HTMLFormElement>(null);
  const [taslak, setTaslak] = useState<[string, string][] | null>(null);
  const taslakAnahtari = `kokpit_form_taslagi:${dosyaId ?? (anaDosyaBilgisi ? `yeni-alt-${anaDosyaBilgisi.id}` : "yeni")}`;
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const isaret = taslakAnahtari + ":ayrilma";
    try {
      const ayrilma = Number(sessionStorage.getItem(isaret) ?? 0);
      const ham = sessionStorage.getItem(taslakAnahtari);
      if (ham && ayrilma && Date.now() - ayrilma < 8000) {
        const geriYuklenen = JSON.parse(ham) as [string, string][];
        queueMicrotask(() => setTaslak(geriYuklenen));
      }
      sessionStorage.removeItem(isaret);
    } catch {}
    let zamanlayici: ReturnType<typeof setTimeout> | undefined;
    const kaydet = () => {
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => {
        try {
          const girdiler: [string, string][] = [];
          for (const [k, v] of new FormData(form).entries()) {
            if (typeof v === "string" && k !== "surum" && k !== "gorunenAlanlar") girdiler.push([k, v]);
          }
          sessionStorage.setItem(taslakAnahtari, JSON.stringify(girdiler));
        } catch {}
      }, 300);
    };
    const isaretle = () => {
      try {
        sessionStorage.setItem(isaret, String(Date.now()));
      } catch {}
    };
    form.addEventListener("input", kaydet);
    form.addEventListener("change", kaydet);
    // Secici bilesenlerin gizli alanlari React tarafindan degistirilir; onlar da yakalanir.
    const gozlemci = new MutationObserver(kaydet);
    gozlemci.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ["value"] });
    window.addEventListener("pagehide", isaretle);
    return () => {
      clearTimeout(zamanlayici);
      form.removeEventListener("input", kaydet);
      form.removeEventListener("change", kaydet);
      gozlemci.disconnect();
      window.removeEventListener("pagehide", isaretle);
      isaretle();
    };
  }, [taslakAnahtari]);
  const taslakDegerleri = taslak ? Object.fromEntries(taslak) : undefined;
  const taslakCipler = (() => {
    try {
      return taslakDegerleri?.karsiTarafTaslagi ? (JSON.parse(taslakDegerleri.karsiTarafTaslagi) as KarsiTarafCipi[]) : undefined;
    } catch {
      return undefined;
    }
  })();

  // React, action tamamlaninca (hata donse de - throw etmedigi surece)
  // uncontrolled alanlari otomatik sifirlar. Bunu asmak icin: hata sonrasi
  // "son gonderilen degerler" defaultValue olarak kullanilir VE alanlarin
  // sarildigi div'e, her yeni `durum` icin degisen bir key verilir -
  // boylece React onlari sifirlamak yerine YENIDEN MOUNT eder, dogru
  // defaultValue ile. KarsiTarafEkleyici bu sorundan ETKILENMEZ (kendi
  // React state'i var, controlled hidden input kullanir) - kasitli olarak
  // bu keyli sarmalayicinin DISINDA birakildi.
  const g = durum?.gonderilenAlanlar ?? taslakDegerleri;
  const anahtar = durum ? JSON.stringify(durum) : taslak ? "taslak" : "ilk";
  const taslaktanDegerler = (ad: string) => (taslak ?? []).filter(([k]) => k === ad).map(([, v]) => v);
  const seciliIdlerGuncel = durum?.gonderilenMusteriIdleri ?? (taslak ? taslaktanDegerler("musteriIds") : seciliIdler);
  const talepMaddeleriGuncel = durum?.gonderilenTalepMaddeleri ?? (taslak ? taslaktanDegerler("talepMaddeleri") : dosya?.talepSonucu?.split("\n") ?? []);

  // Hukuk dali + dava turu + dava konusu tek blok olarak, ilk gorunen alanin
  // yerinde cizilir (ortak dal secimini paylastiklari icin).
  const siniflandirma = () => (
    <IcerikSiniflandirma
      hukukDallari={hukukDallari}
      davaTurleri={davaTurleri}
      hukukiIliskiTurleri={hukukiIliskiTurleri}
      varsayilanDavaTuruId={g?.davaTuruId ?? dosya?.davaTuruId ?? ""}
      varsayilanKonuId={g?.hukukiIliskiTuruId ?? dosya?.hukukiIliskiTuruId ?? ""}
      varsayilanYeniTurEtiketi={g?.yeniDavaTuruEtiketi}
      varsayilanYeniKonuEtiketi={g?.yeniHukukiIliskiTuruEtiketi}
      turGoster={alanSirasi.includes("davaTuruId")}
      konuGoster={alanSirasi.includes("hukukiIliskiTuruId")}
      etiketler={{
        tur: bilgi("davaTuruId", "Dava Türü (Nasıl yürüyecek?)"),
        konu: bilgi("hukukiIliskiTuruId", "Dava Konusu (Ne hakkında?)"),
      }}
      yoneticiMi={yoneticiMi}
    />
  );

  const alanRenderHaritasi: Record<string, () => React.ReactNode> = {
    hukukiIliskiTuruId: siniflandirma,
    davaTuruId: siniflandirma,
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
    talepSonucu: () => <TalepSonucuListesi baslangicMaddeler={talepMaddeleriGuncel} etiket="Dava Değeri (Netice ve Talep — mahkemeden ne istiyoruz?)" />,
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

  const yeniAlanlar = alanSirasi
    .filter((a) => KARTLAR[0].alanlar.includes(a))
    // tur + konu tek blok: ikincisini atla
    .filter((a, i, liste) => a !== "davaTuruId" || !liste.includes("hukukiIliskiTuruId") || liste.indexOf("hukukiIliskiTuruId") > i)
    .filter((a, i, liste) => a !== "hukukiIliskiTuruId" || !liste.includes("davaTuruId") || liste.indexOf("davaTuruId") > i);
  const ekAlanlar = alanSirasi.filter((a) => KARTLAR[1].alanlar.includes(a));
  const ekDoluMu = Boolean(dosya?.buroNo);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="max-w-2xl"
      autoComplete="off"
      onSubmit={() => {
        try {
          sessionStorage.removeItem(taslakAnahtari);
        } catch {}
      }}
    >
      {anaDosyaBilgisi && (
        <fieldset className="mb-4 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2.5 text-sm text-white/90">
          <input type="hidden" name="bagliDosyaId" value={anaDosyaBilgisi.id} />
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-white/70">Bağlı dosya</legend>
          <p className="mb-2">
            Bu dosya <b>{anaDosyaBilgisi.etiket}</b> dosyasına bağlı olarak açılıyor. Müvekkil ve karşı taraf o dosyadan geldi, değiştirebilirsiniz. Yeni dosya, o dosyanın:
          </p>
          <div className="flex flex-col gap-1.5">
            {anaDosyaBilgisi.altOlabilir && (
              <label className="flex items-start gap-2">
                <input type="radio" name="baglantiRolu" value="ALT" defaultChecked className="mt-1" />
                <span><b>Alt dosyası</b> olsun (Kokpit numarası KN-x/1, /2… şeklinde verilir)</span>
              </label>
            )}
            {anaDosyaBilgisi.ustOlabilir && (
              <label className="flex items-start gap-2">
                <input type="radio" name="baglantiRolu" value="ANA" defaultChecked={!anaDosyaBilgisi.altOlabilir} className="mt-1" />
                <span><b>Üst (ana) dosyası</b> olsun (mevcut dosya bunun altına girer, numarası KN-yeni/1 görünür)</span>
              </label>
            )}
            <label className="flex items-start gap-2">
              <input type="radio" name="baglantiRolu" value="BILMIYORUM" defaultChecked={!anaDosyaBilgisi.altOlabilir && !anaDosyaBilgisi.ustOlabilir} className="mt-1" />
              <span><b>Yalnız bağlı</b> olsun (alt / üst sonra belirlenir)</span>
            </label>
          </div>
        </fieldset>
      )}
      {taslak && !durum && (
        <p className="mb-4 rounded-xl border border-[#32d74b]/30 bg-[#32d74b]/10 px-3 py-2 text-sm text-[#9be8a8]">
          Sayfa yenilendi; yazdıklarınız korundu ve geri yüklendi.
        </p>
      )}
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
        {sinifVarMi && (
          <div key={`${anahtar}-s`}>
            <DosyaSinifiAlanlari {...sinifOzellikleri} bolum="sifat" />
          </div>
        )}
        <KarsiTarafEkleyici key={taslak ? "taslak" : "ilk"} baslangicKarsiTaraflar={baslangicKarsiTaraflar} taslakCipler={taslakCipler} />
      </FormKarti>
      <FormKarti baslik="2 · Dosya Bilgileri">
        {sinifVarMi && (
          <div key={`${anahtar}-t`}>
            <DosyaSinifiAlanlari {...sinifOzellikleri} bolum="tur" />
          </div>
        )}
        <div key={`${anahtar}-k`}>
          <DosyaKimligiAlanlari
            varsayilanBirim={g?.birimAdi ?? dosya?.birimAdi ?? ""}
            birimler={birimler}
            varsayilanDosyaNo={g?.dosyaNo ?? dosya?.dosyaNo ?? ""}
            birimGoster={alanSirasi.includes("birimAdi")}
            dosyaNoGoster={alanSirasi.includes("dosyaNo")}
            etiketler={{
              birim: bilgi("birimAdi", "Birim"),
              dosyaNo: bilgi("dosyaNo", "Dosya Numarası"),
            }}
          />
        </div>
      </FormKarti>
      <FormKarti baslik="3 · İçerik Bilgileri">
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
