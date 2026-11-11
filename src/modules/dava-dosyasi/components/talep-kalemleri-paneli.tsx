"use client";

import { useState, useTransition } from "react";
import { talepKalemleriniKaydet } from "@/modules/dava-dosyasi/lib/actions";
import {
  ARTIS_TURLERI,
  KALEM_ONERILERI,
  KALEM_TURLERI,
  artisToplami,
  bosEkstra,
  PARA_BIRIMLERI,
  davaDegeriToplamlari,
  davaDegeriYaz,
  guncelTalep,
  ilkTalep,
  paraBirimi,
  toplamlariYaz,
  type ParaKodu,
  type TalepEkstrasi,
  degerEtiketleri,
} from "@/modules/dava-dosyasi/lib/dava-degeri";

const alan = "rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-sm text-white outline-none focus:border-[var(--accent)]";
const tarihYaz = (g: string) => g.split("-").reverse().join(".");
const sayiAl = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v.replace(",", ".")) || 0));

// Dava Degeri: her satirda yalniz tutar + ne icin oldugu; tur, kismi dava ve artirim/islah "..." altinda.
export function TalepKalemleriPaneli({
  dosyaId,
  maddeler,
  baslangic,
  icraMi = false,
}: {
  icraMi?: boolean;
  dosyaId: string;
  maddeler: string[];
  baslangic: TalepEkstrasi[];
}) {
  const [ekstralar, setEkstralar] = useState<TalepEkstrasi[]>(maddeler.map((_, i) => baslangic[i] ?? bosEkstra()));
  const [acikArtis, setAcikArtis] = useState<number | null>(null);
  const [acikAyrinti, setAcikAyrinti] = useState<Set<number>>(new Set());
  const [artis, setArtis] = useState<{ tarih: string; tur: string; tutar: string }>({ tarih: "", tur: "Islah", tutar: "" });
  const [degisti, setDegisti] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [bekliyor, basla] = useTransition();

  if (maddeler.length === 0) return null;

  const guncelle = (i: number, kismi: Partial<TalepEkstrasi>) => {
    setEkstralar((l) => l.map((e, k) => (k === i ? { ...e, ...kismi } : e)));
    setDegisti(true);
    setMesaj("");
  };

  const toplamMetni = toplamlariYaz(davaDegeriToplamlari(maddeler, ekstralar));
  const paraTopla = (f: (e: TalepEkstrasi, i: number) => number) => {
    const t: Partial<Record<ParaKodu, number>> = {};
    ekstralar.forEach((e, i) => {
      const v = f(e, i);
      if (v > 0) t[paraBirimi(maddeler[i], e)] = (t[paraBirimi(maddeler[i], e)] ?? 0) + v;
    });
    return toplamlariYaz(t);
  };
  const toplamArtisMetni = paraTopla((e) => artisToplami(e));
  const sakliMetni = paraTopla((e, i) => (e.kismi && e.tamAlacak ? Math.max(0, e.tamAlacak - guncelTalep(maddeler[i], e)) : 0));

  function artisEkle(i: number) {
    const tutar = sayiAl(artis.tutar);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(artis.tarih) || !tutar) {
      setMesaj("Artış için tarih ve tutar girin.");
      return;
    }
    const tur = ARTIS_TURLERI.find((t) => t === artis.tur) ?? "Islah";
    guncelle(i, { artislar: [...ekstralar[i].artislar, { tarih: artis.tarih, tur, tutar }].sort((a, b) => a.tarih.localeCompare(b.tarih)) });
    setArtis({ tarih: "", tur: "Islah", tutar: "" });
    setAcikArtis(null);
  }

  function kaydet() {
    basla(async () => {
      try {
        await talepKalemleriniKaydet(dosyaId, ekstralar);
        setDegisti(false);
        setMesaj("Kaydedildi.");
      } catch (e) {
        setMesaj(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <datalist id="talep-kalem-onerileri">
        {KALEM_ONERILERI.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      {maddeler.map((metin, i) => {
        const e = ekstralar[i];
        const ilk = ilkTalep(metin, e);
        const para = paraBirimi(metin, e);
        const simge = PARA_BIRIMLERI.find((p) => p.kod === para)?.simge ?? "₺";
        const ayrintiVar = !!e.tur || e.kismi || e.artislar.length > 0;
        const ayrintiAcik = acikAyrinti.has(i);
        return (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-sm text-white/50">
                <select value={para} onChange={(ev) => guncelle(i, { para: ev.target.value as ParaKodu })} className={`${alan} w-[4.25rem] px-1`} aria-label="Para birimi" title="Para birimi">
                  {PARA_BIRIMLERI.map((p) => (
                    <option key={p.kod} value={p.kod}>
                      {p.simge} {p.ad}
                    </option>
                  ))}
                </select>
                <input
                  inputMode="decimal"
                  value={e.tutar ?? (ilk > 0 ? String(ilk) : "")}
                  placeholder="Tutar"
                  onChange={(ev) => guncelle(i, { tutar: sayiAl(ev.target.value) })}
                  className={`${alan} w-32 text-right tabular-nums`}
                  aria-label="Tutar"
                />
              </label>
              <input
                list="talep-kalem-onerileri"
                value={e.kalem}
                placeholder="Ne için? (Cezai şart…)"
                onChange={(ev) => guncelle(i, { kalem: ev.target.value })}
                className={`${alan} min-w-0 flex-1`}
                aria-label="Ne için"
              />
              <button
                type="button"
                onClick={() => setAcikAyrinti((o) => { const y = new Set(o); if (!y.delete(i)) y.add(i); return y; })}
                aria-expanded={ayrintiAcik}
                aria-label="Ayrıntılar"
                title="Tür, kısmi dava, artırım/ıslah"
                className={`shrink-0 rounded-lg px-2 py-1 text-sm ${ayrintiVar ? "text-[var(--link)]" : "text-white/40"} hover:bg-white/10`}
              >
                {ayrintiAcik ? "▴" : "⋯"}
              </button>
            </div>

            {ayrintiAcik && (
              <div className="ml-6 flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <select value={e.tur} onChange={(ev) => guncelle(i, { tur: ev.target.value })} className={alan} aria-label="Tür">
                    <option value="">Tür</option>
                    {KALEM_TURLERI.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={e.kismi}
                      onChange={(ev) => guncelle(i, { kismi: ev.target.checked })}
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                    Kısmi dava
                  </label>
                </div>

                {e.kismi && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
                    <span>Alacağın tamamı: {simge}</span>
                    <input
                      inputMode="decimal"
                      value={e.tamAlacak ?? ""}
                      onChange={(ev) => guncelle(i, { tamAlacak: sayiAl(ev.target.value) })}
                      className={`${alan} w-32 text-right tabular-nums`}
                      aria-label="Alacağın tamamı"
                    />
                    {e.tamAlacak ? (
                      <span>
                        → saklı kalan <b className="text-white">{davaDegeriYaz(Math.max(0, e.tamAlacak - guncelTalep(metin, e)), para)}</b>
                      </span>
                    ) : null}
                  </div>
                )}

                {e.artislar.map((x, k) => (
                  <div key={k} className="flex items-center gap-2 text-xs text-white/60">
                    <span>
                      ↳ {tarihYaz(x.tarih)} · {x.tur} · <b className="text-white/85">+{davaDegeriYaz(x.tutar, para)}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => guncelle(i, { artislar: e.artislar.filter((_, y) => y !== k) })}
                      className="text-white/40 hover:text-[#ff7a70]"
                      aria-label="Artışı kaldır"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {acikArtis === i ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="date" value={artis.tarih} onChange={(ev) => setArtis({ ...artis, tarih: ev.target.value })} className={alan} aria-label="Artış tarihi" />
                    <select value={artis.tur} onChange={(ev) => setArtis({ ...artis, tur: ev.target.value })} className={alan} aria-label="Artış türü">
                      {ARTIS_TURLERI.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      inputMode="decimal"
                      value={artis.tutar}
                      onChange={(ev) => setArtis({ ...artis, tutar: ev.target.value })}
                      placeholder="Artış tutarı"
                      className={`${alan} w-32 text-right tabular-nums`}
                    />
                    <button type="button" onClick={() => artisEkle(i)} className="rounded-lg bg-[var(--accent)] px-3 py-1 text-sm font-medium text-white">
                      Ekle
                    </button>
                    <button type="button" onClick={() => setAcikArtis(null)} className="text-xs text-white/50 hover:text-white">
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAcikArtis(i);
                      setMesaj("");
                    }}
                    className="self-start text-xs text-[var(--link)] hover:underline"
                  >
                    + Artırım / Islah ekle
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-white/60">
          <span>
            {degerEtiketleri(icraMi).toplam}: <b className="text-base text-white">{toplamMetni || "—"}</b>
          </span>
          {toplamArtisMetni && <span>artış toplamı +{toplamArtisMetni}</span>}
          {sakliMetni && <span>saklı kalan {sakliMetni}</span>}
        </div>
        <div className="flex items-center gap-3">
          {mesaj && <span className="text-xs text-white/55">{mesaj}</span>}
          <button
            type="button"
            disabled={!degisti || bekliyor}
            onClick={kaydet}
            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
