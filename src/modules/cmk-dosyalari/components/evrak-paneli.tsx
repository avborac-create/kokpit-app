"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

function tarihKarsilastir(a: EvrakKaydi, b: EvrakKaydi, artan: boolean) {
  if (!a.evrakTarihi && !b.evrakTarihi) return a.ad.localeCompare(b.ad, "tr");
  if (!a.evrakTarihi) return 1;
  if (!b.evrakTarihi) return -1;
  return artan ? a.evrakTarihi.localeCompare(b.evrakTarihi) : b.evrakTarihi.localeCompare(a.evrakTarihi);
}

// CMK dosyasi evrak alani: solda klasor agaci (evrak bazinda) ya da tarih
// sirali liste, sagda secili evrakin onizlemesi.
export function EvrakPaneli({ dosyaId, evraklar }: { dosyaId: string; evraklar: EvrakKaydi[] }) {
  const [gorunum, setGorunum] = useState<"klasor" | "tarih">("klasor");
  const [artan, setArtan] = useState(true);
  const [arama, setArama] = useState("");
  const [seciliId, setSeciliId] = useState<string | null>(() => {
    const sirali = [...evraklar].sort((a, b) => {
      const ia = KLASOR_SIRASI.indexOf(a.klasor);
      const ib = KLASOR_SIRASI.indexOf(b.klasor);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || tarihKarsilastir(a, b, true);
    });
    return sirali[0]?.id ?? null;
  });
  const [kapaliKlasorler, setKapaliKlasorler] = useState<Set<string>>(new Set());
  const [yonetimAcik, setYonetimAcik] = useState(false);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr");
    return q ? evraklar.filter((e) => `${e.ad} ${e.klasor}`.toLocaleLowerCase("tr").includes(q)) : evraklar;
  }, [evraklar, arama]);

  const gruplar = useMemo(() => {
    const harita = new Map<string, EvrakKaydi[]>();
    for (const e of filtreli) harita.set(e.klasor, [...(harita.get(e.klasor) ?? []), e]);
    return [...harita.entries()]
      .sort(([a], [b]) => {
        const ia = KLASOR_SIRASI.indexOf(a);
        const ib = KLASOR_SIRASI.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b, "tr");
      })
      .map(([klasor, liste]) => [klasor, [...liste].sort((x, y) => tarihKarsilastir(x, y, artan))] as const);
  }, [filtreli, artan]);

  const tarihSirali = useMemo(() => [...filtreli].sort((x, y) => tarihKarsilastir(x, y, artan)), [filtreli, artan]);
  const secili = evraklar.find((e) => e.id === seciliId) ?? null;
  const klasorler = [...new Set(evraklar.map((e) => e.klasor).concat(KLASOR_SIRASI))];

  function satir(e: EvrakKaydi, klasorGoster: boolean) {
    return (
      <button
        key={e.id}
        type="button"
        onClick={() => setSeciliId(e.id)}
        className={`flex w-full items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
          e.id === seciliId ? "bg-[var(--accent-soft)] text-[#6db8ff]" : "text-white/75 hover:bg-white/[0.06]"
        }`}
      >
        <span className="min-w-0">
          <span className="block truncate">{e.ad}</span>
          {klasorGoster && <span className="text-[11px] text-white/35">{e.klasor}</span>}
        </span>
        <span className="shrink-0 text-[11px] text-white/40">{tarihYaz(e.evrakTarihi)}</span>
      </button>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="glass rounded-2xl p-3">
        <div className="mb-2 flex gap-1 rounded-full bg-white/[0.06] p-1 text-xs">
          {(
            [
              ["klasor", "Evrak bazında"],
              ["tarih", "Tarih sıralı"],
            ] as const
          ).map(([anahtar, etiket]) => (
            <button
              key={anahtar}
              type="button"
              onClick={() => setGorunum(anahtar)}
              className={`flex-1 rounded-full px-3 py-1 ${gorunum === anahtar ? "bg-[var(--accent)] text-white" : "text-white/60"}`}
            >
              {etiket}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-2">
          <Girdi value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Evrak ara…" className="!py-1.5" />
          <button
            type="button"
            onClick={() => setArtan((a) => !a)}
            className="shrink-0 text-xs text-[#6db8ff] hover:underline"
            title="Tarih sırasını çevir"
          >
            {artan ? "Eski → yeni" : "Yeni → eski"}
          </button>
        </div>

        {evraklar.length === 0 && <p className="px-2 py-6 text-center text-sm text-white/40">Henüz evrak yok.</p>}

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
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm font-medium text-white hover:bg-white/[0.06]"
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
          : tarihSirali.map((e) => satir(e, true))}

        <div className="mt-3 border-t border-white/10 pt-2">
          <button type="button" onClick={() => setYonetimAcik((a) => !a)} className="text-xs text-[#6db8ff] hover:underline">
            {yonetimAcik ? "Evrak ekle ▲" : "+ Evrak ekle ▼"}
          </button>
          {yonetimAcik && <YuklemeFormu dosyaId={dosyaId} klasorler={klasorler} />}
        </div>
      </div>

      <div className="glass min-h-[70vh] rounded-2xl p-3">
        {secili ? (
          <Onizleme key={secili.id} dosyaId={dosyaId} evrak={secili} klasorler={klasorler} />
        ) : (
          <p className="py-24 text-center text-sm text-white/40">Soldan bir evrak seçin.</p>
        )}
      </div>
    </div>
  );
}

function YuklemeFormu({ dosyaId, klasorler }: { dosyaId: string; klasorler: string[] }) {
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

function Onizleme({ dosyaId, evrak, klasorler }: { dosyaId: string; evrak: EvrakKaydi; klasorler: string[] }) {
  const [metin, setMetin] = useState<string | null>(null);
  const [duzenle, setDuzenle] = useState(false);
  const [bekliyor, basla] = useTransition();
  const yol = `/api/cmk-evrak/${evrak.id}`;

  useEffect(() => {
    if (evrak.onizlemeTuru !== "METIN") return;
    let iptal = false;
    fetch(`${yol}?tur=metin`)
      .then((r) => r.text())
      .then((t) => {
        if (!iptal) setMetin(t);
      });
    return () => {
      iptal = true;
    };
  }, [evrak.onizlemeTuru, yol]);

  return (
    <div>
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
            Düzenle
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
      {evrak.onizlemeTuru === "RESIM" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={yol} alt={evrak.ad} className="max-h-[78vh] w-full rounded-xl bg-white object-contain" />
      )}
      {evrak.onizlemeTuru === "METIN" && (
        <pre className="max-h-[78vh] overflow-auto whitespace-pre-wrap rounded-xl bg-white/[0.04] p-4 text-sm leading-relaxed text-white/85">
          {metin ?? "Yükleniyor…"}
        </pre>
      )}
      {evrak.onizlemeTuru === "YOK" && (
        <p className="py-24 text-center text-sm text-white/40">Bu evrak türü için önizleme yok; indirerek açabilirsiniz.</p>
      )}
    </div>
  );
}
