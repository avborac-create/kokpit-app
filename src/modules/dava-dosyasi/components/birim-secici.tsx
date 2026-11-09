"use client";

import { useState, useTransition } from "react";
import { Secim, Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { adliBirimEkle } from "../lib/adli-birim";
import { ADLIYELER, BIRIM_TURLERI, birimAdiOlustur } from "../lib/adli-birim-sabitleri";

// Turkce harfleri sadelestirir ("İstanbul" ile "istanbul", "ş" ile "s" ayni sayilir).
function sadelestir(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

// "Istanbul Anadolu 16. Sulh Hukuk Mahkemesi" -> adliye / birim no / birim tipi. Dosyada birim yine tek
// yazi olarak saklanir; parcalar yalnizca secilen birimin altinda bilgi olarak gosterilir.
function birimAyristir(ad: string): { adliye: string; no: string | null; tip: string } | null {
  const adliye = [...ADLIYELER]
    .filter((a) => ad.startsWith(a + " "))
    .sort((a, b) => b.length - a.length)[0];
  if (!adliye) {
    // Elle yazilmis adliye: birim turunden geriye dogru ayristir.
    const tur = [...BIRIM_TURLERI].sort((a, b) => b.ad.length - a.ad.length).find((t) => ad.endsWith(" " + t.ad));
    if (!tur) return null;
    const bas = ad.slice(0, ad.length - tur.ad.length - 1);
    const m2 = bas.match(/^(.+?)\s+(\d{1,3})\.$/);
    return m2 ? { adliye: m2[1], no: m2[2], tip: tur.ad } : { adliye: bas, no: null, tip: tur.ad };
  }
  const kalan = ad.slice(adliye.length + 1);
  const m = kalan.match(/^(\d{1,3})\.\s+(.+)$/);
  return { adliye, no: m ? m[1] : null, tip: m ? m[2] : kalan };
}

// Mahkeme/icra dairesi adi yazilmaz, katalogdan secilir. Katalogda yoksa
// adliye + tur + sira numarasi secilerek eklenir; ad UYAP yazimiyla sistem kurar.
export function BirimSecici({ birimler, varsayilan }: { birimler: string[]; varsayilan: string }) {
  const [liste, setListe] = useState(birimler);
  const [secili, setSecili] = useState(varsayilan);
  // Arama kutusu: yazdikca liste suzulur (kelimelerin hepsi adda gecmeli: "ist 19 icra").
  const [girdi, setGirdi] = useState(varsayilan);
  const [listeAcik, setListeAcik] = useState(false);
  const [vurgu, setVurgu] = useState(0);
  const [acik, setAcik] = useState(false);
  const [adliye, setAdliye] = useState("");
  const [tur, setTur] = useState("");
  const [sira, setSira] = useState("");
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();

  const turBilgisi = BIRIM_TURLERI.find((t) => t.ad === tur);
  const onizleme =
    adliye && tur && (!turBilgisi?.numarali || /^\d{1,3}$/.test(sira))
      ? birimAdiOlustur(adliye, tur, turBilgisi?.numarali ? Number(sira) : null)
      : "";
  const eskiDeger = secili && !liste.includes(secili);
  const kelimeler = sadelestir(girdi).split(/\s+/).filter(Boolean);
  const aramaYapiliyor = girdi !== secili;
  const sonuclar = aramaYapiliyor && kelimeler.length > 0 ? liste.filter((b) => kelimeler.every((k) => sadelestir(b).includes(k))) : liste;

  // Listede olmayan bir birim yazildiginda "Eklemek ister misiniz?" satiri: yeni birim panelini acar ve
  // yazidan tanidigi adliye / tur / sira numarasini onceden doldurur (hepsini kullanici onaylar).
  const parcalar = secili ? birimAyristir(secili) : null;

  function yeniBirimOner() {
    const duz = sadelestir(girdi);
    const enUzun = <T,>(adaylar: T[], ad: (t: T) => string) =>
      adaylar.filter((t) => duz.includes(sadelestir(ad(t)))).sort((a, b) => ad(b).length - ad(a).length)[0];
    const bulunanAdliye = enUzun([...ADLIYELER], (a) => a);
    const bulunanTur = enUzun(BIRIM_TURLERI, (t) => t.ad);
    const bulunanSira = girdi.match(/\d{1,3}/)?.[0];
    setAdliye(bulunanAdliye ?? "");
    setTur(bulunanTur?.ad ?? "");
    setSira(bulunanTur?.numarali && bulunanSira ? bulunanSira : "");
    setHata("");
    setAcik(true);
    setListeAcik(false);
  }

  function sec(birim: string) {
    setSecili(birim);
    setGirdi(birim);
    setListeAcik(false);
  }

  function ekle() {
    setHata("");
    basla(async () => {
      const sonuc = await adliBirimEkle(adliye, tur, sira);
      if ("hata" in sonuc) {
        setHata(sonuc.hata);
        return;
      }
      setListe((onceki) => (onceki.includes(sonuc.ad) ? onceki : [...onceki, sonuc.ad].sort((a, b) => a.localeCompare(b, "tr"))));
      sec(sonuc.ad);
      setAcik(false);
      setAdliye("");
      setTur("");
      setSira("");
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input type="hidden" name="birimAdi" value={secili} />
        <Girdi
          id="birimAdi"
          role="combobox"
          aria-expanded={listeAcik}
          aria-controls="birim-listesi"
          autoComplete="off"
          placeholder="Birim seçin ya da yazarak arayın…"
          value={girdi}
          onFocus={(e) => {
            setListeAcik(true);
            setVurgu(0);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            const yeni = e.target.value;
            setGirdi(yeni);
            setListeAcik(true);
            setVurgu(0);
            // Yazilan, listedeki bir birimle birebir ayniysa dogrudan secilir; degilse secim bosalir.
            setSecili(liste.includes(yeni) ? yeni : "");
          }}
          onBlur={() => {
            setListeAcik(false);
            // Listeden secilmemis yazi birakilmaz: secili birime (yoksa bos) donulur.
            setGirdi(secili);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setListeAcik(true);
              setVurgu((v) => Math.min(v + 1, sonuclar.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setVurgu((v) => Math.max(v - 1, 0));
            } else if (e.key === "Enter") {
              // Enter formu gondermesin; liste aciksa vurgulanan birim secilir.
              e.preventDefault();
              if (listeAcik && sonuclar[vurgu]) sec(sonuclar[vurgu]);
              else if (listeAcik && girdi.trim()) yeniBirimOner();
            } else if (e.key === "Escape") {
              setListeAcik(false);
              setGirdi(secili);
            }
          }}
        />
        {eskiDeger && <p className="mt-1 text-xs text-[#f3d9a8]">Bu birim katalogda yok; listeden seçerek değiştirin.</p>}
        {parcalar && (
          <dl className="mt-2 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 text-sm sm:grid-cols-3">
            {[
              ["Adalet Sarayı", parcalar.adliye],
              ["Birim No", parcalar.no ? `${parcalar.no}.` : "Numarasız"],
              ["Birim Tipi", parcalar.tip],
            ].map(([etiket, deger]) => (
              <div key={etiket} className="min-w-0 bg-[var(--yuzey,#1c2432)] px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">{etiket}</dt>
                <dd className={`break-words font-semibold ${deger === "Numarasız" ? "font-medium text-white/50" : "text-white"}`}>{deger}</dd>
              </div>
            ))}
          </dl>
        )}
        {listeAcik && (
          <ul
            id="birim-listesi"
            role="listbox"
            className="popover absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/15 bg-[var(--yuzey,#1c2432)] py-1 shadow-2xl"
          >
            {sonuclar.length === 0 && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  yeniBirimOner();
                }}
                className="cursor-pointer px-3 py-2 text-sm text-white/70 hover:bg-white/10"
              >
                “{girdi.trim()}” listede yok. <span className="font-semibold text-[var(--link)]">Yeni birim olarak eklemek ister misiniz?</span>
              </li>
            )}
            {sonuclar.map((b, i) => (
              <li
                key={b}
                role="option"
                aria-selected={b === secili}
                // mousedown: girdi blur olmadan secim yapilsin.
                onMouseDown={(e) => {
                  e.preventDefault();
                  sec(b);
                }}
                onMouseEnter={() => setVurgu(i)}
                className={`cursor-pointer px-3 py-1.5 text-sm text-white/90 ${i === vurgu ? "bg-white/10" : ""} ${b === secili ? "font-semibold text-[var(--link)]" : ""}`}
              >
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!acik ? (
        <button type="button" onClick={() => setAcik(true)} className="text-sm text-[var(--link)] hover:underline">
          + Yeni birim ekle
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <Girdi
            list="adliye-onerileri"
            autoComplete="off"
            placeholder="Adliye seçin ya da yazın (ör. Bakırköy)"
            aria-label="Adliye"
            value={adliye}
            onChange={(e) => setAdliye(e.target.value)}
          />
          <datalist id="adliye-onerileri">
            {ADLIYELER.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          <Secim value={tur} onChange={(e) => setTur(e.target.value)} aria-label="Birim türü">
            <option value="">Birim türü seçin…</option>
            {BIRIM_TURLERI.map((t) => (
              <option key={t.ad} value={t.ad}>
                {t.ad}
              </option>
            ))}
          </Secim>
          {turBilgisi?.numarali && (
            <Girdi
              inputMode="numeric"
              placeholder="Sıra numarası (ör. 19) - numarasızsa boş bırakın"
              aria-label="Sıra numarası"
              value={sira}
              onChange={(e) => setSira(e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          )}
          {onizleme && (
            <p className="text-sm text-white/70">
              Eklenecek ad: <b className="text-white">{onizleme}</b>
            </p>
          )}
          {hata && <p className="text-xs text-[#ff7a70]">{hata}</p>}
          <div className="flex gap-2">
            <Dugme type="button" onClick={ekle} disabled={!onizleme || bekliyor}>
              {bekliyor ? "Ekleniyor…" : "Ekle ve seç"}
            </Dugme>
            <Dugme type="button" varyant="ikincil" onClick={() => setAcik(false)}>
              Vazgeç
            </Dugme>
          </div>
        </div>
      )}
    </div>
  );
}
