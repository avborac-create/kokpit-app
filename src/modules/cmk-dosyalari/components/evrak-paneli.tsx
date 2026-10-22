"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dugme } from "@/core/ui/button";
import { Girdi } from "@/core/ui/form";
import { evrakGuncelle, evrakSil, evrakYukle } from "@/modules/cmk-dosyalari/lib/evrak-actions";

export type EvrakKaydi = {
  id: string;
  ad: string;
  klasor: string;
  evrakTarihi: string | null; // YYYY-MM-DD
  mimeTipi: string;
  boyutBayt: number;
  onizlemeTuru: "PDF" | "RESIM" | "METIN" | "YOK";
  ozel: boolean; // true: yalniz giris yapan avukatin gorebildigi evrak
};

const KLASOR_SIRASI = ["İddianame", "Duruşma Zabıtları", "İfadeler", "Tutanaklar", "Şikayet"];

function tarihYaz(t: string | null) {
  if (!t) return "Tarihsiz";
  const [y, a, g] = t.split("-");
  return `${g}.${a}.${y}`;
}

function boyutYaz(b: number) {
  return b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

// CMK dosyasi evrak alani: solda klasor agaci (evrak bazinda) ya da tarih
// sirali liste, sagda secili evrakin onizlemesi.
export function EvrakPaneli({ dosyaId, evraklar }: { dosyaId: string; evraklar: EvrakKaydi[] }) {
  const [alan, setAlan] = useState<"dosya" | "ozel">("dosya");
  const dosyaEvraklari = evraklar.filter((e) => !e.ozel);
  const ozelEvraklar = evraklar.filter((e) => e.ozel);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["dosya", "DOSYA EVRAKLARI", dosyaEvraklari.length],
            ["ozel", "AVUKATA ÖZEL", ozelEvraklar.length],
          ] as const
        ).map(([anahtar, etiket, adet]) => (
          <button
            key={anahtar}
            type="button"
            onClick={() => setAlan(anahtar)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              alan === anahtar
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[#6db8ff]"
                : "border-white/15 text-white/60 hover:bg-white/[0.06]"
            }`}
          >
            {etiket} <span className="ml-1 text-xs opacity-60">{adet}</span>
          </button>
        ))}
      </div>
      {alan === "ozel" && (
        <p className="mb-3 text-xs text-white/45">
          🔒 Bu alandaki evrakları yalnızca siz görürsünüz (duruşma hazırlığı notları, taslaklar vb.). Diğer avukatlar ve
          yöneticiler göremez; her avukatın kendi özel alanı vardır.
        </p>
      )}
      <EvrakAlani
        key={alan}
        dosyaId={dosyaId}
        evraklar={alan === "dosya" ? dosyaEvraklari : ozelEvraklar}
        ozel={alan === "ozel"}
      />
    </div>
  );
}

type Siralama = "tarih" | "tur";

function turSirasi(klasor: string) {
  const i = KLASOR_SIRASI.indexOf(klasor);
  return i === -1 ? 99 : i;
}

// Tarih karsilastirmasi; tarihsizler her zaman sonda. Esitlikte 0 doner.
function yalnizTarih(a: EvrakKaydi, b: EvrakKaydi, artan: boolean) {
  if (!a.evrakTarihi && !b.evrakTarihi) return 0;
  if (!a.evrakTarihi) return 1;
  if (!b.evrakTarihi) return -1;
  return artan ? a.evrakTarihi.localeCompare(b.evrakTarihi) : b.evrakTarihi.localeCompare(a.evrakTarihi);
}

function evrakSirala(a: EvrakKaydi, b: EvrakKaydi, siralama: Siralama, artan: boolean) {
  const tur = turSirasi(a.klasor) - turSirasi(b.klasor) || a.klasor.localeCompare(b.klasor, "tr");
  const tarih = yalnizTarih(a, b, artan);
  return (siralama === "tur" ? tur || tarih : tarih || tur) || a.ad.localeCompare(b.ad, "tr");
}

function EvrakAlani({ dosyaId, evraklar, ozel }: { dosyaId: string; evraklar: EvrakKaydi[]; ozel: boolean }) {
  const [gorunum, setGorunum] = useState<"klasor" | "tarih">("klasor");
  const [siralama, setSiralama] = useState<Siralama>("tur");
  const [artan, setArtan] = useState(true);
  const [arama, setArama] = useState("");
  const [seciliId, setSeciliId] = useState<string | null>(() => {
    const sirali = [...evraklar].sort((a, b) => evrakSirala(a, b, "tur", true));
    return sirali[0]?.id ?? null;
  });
  const [kapaliKlasorler, setKapaliKlasorler] = useState<Set<string>>(new Set());
  const [yonetimAcik, setYonetimAcik] = useState(false);
  const listeRef = useRef<HTMLDivElement>(null);
  const onizlemeRef = useRef<HTMLDivElement>(null);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr");
    return q ? evraklar.filter((e) => `${e.ad} ${e.klasor}`.toLocaleLowerCase("tr").includes(q)) : evraklar;
  }, [evraklar, arama]);

  const gruplar = useMemo(() => {
    const harita = new Map<string, EvrakKaydi[]>();
    for (const e of filtreli) harita.set(e.klasor, [...(harita.get(e.klasor) ?? []), e]);
    const listeler = [...harita.entries()].map(([klasor, liste]) => [klasor, [...liste].sort((x, y) => evrakSirala(x, y, siralama, artan))] as const);
    // "Tur" sirasinda klasorler sabit tur sirasiyla; "Tarih" sirasinda en erken/gec tarihli evrakin klasoru once gelir.
    return listeler.sort(([ka, la], [kb, lb]) =>
      siralama === "tur"
        ? turSirasi(ka) - turSirasi(kb) || ka.localeCompare(kb, "tr")
        : yalnizTarih(la[0], lb[0], artan) || turSirasi(ka) - turSirasi(kb),
    );
  }, [filtreli, siralama, artan]);

  const duzListe = useMemo(() => [...filtreli].sort((x, y) => evrakSirala(x, y, siralama, artan)), [filtreli, siralama, artan]);
  const secili = evraklar.find((e) => e.id === seciliId) ?? null;
  const klasorler = [...new Set(evraklar.map((e) => e.klasor).concat(KLASOR_SIRASI))];

  function sec(id: string) {
    setSeciliId(id);
    // Dar ekranda (telefon) liste ile onizleme alt alta: secince onizlemeye kaydir.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setTimeout(() => onizlemeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  function satir(e: EvrakKaydi, klasorGoster: boolean) {
    return (
      <button
        key={e.id}
        type="button"
        onClick={() => sec(e.id)}
        className={`flex w-full items-start justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-sm lg:py-1.5 ${
          e.id === seciliId ? "bg-[var(--accent-soft)] text-[#6db8ff]" : "text-white/75 hover:bg-white/[0.06]"
        }`}
      >
        <span className="min-w-0">
          <span className="block truncate">{e.ad}</span>
          {klasorGoster && <span className="text-[11px] text-white/45">{e.klasor}</span>}
        </span>
        <span className="shrink-0 text-[11px] text-white/45">{tarihYaz(e.evrakTarihi)}</span>
      </button>
    );
  }

  const parcaliDugme = (aktif: boolean) =>
    `flex-1 rounded-full px-3 py-2 text-xs lg:py-1 ${aktif ? "bg-[var(--accent)] text-white" : "text-white/60"}`;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div ref={listeRef} className="glass scroll-mt-4 rounded-2xl p-3">
        <div className="mb-2 flex gap-1 rounded-full bg-white/[0.06] p-1">
          {(
            [
              ["klasor", "Klasörlü"],
              ["tarih", "Tek liste"],
            ] as const
          ).map(([anahtar, etiket]) => (
            <button key={anahtar} type="button" onClick={() => setGorunum(anahtar)} className={parcaliDugme(gorunum === anahtar)}>
              {etiket}
            </button>
          ))}
        </div>
        <div className="mb-2 flex gap-1 rounded-full bg-white/[0.06] p-1">
          {(
            [
              ["tarih", "Tarihe göre"],
              ["tur", "Evrak türüne göre"],
            ] as const
          ).map(([anahtar, etiket]) => (
            <button key={anahtar} type="button" onClick={() => setSiralama(anahtar)} className={parcaliDugme(siralama === anahtar)}>
              {etiket}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-2">
          <Girdi value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Evrak ara…" className="!py-2 lg:!py-1.5" />
          <button
            type="button"
            onClick={() => setArtan((a) => !a)}
            className="shrink-0 rounded-lg px-2 py-2 text-xs text-[#6db8ff] hover:bg-white/[0.06]"
            title="Tarih yönünü çevir"
          >
            {artan ? "Eski → yeni" : "Yeni → eski"}
          </button>
        </div>
        <p className="mb-2 px-1 text-[11px] text-white/35">
          {siralama === "tur" ? "Önce evrak türü, her türün içinde tarih sırası." : "Önce tarih, aynı tarihte evrak türü sırası."}
        </p>

        {evraklar.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-white/40">
            {ozel ? "Özel evrakınız yok. Aşağıdan ekleyebilirsiniz." : "Henüz evrak yok."}
          </p>
        )}

        {gorunum === "klasor"
          ? gruplar.map(([klasor, liste]) => {
              const kapali = kapaliKlasorler.has(klasor);
              return (
                <div key={klasor} className="mb-1">
                  <button
                    type="button"
                    onClick={() =>
                      setKapaliKlasorler((onceki) => {
                        const yeni = new Set(onceki);
                        if (yeni.has(klasor)) yeni.delete(klasor);
                        else yeni.add(klasor);
                        return yeni;
                      })
                    }
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-sm font-medium text-white hover:bg-white/[0.06] lg:py-1.5"
                  >
                    <span>
                      {kapali ? "▸" : "▾"} 📁 {klasor}
                    </span>
                    <span className="text-xs text-white/40">{liste.length}</span>
                  </button>
                  {!kapali && <div className="ml-3 border-l border-white/10 pl-1.5">{liste.map((e) => satir(e, false))}</div>}
                </div>
              );
            })
          : duzListe.map((e) => satir(e, true))}

        <div className="mt-3 border-t border-white/10 pt-2">
          <button type="button" onClick={() => setYonetimAcik((a) => !a)} className="py-2 text-xs text-[#6db8ff] hover:underline">
            {yonetimAcik ? "Evrak ekle ▲" : "+ Evrak ekle ▼"}
          </button>
          {yonetimAcik && <YuklemeFormu dosyaId={dosyaId} klasorler={klasorler} ozel={ozel} />}
        </div>
      </div>

      <div ref={onizlemeRef} className="glass min-h-[60vh] scroll-mt-4 rounded-2xl p-3 lg:min-h-[70vh]">
        {secili ? (
          <Onizleme
            key={secili.id}
            dosyaId={dosyaId}
            evrak={secili}
            klasorler={klasorler}
            listeyeDon={() => listeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        ) : (
          <p className="py-24 text-center text-sm text-white/40">Soldan bir evrak seçin.</p>
        )}
      </div>
    </div>
  );
}

function YuklemeFormu({ dosyaId, klasorler, ozel }: { dosyaId: string; klasorler: string[]; ozel: boolean }) {
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  return (
    <form
      className="mt-2 space-y-2"
      action={(fd) => {
        setHata("");
        basla(async () => {
          try {
            await evrakYukle(dosyaId, fd);
          } catch (e) {
            setHata(e instanceof Error ? e.message : "Yüklenemedi.");
          }
        });
      }}
    >
      {ozel && <input type="hidden" name="ozel" value="1" />}
      <input type="file" name="dosya" multiple required className="block w-full text-xs text-white/60" />
      <Girdi name="klasor" list="cmk-klasorler" placeholder="Klasör (ör. İfadeler)" required className="!py-1.5" />
      <datalist id="cmk-klasorler">
        {klasorler.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <Girdi name="evrakTarihi" type="date" className="!py-1.5" title="Boşsa dosya adından yakalanır" />
      {hata && <p className="text-xs text-[#ff7a70]">{hata}</p>}
      <Dugme type="submit" boyut="kompakt" disabled={bekliyor}>
        {bekliyor ? "Yükleniyor…" : "Yükle"}
      </Dugme>
      <p className="text-[11px] text-white/35">PDF, TIF, resim ve UYAP UDF yüklenebilir. Dosya başına en çok 4 MB.</p>
    </form>
  );
}

function Onizleme({
  dosyaId,
  evrak,
  klasorler,
  listeyeDon,
}: {
  dosyaId: string;
  evrak: EvrakKaydi;
  klasorler: string[];
  listeyeDon: () => void;
}) {
  const [duzenle, setDuzenle] = useState(false);
  const [bekliyor, basla] = useTransition();
  const yol = `/api/cmk-evrak/${evrak.id}`;

  return (
    <div>
      <button type="button" onClick={listeyeDon} className="mb-2 py-1 text-sm text-[#6db8ff] hover:underline lg:hidden">
        ‹ Evrak listesine dön
      </button>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">{evrak.ad}</h3>
          <p className="text-xs text-white/40">
            {evrak.klasor} · {tarihYaz(evrak.evrakTarihi)} · {boyutYaz(evrak.boyutBayt)}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`${yol}?tur=orijinal`}>
            <Dugme type="button" varyant="ikincil" boyut="kompakt">
              İndir
            </Dugme>
          </a>
          <Dugme type="button" varyant="ikincil" boyut="kompakt" onClick={() => setDuzenle((d) => !d)}>
            Adı / klasörü düzenle
          </Dugme>
          <Dugme
            type="button"
            varyant="tehlike"
            boyut="kompakt"
            disabled={bekliyor}
            onClick={() => {
              if (window.confirm(`"${evrak.ad}" evrakı silinsin mi?`)) basla(() => evrakSil(dosyaId, evrak.id));
            }}
          >
            Sil
          </Dugme>
        </div>
      </div>

      {duzenle && (
        <form
          className="mb-3 grid grid-cols-1 gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-4"
          action={(fd) => {
            basla(async () => {
              await evrakGuncelle(dosyaId, evrak.id, fd);
              setDuzenle(false);
            });
          }}
        >
          <Girdi name="ad" defaultValue={evrak.ad} required />
          <Girdi name="klasor" list="cmk-klasorler-duzen" defaultValue={evrak.klasor} required />
          <datalist id="cmk-klasorler-duzen">
            {klasorler.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
          <Girdi name="evrakTarihi" type="date" defaultValue={evrak.evrakTarihi ?? ""} />
          <Dugme type="submit" boyut="kompakt" disabled={bekliyor}>
            Kaydet
          </Dugme>
        </form>
      )}

      {evrak.onizlemeTuru === "PDF" && <iframe src={yol} title={evrak.ad} className="h-[75vh] w-full rounded-xl bg-white" />}
      {evrak.onizlemeTuru === "RESIM" && <SayfaGoruntuleyici yol={yol} ad={evrak.ad} cokSayfaliMi={evrak.mimeTipi === "image/tiff"} />}
      {evrak.onizlemeTuru === "METIN" && (
        <iframe src={`${yol}?tur=html`} title={evrak.ad} className="h-[78vh] w-full rounded-xl bg-[#e9ebf0]" />
      )}
      {evrak.onizlemeTuru === "YOK" && (
        <p className="py-24 text-center text-sm text-white/40">Bu evrak türü için önizleme yok; indirerek açabilirsiniz.</p>
      )}
    </div>
  );
}

// Taranmis evrakin (TIF/resim) tum sayfalarini alt alta gosterir; kaydirdikca
// ya da oklarla gezildikce "Sayfa x / y" gostergesi guncellenir.
function SayfaGoruntuleyici({ yol, ad, cokSayfaliMi }: { yol: string; ad: string; cokSayfaliMi: boolean }) {
  const [sayfaSayisi, setSayfaSayisi] = useState<number | null>(cokSayfaliMi ? null : 1);
  const [aktif, setAktif] = useState(1);
  const kapsayici = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cokSayfaliMi) return;
    let iptal = false;
    fetch(`${yol}?tur=bilgi`)
      .then((r) => r.json())
      .then((v: { sayfa?: number }) => {
        if (!iptal) setSayfaSayisi(v.sayfa ?? 1);
      })
      .catch(() => {
        if (!iptal) setSayfaSayisi(1);
      });
    return () => {
      iptal = true;
    };
  }, [yol, cokSayfaliMi]);

  useEffect(() => {
    const kok = kapsayici.current;
    if (!kok || !sayfaSayisi) return;
    const gozlemci = new IntersectionObserver(
      (girdiler) => {
        const gorunen = girdiler.filter((g) => g.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (gorunen) setAktif(Number((gorunen.target as HTMLElement).dataset.sayfa));
      },
      { root: kok, threshold: [0.3, 0.6, 0.9] },
    );
    kok.querySelectorAll("[data-sayfa]").forEach((el) => gozlemci.observe(el));
    return () => gozlemci.disconnect();
  }, [sayfaSayisi]);

  function git(no: number) {
    const hedef = Math.min(Math.max(1, no), sayfaSayisi ?? 1);
    kapsayici.current?.querySelector(`[data-sayfa="${hedef}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  if (sayfaSayisi === null) return <p className="py-24 text-center text-sm text-white/40">Sayfalar hazırlanıyor…</p>;

  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-3 text-sm text-white/80">
        <Dugme type="button" varyant="ikincil" boyut="kompakt" onClick={() => git(aktif - 1)} disabled={aktif <= 1}>
          ‹ Önceki
        </Dugme>
        <span className="min-w-28 text-center font-medium">
          Sayfa {aktif} / {sayfaSayisi}
        </span>
        <Dugme type="button" varyant="ikincil" boyut="kompakt" onClick={() => git(aktif + 1)} disabled={aktif >= sayfaSayisi}>
          Sonraki ›
        </Dugme>
      </div>
      <div ref={kapsayici} className="max-h-[75vh] space-y-3 overflow-y-auto rounded-xl bg-[#e9ebf0] p-3">
        {Array.from({ length: sayfaSayisi }, (_, i) => i + 1).map((no) => (
          <div key={no} data-sayfa={no} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cokSayfaliMi ? `${yol}?tur=sayfa&no=${no}` : yol}
              alt={`${ad} — sayfa ${no}`}
              loading="lazy"
              className="mx-auto w-full max-w-3xl bg-white shadow"
            />
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
              {no} / {sayfaSayisi}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
