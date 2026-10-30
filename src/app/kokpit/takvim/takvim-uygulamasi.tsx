"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dosyaDurusmasiniOtele } from "../takvim-actions";
import { ogeDurumuYaz, ogeKaydet, ogeKaydir, ogeSil, ogeTamamla, sirayiKaydet } from "./actions";
import { OgePenceresi } from "./oge-penceresi";
import {
  AY_ADLARI,
  DURUMLAR,
  GUN_ADLARI,
  GUN_ADLARI_UZUN,
  TAKVIMLER,
  ayBasi,
  ayEkle,
  gunBicimi,
  gunEkle,
  gunFarki,
  gunSirala,
  haftaBasi,
  icsUret,
  kisaTarih,
  ornekleriUret,
  siraDegerleri,
  takvimRengi,
  type Oge,
  type OgeDurumu,
  type OgeGirdisi,
  type Ornek,
  type SiralamaModu,
} from "./tipler";

type Gorunum = "AY" | "HAFTA" | "AJANDA" | "TABLO" | "PANO";
const GORUNUMLER: { kod: Gorunum; ad: string }[] = [
  { kod: "AY", ad: "Ay" },
  { kod: "HAFTA", ad: "Hafta" },
  { kod: "AJANDA", ad: "Ajanda" },
  { kod: "TABLO", ad: "Tablo" },
  { kod: "PANO", ad: "Pano" },
];

const dugme = "rounded-full px-3 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white";
const kutu = "rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-sm text-white outline-none focus:border-[var(--accent)]";

type Filtre = { gizliTakvimler: string[]; sorumlu: string; etiket: string; arama: string; tamamGizle: boolean };

export function TakvimUygulamasi({
  ilkOgeler,
  dogumlar,
  kisiler,
  bugun,
  benimId,
}: {
  ilkOgeler: Oge[];
  dogumlar: { id: string; ad: string; ay: number; gun: number }[];
  kisiler: { id: string; ad: string }[];
  bugun: string;
  benimId: string | null;
}) {
  const [ogeler, setOgeler] = useState<Oge[]>(ilkOgeler);
  const [gorunum, setGorunum] = useState<Gorunum>("AY");
  const [imlec, setImlec] = useState(bugun);
  const [siralama, setSiralama] = useState<SiralamaModu>("elle");
  const [filtre, setFiltre] = useState<Filtre>({ gizliTakvimler: [], sorumlu: "", etiket: "", arama: "", tamamGizle: false });
  const [pencere, setPencere] = useState<{ oge: Oge | null; tarih: string } | null>(null);
  const [hata, setHata] = useState("");
  const [tabloSirasi, setTabloSirasi] = useState<{ alan: string; yon: 1 | -1 } | null>(null);
  const suruklenen = useRef<Ornek | null>(null);
  const [ustunde, setUstunde] = useState<string | null>(null);

  const yil = Number(imlec.slice(0, 4));

  // Dogum gunleri: gorunen yilin onceki/sonraki yilla birlikte uretilir.
  const dogumOgeleri = useMemo<Oge[]>(
    () =>
      dogumlar.flatMap((d) =>
        [yil - 1, yil, yil + 1].map((y) => ({
          id: `b:${d.id}-${y}`,
          baslik: `🎂 ${d.ad}`,
          tur: "NOT" as const,
          takvim: "DOGUM" as const,
          tarih: `${y}-${String(d.ay).padStart(2, "0")}-${String(d.gun).padStart(2, "0")}`,
          saat: null,
          bitisTarihi: null,
          bitisSaati: null,
          yer: null,
          meet: null,
          sorumluId: null,
          etiketler: [],
          durum: "BEKLIYOR" as const,
          tamam: false,
          icerik: "",
          tekrar: null,
          tekrarBitis: null,
          sira: 0,
          dosya: null,
          dosyaEtiketi: null,
          turetilmis: "dogum" as const,
        })),
      ),
    [dogumlar, yil],
  );

  const gorunurMu = (o: Oge) => {
    if (filtre.gizliTakvimler.includes(o.takvim)) return false;
    if (filtre.tamamGizle && o.tamam) return false;
    if (filtre.sorumlu === "ben" && o.sorumluId !== benimId) return false;
    if (filtre.sorumlu && filtre.sorumlu !== "ben" && o.sorumluId !== filtre.sorumlu) return false;
    if (filtre.etiket && !o.etiketler.some((e) => e.toLowerCase().includes(filtre.etiket.toLowerCase()))) return false;
    if (filtre.arama) {
      const a = filtre.arama.toLowerCase();
      if (![o.baslik, o.yer, o.dosyaEtiketi, o.icerik, ...o.etiketler].some((x) => x?.toLowerCase().includes(a))) return false;
    }
    return true;
  };
  const filtreliOgeler = useMemo(
    () => [...ogeler, ...dogumOgeleri].filter(gorunurMu),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ogeler, dogumOgeleri, filtre, benimId],
  );

  // Gorunumun kapsadigi aralik
  const [bas, son] = useMemo(() => {
    if (gorunum === "AY") {
      const b = haftaBasi(ayBasi(imlec));
      return [b, gunEkle(b, 41)] as const;
    }
    if (gorunum === "HAFTA") {
      const b = haftaBasi(imlec);
      return [b, gunEkle(b, 6)] as const;
    }
    return [imlec, gunEkle(imlec, 59)] as const;
  }, [gorunum, imlec]);

  const gunlere = useMemo(() => {
    const harita = new Map<string, Ornek[]>();
    for (const o of ornekleriUret(filtreliOgeler, bas, son)) harita.set(o.gun, [...(harita.get(o.gun) ?? []), o]);
    for (const [g, l] of harita) harita.set(g, gunSirala(l, siralama));
    return harita;
  }, [filtreliOgeler, bas, son, siralama]);

  // ---- Degisiklikler: ekranda aninda, sunucuya arka planda ----
  function iyimser(uygula: (l: Oge[]) => Oge[], is: () => Promise<unknown>) {
    const onceki = ogeler;
    setHata("");
    setOgeler(uygula);
    is().catch((e) => {
      setOgeler(onceki);
      setHata(e instanceof Error ? e.message : "İşlem yapılamadı.");
    });
  }

  function kaydet(g: OgeGirdisi) {
    const onceki = ogeler;
    setHata("");
    setPencere(null);
    const eski = g.id ? ogeler.find((o) => o.id === g.id) : null;
    const gecici = g.id ?? `t-${Date.now()}`;
    const dosyaEtiketi = g.dosya === eski?.dosya ? (eski?.dosyaEtiketi ?? null) : g.dosya ? g.baslik.replace(/^Duruşma · /, "") : null;
    const yeni: Oge = { ...g, id: gecici, sira: eski?.sira ?? Math.max(0, ...ogeler.map((o) => o.sira)) + 1, dosyaEtiketi, turetilmis: null };
    setOgeler((l) => (eski ? l.map((o) => (o.id === gecici ? yeni : o)) : [...l, yeni]));
    ogeKaydet(g)
      .then((s) => !eski && setOgeler((l) => l.map((o) => (o.id === gecici ? { ...o, id: s.id, sira: s.sira } : o))))
      .catch((e) => {
        setOgeler(onceki);
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      });
  }

  function sil(id: string) {
    setPencere(null);
    iyimser((l) => l.filter((o) => o.id !== id), () => ogeSil(id));
  }

  function tamamla(o: Oge, tamam: boolean) {
    iyimser(
      (l) => l.map((x) => (x.id === o.id ? { ...x, tamam, durum: tamam ? "TAMAM" : "BEKLIYOR" } : x)),
      () => ogeTamamla(o.id, tamam),
    );
  }

  // Verilen elle girilmis ogelerin yeni sirasini hem ekrana hem veritabanina yazar.
  function siraUygula(liste: Oge[], idler: string[]): Oge[] {
    const enBuyuk = Math.max(0, ...liste.map((o) => o.sira));
    const mevcut = idler.map((id) => liste.find((o) => o.id === id)?.sira ?? 0);
    const degerler = siraDegerleri(mevcut, enBuyuk);
    const harita = new Map(idler.map((id, i) => [id, degerler[i]]));
    return liste.map((o) => (harita.has(o.id) ? { ...o, sira: harita.get(o.id)! } : o));
  }

  function yerlestir(idler: string[], surukId: string, oncekiId: string | null) {
    const kalan = idler.filter((i) => i !== surukId);
    const n = oncekiId ? kalan.indexOf(oncekiId) : -1;
    kalan.splice(n < 0 ? kalan.length : n, 0, surukId);
    return kalan;
  }

  // Bir gune (ve istege bagli bir ogenin onune) birakma.
  function birak(hedefGun: string, oncekiId: string | null) {
    const o = suruklenen.current;
    suruklenen.current = null;
    setUstunde(null);
    if (!o || o.oge.turetilmis === "dogum") return;
    const fark = gunFarki(o.gun, hedefGun);
    if (o.oge.turetilmis) {
      if (fark === 0) return;
      const yeni = gunEkle(o.oge.tarih, fark);
      const ham = o.oge.id.slice(2);
      iyimser(
        (l) => l.map((x) => (x.id === o.oge.id ? { ...x, tarih: yeni } : x)),
        () => dosyaDurusmasiniOtele(o.oge.turetilmis as "dava" | "cmk", ham, yeni),
      );
      return;
    }
    if (fark === 0 && !oncekiId) return;
    if (fark === 0 && oncekiId === o.oge.id) return;
    const kaydirilmis = ogeler.map((x) =>
      x.id === o.oge.id && fark !== 0
        ? { ...x, tarih: gunEkle(x.tarih, fark), bitisTarihi: x.bitisTarihi ? gunEkle(x.bitisTarihi, fark) : null, tekrarBitis: x.tekrarBitis ? gunEkle(x.tekrarBitis, fark) : null }
        : x,
    );
    const hedefIdler = gunSirala(ornekleriUret(kaydirilmis.filter(gorunurMu), hedefGun, hedefGun), "elle")
      .filter((e) => !e.oge.turetilmis)
      .map((e) => e.oge.id);
    const idler = [...new Set(yerlestir(hedefIdler, o.oge.id, oncekiId))];
    const sonuc = idler.length > 1 ? siraUygula(kaydirilmis, idler) : kaydirilmis;
    if (oncekiId) setSiralama("elle");
    iyimser(
      () => sonuc,
      async () => {
        if (fark !== 0) await ogeKaydir(o.oge.id, fark);
        if (idler.length > 1 && oncekiId) await sirayiKaydet(idler);
      },
    );
  }

  // Tablo/pano: liste icinde siralama.
  function listedeBirak(liste: Oge[], oncekiId: string | null, durum?: OgeDurumu) {
    const o = suruklenen.current;
    suruklenen.current = null;
    setUstunde(null);
    if (!o || o.oge.turetilmis) return;
    const idler = [...new Set(yerlestir(liste.map((x) => x.id), o.oge.id, oncekiId))];
    let sonuc = ogeler;
    if (durum && o.oge.durum !== durum) sonuc = sonuc.map((x) => (x.id === o.oge.id ? { ...x, durum, tamam: durum === "TAMAM" } : x));
    if (idler.length > 1) sonuc = siraUygula(sonuc, idler);
    iyimser(
      () => sonuc,
      async () => {
        if (durum && o.oge.durum !== durum) await ogeDurumuYaz(o.oge.id, durum);
        if (idler.length > 1) await sirayiKaydet(idler);
      },
    );
  }

  // ---- Gezinme ----
  function ilerle(n: number) {
    if (gorunum === "AY") setImlec(ayEkle(imlec, n));
    else if (gorunum === "HAFTA") setImlec(gunEkle(imlec, 7 * n));
    else setImlec(gunEkle(imlec, 30 * n));
  }
  const baslikMetni = (() => {
    const [y, m] = imlec.split("-").map(Number);
    if (gorunum === "AY") return `${AY_ADLARI[m - 1]} ${y}`;
    if (gorunum === "HAFTA") return `${gunBicimi(haftaBasi(imlec))} – ${gunBicimi(gunEkle(haftaBasi(imlec), 6))}`;
    if (gorunum === "AJANDA") return `${gunBicimi(imlec)} ve sonrası`;
    return "Tüm kayıtlar";
  })();

  // Klavye kisayollari: N yeni, T bugun, ok tuslari gezinme.
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (pencere || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (e.key === "n" || e.key === "N") setPencere({ oge: null, tarih: imlec });
      else if (e.key === "t" || e.key === "T") setImlec(bugun);
      else if (e.key === "ArrowLeft" && gorunum !== "TABLO" && gorunum !== "PANO") ilerle(-1);
      else if (e.key === "ArrowRight" && gorunum !== "TABLO" && gorunum !== "PANO") ilerle(1);
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  });

  function icsIndir() {
    const blob = new Blob([icsUret(filtreliOgeler)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "buro-takvimi.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---- Parcalar ----
  function rozet(o: Ornek, kompakt?: boolean) {
    const renk = takvimRengi(o.oge.takvim);
    const sorumlu = kisiler.find((k) => k.id === o.oge.sorumluId)?.ad.split(" ")[0];
    return (
      <div
        key={o.key}
        draggable={o.oge.turetilmis !== "dogum"}
        onDragStart={(e) => {
          suruklenen.current = o;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", o.oge.id);
        }}
        onDragEnd={() => setUstunde(null)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setUstunde(o.key);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          birak(o.gun, o.oge.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setPencere({ oge: o.oge, tarih: o.oge.tarih });
        }}
        title={[o.oge.baslik, o.oge.yer, sorumlu && `Sorumlu: ${sorumlu}`].filter(Boolean).join(" · ")}
        className={`flex cursor-grab items-center gap-1.5 rounded-md border-l-[3px] bg-white/[0.07] px-1.5 text-white/90 hover:bg-white/[0.13] active:cursor-grabbing ${
          kompakt ? "py-0.5 text-[11px]" : "py-1 text-sm"
        } ${ustunde === o.key ? "ring-1 ring-[var(--accent)]" : ""} ${o.oge.tamam ? "opacity-50" : ""}`}
        style={{ borderLeftColor: renk }}
      >
        {!o.oge.turetilmis && !kompakt && (
          <input
            type="checkbox"
            checked={o.oge.tamam}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => tamamla(o.oge, e.target.checked)}
            className="h-3 w-3 shrink-0 accent-[var(--accent)]"
            aria-label="Tamamlandı"
          />
        )}
        <span className={`min-w-0 flex-1 truncate ${o.oge.tamam ? "line-through" : ""}`}>
          {o.oge.saat && !kompakt && <span className="mr-1 text-white/50">{o.oge.saat}</span>}
          {o.oge.saat && kompakt && <span className="mr-0.5 text-white/50">{o.oge.saat}</span>}
          {o.oge.baslik}
        </span>
        {!kompakt && sorumlu && <span className="shrink-0 text-[10px] text-white/40">{sorumlu}</span>}
        {o.oge.tekrar && <span className="shrink-0 text-[10px] text-white/40" title="Tekrarlanan">↻</span>}
        {!o.ilkGun && <span className="shrink-0 text-[10px] text-white/40">↦</span>}
      </div>
    );
  }

  function gunKutusu(g: string, kompakt?: boolean, maks?: number) {
    const liste = gunlere.get(g) ?? [];
    const gorunen = maks ? liste.slice(0, maks) : liste;
    return (
      <div
        key={`gk-${g}`}
        onDragOver={(e) => {
          e.preventDefault();
          setUstunde(`gun-${g}`);
        }}
        onDrop={(e) => {
          e.preventDefault();
          birak(g, null);
        }}
        className={`flex min-h-0 flex-col gap-1 ${ustunde === `gun-${g}` ? "rounded-lg bg-[var(--accent)]/10" : ""}`}
      >
        {gorunen.map((o) => rozet(o, kompakt))}
        {maks && liste.length > maks && <span className="px-1 text-[10px] text-white/45">+{liste.length - maks} daha</span>}
      </div>
    );
  }

  // ---- Gorunumler ----
  const ayGorunumu = (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
      {GUN_ADLARI.map((g) => (
        <div key={g} className="bg-[var(--yuzey,#1c2432)] py-1.5 text-center text-xs text-white/45">
          {g}
        </div>
      ))}
      {Array.from({ length: 42 }, (_, i) => gunEkle(bas, i)).map((g) => {
        const buAy = g.slice(0, 7) === imlec.slice(0, 7);
        return (
          <div
            key={g}
            onDoubleClick={() => setPencere({ oge: null, tarih: g })}
            className={`min-h-24 bg-[var(--yuzey,#1c2432)] p-1 ${buAy ? "" : "opacity-45"}`}
          >
            <div className="mb-0.5 flex items-center justify-between">
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${g === bugun ? "bg-[var(--accent)] font-semibold text-white" : "text-white/70"}`}>
                {Number(g.slice(8))}
              </span>
              <button type="button" onClick={() => setPencere({ oge: null, tarih: g })} className="rounded px-1 text-xs text-white/30 hover:bg-white/10 hover:text-white" aria-label="Bu güne ekle">
                +
              </button>
            </div>
            {gunKutusu(g, true, 4)}
          </div>
        );
      })}
    </div>
  );

  const haftaGorunumu = (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {Array.from({ length: 7 }, (_, i) => gunEkle(bas, i)).map((g, i) => (
        <div key={g} onDoubleClick={() => setPencere({ oge: null, tarih: g })} className="flex min-h-60 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className={`text-sm ${g === bugun ? "font-semibold text-[var(--accent)]" : "text-white/70"}`}>
              {GUN_ADLARI[i]} {Number(g.slice(8))}
            </span>
            <button type="button" onClick={() => setPencere({ oge: null, tarih: g })} className="rounded px-1.5 text-sm text-white/35 hover:bg-white/10 hover:text-white" aria-label="Bu güne ekle">
              +
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {gunKutusu(g)}
          </div>
        </div>
      ))}
    </div>
  );

  const ajandaGunleri = Array.from({ length: 60 }, (_, i) => gunEkle(imlec, i)).filter((g) => (gunlere.get(g)?.length ?? 0) > 0 || g === bugun);
  const ajandaGorunumu = (
    <div className="flex flex-col gap-3">
      {ajandaGunleri.length === 0 && <p className="text-sm text-white/45">Bu aralıkta kayıt yok.</p>}
      {ajandaGunleri.map((g) => {
        const gunNo = (new Date(`${g}T00:00:00Z`).getUTCDay() + 6) % 7;
        return (
          <div key={g} className="grid grid-cols-[5.5rem_1fr] gap-3">
            <div className="pt-1 text-sm">
              <div className={g === bugun ? "font-semibold text-[var(--accent)]" : "text-white/80"}>{Number(g.slice(8))} {AY_ADLARI[Number(g.slice(5, 7)) - 1].slice(0, 3)}</div>
              <div className="text-xs text-white/40">{GUN_ADLARI_UZUN[gunNo]}</div>
            </div>
            <div className="min-h-8 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              {(gunlere.get(g)?.length ?? 0) === 0 ? <span className="text-xs text-white/35">Kayıt yok</span> : gunKutusu(g)}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Tablo: tum elle girilen ogeler; baslikla siralanabilir, sirasiz hâlde elle (surukle-birak) sirali.
  const tabloOgeleri = useMemo(() => {
    const l = filtreliOgeler.filter((o) => !o.turetilmis);
    if (!tabloSirasi) return [...l].sort((a, b) => a.sira - b.sira);
    const { alan, yon } = tabloSirasi;
    const deger = (o: Oge) =>
      alan === "tarih" ? o.tarih + (o.saat ?? "") : alan === "baslik" ? o.baslik.toLowerCase() : alan === "takvim" ? o.takvim : alan === "sorumlu" ? (kisiler.find((k) => k.id === o.sorumluId)?.ad ?? "") : o.durum;
    return [...l].sort((a, b) => deger(a).localeCompare(deger(b), "tr") * yon);
  }, [filtreliOgeler, tabloSirasi, kisiler]);

  const baslikHucre = (alan: string, ad: string) => (
    <th className="px-2 py-2 text-left font-medium">
      <button type="button" onClick={() => setTabloSirasi((s) => (s?.alan === alan ? (s.yon === 1 ? { alan, yon: -1 } : null) : { alan, yon: 1 }))} className="hover:text-white">
        {ad} {tabloSirasi?.alan === alan ? (tabloSirasi.yon === 1 ? "↑" : "↓") : ""}
      </button>
    </th>
  );
  const tabloGorunumu = (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[44rem] text-sm text-white/85">
        <thead className="bg-white/[0.05] text-xs uppercase tracking-wider text-white/45">
          <tr>
            <th className="w-8 px-2 py-2" />
            {baslikHucre("baslik", "Başlık")}
            {baslikHucre("takvim", "Takvim")}
            {baslikHucre("tarih", "Tarih")}
            {baslikHucre("sorumlu", "Sorumlu")}
            {baslikHucre("durum", "Durum")}
            <th className="px-2 py-2 text-left font-medium">Etiketler</th>
          </tr>
        </thead>
        <tbody>
          {tabloOgeleri.map((o) => (
            <tr
              key={o.id}
              draggable={!tabloSirasi}
              onDragStart={() => (suruklenen.current = { key: o.id, oge: o, gun: o.tarih, ilkGun: true })}
              onDragOver={(e) => {
                e.preventDefault();
                setUstunde(`t-${o.id}`);
              }}
              onDrop={(e) => {
                e.preventDefault();
                listedeBirak(tabloOgeleri, o.id);
              }}
              onClick={() => setPencere({ oge: o, tarih: o.tarih })}
              className={`cursor-pointer border-t border-white/[0.07] hover:bg-white/[0.05] ${ustunde === `t-${o.id}` ? "bg-[var(--accent)]/10" : ""}`}
            >
              <td className="px-2 py-1.5 text-white/30">{tabloSirasi ? "" : "⋮⋮"}</td>
              <td className={`px-2 py-1.5 ${o.tamam ? "line-through opacity-50" : ""}`}>{o.baslik}</td>
              <td className="px-2 py-1.5">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: takvimRengi(o.takvim) }} />
                {TAKVIMLER.find((t) => t.kod === o.takvim)?.ad}
              </td>
              <td className="whitespace-nowrap px-2 py-1.5">
                {kisaTarih(o.tarih)}
                {o.saat ? ` ${o.saat}` : ""}
                {o.bitisTarihi ? ` → ${kisaTarih(o.bitisTarihi)}` : ""}
              </td>
              <td className="px-2 py-1.5">{kisiler.find((k) => k.id === o.sorumluId)?.ad ?? "—"}</td>
              <td className="px-2 py-1.5">{DURUMLAR.find((d) => d.kod === o.durum)?.ad}</td>
              <td className="px-2 py-1.5 text-white/55">{o.etiketler.join(", ")}</td>
            </tr>
          ))}
          {tabloOgeleri.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-white/40">
                Kayıt yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="border-t border-white/[0.07] px-3 py-2 text-xs text-white/35">
        Başlığa tıklayınca sütuna göre sıralanır; sıralama kapalıyken satırları sürükleyerek elle sıralayabilirsiniz (sıra kalıcıdır).
      </p>
    </div>
  );

  const panoSutunlari = DURUMLAR.map((d) => ({ ...d, liste: filtreliOgeler.filter((o) => !o.turetilmis && o.durum === d.kod).sort((a, b) => a.sira - b.sira) }));
  const panoGorunumu = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {panoSutunlari.map((s) => (
        <div
          key={s.kod}
          onDragOver={(e) => {
            e.preventDefault();
            setUstunde(`p-${s.kod}`);
          }}
          onDrop={(e) => {
            e.preventDefault();
            listedeBirak(s.liste, null, s.kod);
          }}
          className={`flex min-h-48 flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 ${ustunde === `p-${s.kod}` ? "bg-[var(--accent)]/10" : ""}`}
        >
          <div className="flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wider text-white/50">
            <span>{s.ad}</span>
            <span>{s.liste.length}</span>
          </div>
          {s.liste.map((o) => (
            <div
              key={o.id}
              draggable
              onDragStart={() => (suruklenen.current = { key: o.id, oge: o, gun: o.tarih, ilkGun: true })}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setUstunde(`pk-${o.id}`);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                listedeBirak(s.liste, o.id, s.kod);
              }}
              onClick={() => setPencere({ oge: o, tarih: o.tarih })}
              className={`cursor-grab rounded-xl border-l-4 bg-white/[0.07] p-2.5 text-sm hover:bg-white/[0.12] ${ustunde === `pk-${o.id}` ? "ring-1 ring-[var(--accent)]" : ""}`}
              style={{ borderLeftColor: takvimRengi(o.takvim) }}
            >
              <div className={o.tamam ? "line-through opacity-60" : ""}>{o.baslik}</div>
              <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-white/45">
                <span>{kisaTarih(o.tarih)}</span>
                {o.saat && <span>{o.saat}</span>}
                {o.sorumluId && <span>{kisiler.find((k) => k.id === o.sorumluId)?.ad.split(" ")[0]}</span>}
                {o.etiketler.map((e) => (
                  <span key={e} className="rounded bg-white/10 px-1">#{e}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="glass flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl px-5 py-3">
        <h1 className="text-xl font-semibold tracking-tight text-white">Büro takvimi</h1>
        <div className="flex items-center gap-1">
          {gorunum !== "TABLO" && gorunum !== "PANO" && (
            <>
              <button type="button" onClick={() => ilerle(-1)} className={dugme} aria-label="Önceki">‹</button>
              <button type="button" onClick={() => setImlec(bugun)} className={dugme}>Bugün</button>
              <button type="button" onClick={() => ilerle(1)} className={dugme} aria-label="Sonraki">›</button>
            </>
          )}
          <span className="ml-1 text-sm font-medium text-white">{baslikMetni}</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-white/[0.07] p-0.5" role="tablist">
            {GORUNUMLER.map((g) => (
              <button
                key={g.kod}
                type="button"
                role="tab"
                aria-selected={gorunum === g.kod}
                onClick={() => setGorunum(g.kod)}
                className={`rounded-full px-3 py-1 text-sm ${gorunum === g.kod ? "bg-[var(--accent)] font-medium text-white" : "text-white/65 hover:text-white"}`}
              >
                {g.ad}
              </button>
            ))}
          </div>
          {(gorunum === "AY" || gorunum === "HAFTA" || gorunum === "AJANDA") && (
            <select value={siralama} onChange={(e) => setSiralama(e.target.value as SiralamaModu)} className={kutu} aria-label="Gün içi sıralama">
              <option value="elle">Elle sıra</option>
              <option value="saat">Saate göre</option>
            </select>
          )}
          <button type="button" onClick={icsIndir} className={dugme} title="Telefon / Google / Outlook takvimine aktarılabilir dosya">
            Dışa aktar (.ics)
          </button>
          <button type="button" onClick={() => setPencere({ oge: null, tarih: imlec })} className="rounded-full bg-[var(--accent)] px-4 py-1 text-sm font-medium text-white">
            + Yeni
          </button>
        </div>
      </div>

      {hata && <p className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-200">{hata}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="glass flex flex-col gap-4 self-start rounded-3xl p-4 text-sm">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Takvimler</h2>
            <div className="flex flex-col gap-1.5">
              {TAKVIMLER.map((t) => (
                <label key={t.kod} className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={!filtre.gizliTakvimler.includes(t.kod)}
                    onChange={(e) => setFiltre((f) => ({ ...f, gizliTakvimler: e.target.checked ? f.gizliTakvimler.filter((x) => x !== t.kod) : [...f.gizliTakvimler, t.kod] }))}
                    className="h-3.5 w-3.5"
                    style={{ accentColor: t.renk }}
                  />
                  <span className="h-2 w-2 rounded-full" style={{ background: t.renk }} />
                  {t.ad}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/45">Süzgeç</h2>
            <input value={filtre.arama} onChange={(e) => setFiltre({ ...filtre, arama: e.target.value })} placeholder="Ara…" className={kutu} />
            <select value={filtre.sorumlu} onChange={(e) => setFiltre({ ...filtre, sorumlu: e.target.value })} className={kutu} aria-label="Sorumlu">
              <option value="">Herkes</option>
              {benimId && <option value="ben">Benim işlerim</option>}
              {kisiler.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
            </select>
            <input value={filtre.etiket} onChange={(e) => setFiltre({ ...filtre, etiket: e.target.value })} placeholder="Etiket" className={kutu} />
            <label className="flex items-center gap-2 text-white/75">
              <input type="checkbox" checked={filtre.tamamGizle} onChange={(e) => setFiltre({ ...filtre, tamamGizle: e.target.checked })} className="h-3.5 w-3.5" />
              Tamamlananları gizle
            </label>
          </div>
          <p className="text-xs leading-relaxed text-white/35">
            Kısayollar: <b>N</b> yeni, <b>T</b> bugün, <b>←</b> <b>→</b> gezinme. Gün hücresine çift tıklayarak o güne ekleyin; öğeleri sürükleyip başka güne veya başka sıraya bırakın.
          </p>
        </aside>

        <section className="glass min-w-0 rounded-3xl p-4">
          {gorunum === "AY" && ayGorunumu}
          {gorunum === "HAFTA" && haftaGorunumu}
          {gorunum === "AJANDA" && ajandaGorunumu}
          {gorunum === "TABLO" && tabloGorunumu}
          {gorunum === "PANO" && panoGorunumu}
        </section>
      </div>

      {pencere && (
        <OgePenceresi
          key={pencere.oge?.id ?? `yeni-${pencere.tarih}`}
          oge={pencere.oge}
          varsayilanTarih={pencere.tarih}
          kisiler={kisiler}
          onKaydet={kaydet}
          onSil={sil}
          onKapat={() => setPencere(null)}
        />
      )}
    </div>
  );
}
