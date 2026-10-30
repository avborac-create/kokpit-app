"use client";

import { useState, useTransition } from "react";
import {
  calisilanAvukatEkle,
  calisilanAvukatKaldir,
  sorumluAvukatiGuncelle,
  uyapVekilDurumunuGuncelle,
} from "@/modules/dava-dosyasi/lib/actions";

type Avukat = { id: string; adSoyad: string };
type DisAvukat = { id: string; adSoyad: string; buro: string | null };

// Dosya kartindaki "Vekil Bilgileri" paneli: sorumlu avukat (acilir menu) ve
// UYAP'ta vekil olarak kayitli avukatlar (onay kutulari). Buro kullanicilarina
// ek olarak, birlikte calisilan dis buro avukatlari ("Çalışılan avukatlar")
// listesi tutulur ve buradan eklenir. Her degisiklik aninda kaydedilir.
export function VekilPaneli({
  dosyaId,
  avukatlar,
  sorumluAvukatId,
  uyapVekilIdleri,
  disAvukatlar,
  disVekilIdleri,
}: {
  dosyaId: string;
  avukatlar: Avukat[];
  sorumluAvukatId: string | null;
  uyapVekilIdleri: string[];
  disAvukatlar: DisAvukat[];
  disVekilIdleri: string[];
}) {
  const [sorumlu, setSorumlu] = useState(sorumluAvukatId ?? "");
  const [vekiller, setVekiller] = useState(new Set(uyapVekilIdleri));
  const [disListe, setDisListe] = useState(disAvukatlar);
  const [disVekiller, setDisVekiller] = useState(new Set(disVekilIdleri));
  const [eklemeAcik, setEklemeAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniBuro, setYeniBuro] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [beklemede, baslat] = useTransition();

  function hataYaz(e: unknown) {
    setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
  }

  function sorumluDegisti(id: string) {
    const onceki = sorumlu;
    setSorumlu(id);
    setHata(null);
    baslat(async () => {
      try {
        await sorumluAvukatiGuncelle(dosyaId, id);
      } catch (e) {
        setSorumlu(onceki);
        hataYaz(e);
      }
    });
  }

  function vekilDegisti(id: string, kayitli: boolean, tur: "kullanici" | "dis") {
    setHata(null);
    const ayarla = tur === "dis" ? setDisVekiller : setVekiller;
    const guncelle = (acik: boolean) =>
      ayarla((o) => {
        const y = new Set(o);
        if (acik) y.add(id);
        else y.delete(id);
        return y;
      });
    guncelle(kayitli);
    baslat(async () => {
      try {
        await uyapVekilDurumunuGuncelle(dosyaId, id, kayitli, tur);
      } catch (e) {
        guncelle(!kayitli);
        hataYaz(e);
      }
    });
  }

  function disAvukatEkle() {
    setHata(null);
    baslat(async () => {
      try {
        const yeni = await calisilanAvukatEkle(yeniAd, yeniBuro);
        setDisListe((l) => (l.some((a) => a.id === yeni.id) ? l : [...l, yeni].sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"))));
        setYeniAd("");
        setYeniBuro("");
        setEklemeAcik(false);
        // Eklenen avukat bu dosyada da vekil olarak isaretlenir.
        setDisVekiller((o) => new Set(o).add(yeni.id));
        await uyapVekilDurumunuGuncelle(dosyaId, yeni.id, true, "dis");
      } catch (e) {
        hataYaz(e);
      }
    });
  }

  function disAvukatKaldir(a: DisAvukat) {
    if (!window.confirm(`"${a.adSoyad}" çalışılan avukatlar listesinden kaldırılsın mı?`)) return;
    setHata(null);
    baslat(async () => {
      try {
        await calisilanAvukatKaldir(a.id);
        setDisListe((l) => l.filter((x) => x.id !== a.id));
      } catch (e) {
        hataYaz(e);
      }
    });
  }

  const etiket = "block text-[11px] font-semibold uppercase tracking-wider text-[var(--link)]";

  return (
    <div className={beklemede ? "opacity-80" : undefined}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,18rem)_1fr]">
        <div className="alan-hucre">
          <label htmlFor="sorumlu-avukat" className={etiket}>
            Sorumlu avukat
          </label>
          <select
            id="sorumlu-avukat"
            value={sorumlu}
            onChange={(e) => sorumluDegisti(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]"
          >
            <option value="">Seçilmedi</option>
            {avukatlar.map((a) => (
              <option key={a.id} value={a.id}>
                {a.adSoyad}
              </option>
            ))}
          </select>
        </div>
        <div className="alan-hucre">
          <span className={etiket}>UYAP’ta vekil kayıtlı avukatlar</span>
          <p className="mb-1 mt-2 text-[11px] text-white/45">Büro avukatları</p>
          {avukatlar.length === 0 ? (
            <p className="text-sm text-white/55">Tanımlı avukat yok.</p>
          ) : (
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {avukatlar.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={vekiller.has(a.id)}
                    onChange={(e) => vekilDegisti(a.id, e.target.checked, "kullanici")}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  {a.adSoyad}
                </label>
              ))}
            </div>
          )}

          <p className="mb-1 mt-3 text-[11px] text-white/45">Çalışılan avukatlar (dış büro)</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {disListe.map((a) => (
              <span key={a.id} className="group flex items-center gap-2 text-sm text-white">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={disVekiller.has(a.id)}
                    onChange={(e) => vekilDegisti(a.id, e.target.checked, "dis")}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  <span>
                    {a.adSoyad}
                    {a.buro && <span className="text-white/45"> · {a.buro}</span>}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => disAvukatKaldir(a)}
                  title="Listeden kaldır"
                  className="text-xs text-white/30 hover:text-[#ff7a70] md:opacity-0 md:group-hover:opacity-100"
                >
                  ✕
                </button>
              </span>
            ))}
            {!eklemeAcik && (
              <button type="button" onClick={() => setEklemeAcik(true)} className="text-sm text-[#6db8ff] hover:underline">
                + Avukat ekle
              </button>
            )}
          </div>
          {eklemeAcik && (
            <form
              className="mt-2 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                disAvukatEkle();
              }}
            >
              <input
                autoFocus
                value={yeniAd}
                onChange={(e) => setYeniAd(e.target.value)}
                placeholder="Avukat adı soyadı"
                required
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)] sm:max-w-56"
              />
              <input
                value={yeniBuro}
                onChange={(e) => setYeniBuro(e.target.value)}
                placeholder="Büro (isteğe bağlı)"
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)] sm:max-w-56"
              />
              <button type="submit" disabled={beklemede || !yeniAd.trim()} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white disabled:opacity-50">
                Ekle
              </button>
              <button type="button" onClick={() => setEklemeAcik(false)} className="px-2 py-1.5 text-sm text-white/55 hover:text-white">
                Vazgeç
              </button>
            </form>
          )}
        </div>
      </div>
      {hata && <p className="mt-2 text-sm text-[#ff7a70]">{hata}</p>}
    </div>
  );
}
