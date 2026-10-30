"use client";

import { useState, useTransition } from "react";
import { talepKalemleriniKaydet } from "@/modules/dava-dosyasi/lib/actions";
import {
  ARTIS_TURLERI,
  KALEM_ONERILERI,
  KALEM_TURLERI,
  artisToplami,
  bosEkstra,
  davaDegeriYaz,
  guncelTalep,
  ilkTalep,
  type TalepEkstrasi,
} from "@/modules/dava-dosyasi/lib/dava-degeri";

const alan = "rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-sm text-white outline-none focus:border-[var(--accent)]";
const tarihYaz = (g: string) => g.split("-").reverse().join(".");
const sayiAl = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v.replace(",", ".")) || 0));

// Dava Degeri: her talep maddesi icin tutar, kalem, tur, kismi dava ve artirim/islah gecmisi.
export function TalepKalemleriPaneli({
  dosyaId,
  maddeler,
  baslangic,
}: {
  dosyaId: string;
  maddeler: string[];
  baslangic: TalepEkstrasi[];
}) {
  const [ekstralar, setEkstralar] = useState<TalepEkstrasi[]>(maddeler.map((_, i) => baslangic[i] ?? bosEkstra()));
  const [acikArtis, setAcikArtis] = useState<number | null>(null);
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

  const toplam = maddeler.reduce((t, m, i) => t + guncelTalep(m, ekstralar[i]), 0);
  const toplamArtis = ekstralar.reduce((t, e) => t + artisToplami(e), 0);
  const sakli = ekstralar.reduce((t, e, i) => (e.kismi && e.tamAlacak ? t + Math.max(0, e.tamAlacak - guncelTalep(maddeler[i], e)) : t), 0);

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
        return (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm text-white/85">
              <span className="mr-1.5 text-white/40">{i + 1}.</span>
              {metin}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-white/50">
                ₺
                <input
                  inputMode="decimal"
                  value={e.tutar ?? ""}
                  placeholder={ilk > 0 ? String(ilk) : "Tutar"}
                  onChange={(ev) => guncelle(i, { tutar: sayiAl(ev.target.value) })}
                  className={`${alan} w-32 text-right tabular-nums`}
                  aria-label="Talep tutarı"
                />
              </label>
              <input
                list="talep-kalem-onerileri"
                value={e.kalem}
                placeholder="Kalem (Cezai şart…)"
                onChange={(ev) => guncelle(i, { kalem: ev.target.value })}
                className={`${alan} min-w-0 flex-1 basis-40`}
                aria-label="Kalem"
              />
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
              {e.artislar.length > 0 && (
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-white">Güncel {davaDegeriYaz(guncelTalep(metin, e))}</span>
              )}
            </div>

            {e.kismi && (
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-3 text-sm text-white/60">
                <span>└ Alacağın tamamı: ₺</span>
                <input
                  inputMode="decimal"
                  value={e.tamAlacak ?? ""}
                  onChange={(ev) => guncelle(i, { tamAlacak: sayiAl(ev.target.value) })}
                  className={`${alan} w-32 text-right tabular-nums`}
                  aria-label="Alacağın tamamı"
                />
                {e.tamAlacak ? (
                  <span>
                    → saklı kalan <b className="text-white">{davaDegeriYaz(Math.max(0, e.tamAlacak - guncelTalep(metin, e)))}</b>
                  </span>
                ) : null}
              </div>
            )}

            {e.artislar.map((a, k) => (
              <div key={k} className="mt-1.5 flex items-center gap-2 pl-3 text-xs text-white/60">
                <span>
                  ↳ {tarihYaz(a.tarih)} · {a.tur} · <b className="text-white/85">+{davaDegeriYaz(a.tutar)}</b>
                </span>
                <button
                  type="button"
                  onClick={() => guncelle(i, { artislar: e.artislar.filter((_, x) => x !== k) })}
                  className="text-white/40 hover:text-[#ff7a70]"
                  aria-label="Artışı kaldır"
                >
                  ✕
                </button>
              </div>
            ))}

            {acikArtis === i ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-3">
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
                className="mt-1.5 pl-3 text-xs text-[var(--link)] hover:underline"
              >
                + Artırım / Islah ekle
              </button>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-white/60">
          <span>
            Toplam dava değeri: <b className="text-base text-white">{davaDegeriYaz(toplam)}</b>
          </span>
          {toplamArtis > 0 && <span>artış toplamı +{davaDegeriYaz(toplamArtis)}</span>}
          {sakli > 0 && <span>saklı kalan {davaDegeriYaz(sakli)}</span>}
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
      <p className="text-xs text-white/35">
        Formül: güncel talep = ilk talep + artış/ıslahlar; toplam dava değeri bunların toplamıdır. Belirsiz alacak davasında “talep artırımı” (HMK m.107), diğer hâllerde “ıslah” (HMK m.176-182).
      </p>
    </div>
  );
}
