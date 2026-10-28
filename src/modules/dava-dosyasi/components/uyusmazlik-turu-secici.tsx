"use client";

import { useState } from "react";
import Link from "next/link";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { SecenekYerindeDuzenle } from "./secenek-yerinde-duzenle";
import { SecenekDuzenleyici } from "./secenek-duzenleyici";

export const MANUEL_UYUSMAZLIK_DEGERI = "__manuel__";

// Uyusmazlik turu secimi: liste + "Listede yok - elle gir" secenegi. Elle
// girilen etiket sunucuda (hukukiIliskiTuruIdCozumle, actions.ts) listeye
// KALICI olarak eklenir - bir sonraki dosyada hazir gelir. Listeyi toptan
// duzenlemek icin Ayarlar > Secenek Listeleri'ne baglanti verilir (native
// <select> icine buton konamadigi icin etiketin yaninda durur).
export function UyusmazlikTuruSecici({
  turler,
  varsayilanId,
  varsayilanYeniEtiket,
  alanAdi = "hukukiIliskiTuruId",
  yeniAlanAdi = "yeniHukukiIliskiTuruEtiketi",
  etiket = "Uyuşmazlık Türü",
  zorunlu = false,
  yoneticiMi = false,
  listeAnahtari,
  dallar,
}: {
  turler: { id: string; etiket: string; ustId?: string | null }[];
  varsayilanId: string;
  varsayilanYeniEtiket?: string;
  alanAdi?: string;
  yeniAlanAdi?: string;
  etiket?: string;
  zorunlu?: boolean;
  // Sadece admin: yerinde ad duzeltme paneli + tam liste yonetimi baglantisi.
  yoneticiMi?: boolean;
  // Ayarlar > Secenek Listeleri baglantisi icin (verilmezse alan adindan turetilir).
  listeAnahtari?: string;
  // Verilirse yazilan/secilen listenin ustunde "Hukuk Dali" filtresi cikar.
  dallar?: { id: string; etiket: string }[];
}) {
  // Zorunlu (kisa, sabit) listeler acilir menu olarak kalir; istege bagli
  // uzun listeler tek kutuda "yaz ya da listeden sec" olur.
  if (!zorunlu) {
    return (
      <YazVeSecKutusu
        turler={turler}
        varsayilanId={varsayilanId}
        varsayilanYeniEtiket={varsayilanYeniEtiket}
        alanAdi={alanAdi}
        yeniAlanAdi={yeniAlanAdi}
        etiket={etiket}
        yoneticiMi={yoneticiMi}
        listeAnahtari={listeAnahtari}
        dallar={dallar}
      />
    );
  }
  return (
    <AcilirMenuSecici
      turler={turler}
      varsayilanId={varsayilanId}
      varsayilanYeniEtiket={varsayilanYeniEtiket}
      alanAdi={alanAdi}
      yeniAlanAdi={yeniAlanAdi}
      etiket={etiket}
      zorunlu={zorunlu}
      yoneticiMi={yoneticiMi}
      listeAnahtari={listeAnahtari}
    />
  );
}

type SeciciOzellikleri = Parameters<typeof UyusmazlikTuruSecici>[0];

// Tek kutu: yazilan metin listedeki bir etiketle (buyuk/kucuk harf duyarsiz)
// eslesirse o secenek, eslesmezse yeni secenek olarak listeye eklenir -
// sunucu tarafi "__manuel__" + etiket sozlesmesiyle zaten bunu yapar.
function YazVeSecKutusu({
  turler,
  varsayilanId,
  varsayilanYeniEtiket,
  alanAdi = "hukukiIliskiTuruId",
  yeniAlanAdi = "yeniHukukiIliskiTuruEtiketi",
  etiket = "Uyuşmazlık Türü",
  yoneticiMi = false,
  listeAnahtari,
  dallar,
}: SeciciOzellikleri) {
  const baslangic =
    varsayilanYeniEtiket ?? turler.find((t) => t.id === varsayilanId)?.etiket ?? "";
  const [metin, setMetin] = useState(baslangic);
  const [dalId, setDalId] = useState(turler.find((t) => t.id === varsayilanId)?.ustId ?? "");
  const listeId = `${alanAdi}-liste`;
  // Dal secilince yalniz o dala bagli (ya da hicbir dala bagli olmayan) konular onerilir.
  const gorunenTurler = dalId ? turler.filter((t) => !t.ustId || t.ustId === dalId) : turler;

  return (
    <Alan>
      <div className="flex items-center justify-between">
        <Etiket htmlFor={yeniAlanAdi}>{etiket}</Etiket>
        {yoneticiMi && (
          <Link
            href={`/kokpit/ayarlar/secenekler?liste=${listeAnahtari ?? (alanAdi === "davaTuruId" ? "dava_turu" : "hukuki_iliski_turu")}`}
            target="_blank"
            className="text-xs text-[#6db8ff] hover:underline"
          >
            Listeyi düzenle ↗
          </Link>
        )}
      </div>
      {dallar && (
        <>
          <Secim
            value={dalId}
            onChange={(e) => setDalId(e.target.value)}
            aria-label="Hukuk Dalı"
            className="mb-2"
          >
            <option value="">Hukuk Dalı (Nerede?) — Diğer / belirtilmiyor</option>
            {dallar.map((d) => (
              <option key={d.id} value={d.id}>
                {d.etiket}
              </option>
            ))}
          </Secim>
          {yoneticiMi && (
            <SecenekDuzenleyici listeAnahtari="hukuk_dali" secenekler={dallar} baslik="Hukuk dallarını düzenle" />
          )}
          <input type="hidden" name="hukukiIliskiTuruUstId" value={dalId} readOnly />
        </>
      )}
      <input type="hidden" name={alanAdi} value={metin.trim() ? MANUEL_UYUSMAZLIK_DEGERI : ""} readOnly />
      <Girdi
        id={yeniAlanAdi}
        name={yeniAlanAdi}
        list={listeId}
        value={metin}
        onChange={(e) => setMetin(e.target.value)}
        placeholder="Yazın ya da listeden seçin…"
      />
      {yoneticiMi && (
        <SecenekDuzenleyici
          listeAnahtari={listeAnahtari ?? (alanAdi === "davaTuruId" ? "dava_turu" : "hukuki_iliski_turu")}
          secenekler={turler}
          dallar={dallar}
          baslik="Seçenekleri düzenle"
        />
      )}
      <datalist id={listeId}>
        {gorunenTurler.map((t) => (
          <option key={t.id} value={t.etiket} />
        ))}
      </datalist>
    </Alan>
  );
}

function AcilirMenuSecici({
  turler,
  varsayilanId,
  varsayilanYeniEtiket,
  alanAdi = "hukukiIliskiTuruId",
  yeniAlanAdi = "yeniHukukiIliskiTuruEtiketi",
  etiket = "Uyuşmazlık Türü",
  zorunlu = false,
  yoneticiMi = false,
  listeAnahtari,
}: SeciciOzellikleri) {
  const [secim, setSecim] = useState(varsayilanId);
  const [etiketDuzeltmeleri, setEtiketDuzeltmeleri] = useState<Record<string, string>>({});
  const manuelMi = secim === MANUEL_UYUSMAZLIK_DEGERI;
  const guncelTurler = turler.map((t) => ({ ...t, etiket: etiketDuzeltmeleri[t.id] ?? t.etiket }));

  return (
    <Alan>
      <div className="flex items-center justify-between">
        <Etiket htmlFor={alanAdi}>{etiket}</Etiket>
        {yoneticiMi && (
          <Link
            href={`/kokpit/ayarlar/secenekler?liste=${listeAnahtari ?? (alanAdi === "davaTuruId" ? "dava_turu" : "hukuki_iliski_turu")}`}
            target="_blank"
            className="text-xs text-[#6db8ff] hover:underline"
          >
            Tüm liste ↗
          </Link>
        )}
      </div>
      <Secim
        id={alanAdi}
        name={alanAdi}
        required={zorunlu}
        value={secim}
        onChange={(e) => setSecim(e.target.value)}
      >
        <option value="" disabled={zorunlu}>
          Seçiniz…
        </option>
        <option value={MANUEL_UYUSMAZLIK_DEGERI}>＋ MANUEL GİR (listede yok)</option>
        {guncelTurler.map((t) => (
          <option key={t.id} value={t.id}>
            {t.etiket}
          </option>
        ))}
      </Secim>
      {yoneticiMi && (
        <SecenekYerindeDuzenle
          secenekler={guncelTurler}
          etiketDegisti={(id, yeni) => setEtiketDuzeltmeleri((onceki) => ({ ...onceki, [id]: yeni }))}
        />
      )}
      {manuelMi && (
        <Girdi
          name={yeniAlanAdi}
          defaultValue={varsayilanYeniEtiket}
          placeholder={`${etiket} yazın (listeye de eklenir)`}
          required
          autoFocus
          className="mt-2"
        />
      )}
    </Alan>
  );
}
