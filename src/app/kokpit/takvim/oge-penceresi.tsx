"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { takvimDosyaSecenekleri } from "../takvim-actions";
import {
  DURUMLAR,
  TAKVIMLER,
  TEKRARLAR,
  TURLER,
  googleTakvimBaglantisi,
  type Oge,
  type OgeGirdisi,
} from "./tipler";

const alan = "rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[var(--accent)]";
const etiket = "mb-1 block text-xs font-medium uppercase tracking-wider text-white/45";

// Basit zengin metin: # baslik, - madde, - [ ] / - [x] onay kutusu (alt gorev), **kalin**.
function Onizleme({ metin, onDegis }: { metin: string; onDegis: (yeni: string) => void }) {
  const satirlar = metin.split("\n");
  const kalin = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>));
  return (
    <div className="flex flex-col gap-1 text-sm text-white/85">
      {satirlar.map((s, i) => {
        const onay = /^- \[( |x)\] (.*)$/.exec(s);
        if (onay)
          return (
            <label key={i} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={onay[1] === "x"}
                onChange={() => onDegis(satirlar.map((x, k) => (k === i ? `- [${onay[1] === "x" ? " " : "x"}] ${onay[2]}` : x)).join("\n"))}
                className="mt-0.5 h-3.5 w-3.5 accent-[var(--accent)]"
              />
              <span className={onay[1] === "x" ? "text-white/40 line-through" : ""}>{kalin(onay[2])}</span>
            </label>
          );
        if (s.startsWith("# ")) return <h4 key={i} className="mt-1 text-base font-semibold text-white">{kalin(s.slice(2))}</h4>;
        if (s.startsWith("- ")) return <p key={i} className="pl-3">• {kalin(s.slice(2))}</p>;
        return s.trim() ? <p key={i}>{kalin(s)}</p> : <div key={i} className="h-2" />;
      })}
    </div>
  );
}

export function OgePenceresi({
  oge,
  varsayilanTarih,
  kisiler,
  onKaydet,
  onSil,
  onKapat,
}: {
  oge: Oge | null;
  varsayilanTarih: string;
  kisiler: { id: string; ad: string }[];
  onKaydet: (g: OgeGirdisi) => void;
  onSil: (id: string) => void;
  onKapat: () => void;
}) {
  const salt = !!oge?.turetilmis;
  const [v, setV] = useState<OgeGirdisi>(() =>
    oge
      ? { ...oge, id: oge.id }
      : {
          id: null,
          baslik: "",
          tur: "GOREV",
          takvim: "IS",
          tarih: varsayilanTarih,
          saat: null,
          bitisTarihi: null,
          bitisSaati: null,
          yer: null,
          meet: null,
          sorumluId: null,
          etiketler: [],
          durum: "BEKLIYOR",
          tamam: false,
          icerik: "",
          tekrar: null,
          tekrarBitis: null,
          dosya: null,
        },
  );
  const [etiketMetni, setEtiketMetni] = useState((oge?.etiketler ?? []).join(", "));
  const [onizle, setOnizle] = useState(false);
  const [dosyalar, setDosyalar] = useState<{ deger: string; etiket: string }[] | null>(null);
  const [hata, setHata] = useState("");
  const baslikKutusu = useRef<HTMLInputElement>(null);
  const metinKutusu = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    baslikKutusu.current?.focus();
    const kapat = (e: KeyboardEvent) => e.key === "Escape" && onKapat();
    window.addEventListener("keydown", kapat);
    return () => window.removeEventListener("keydown", kapat);
  }, [onKapat]);
  useEffect(() => {
    if (v.tur === "DURUSMA" && !salt && !dosyalar) takvimDosyaSecenekleri().then(setDosyalar).catch(() => setDosyalar([]));
  }, [v.tur, salt, dosyalar]);

  const set = <K extends keyof OgeGirdisi>(k: K, d: OgeGirdisi[K]) => setV((x) => ({ ...x, [k]: d }));

  // Secili satirin basina isaret ekler (kalin icin secimi sarar).
  function bicim(oneki: string) {
    const t = metinKutusu.current;
    if (!t) return;
    const bas = t.selectionStart;
    const son = t.selectionEnd;
    const m = v.icerik;
    if (oneki === "**") {
      set("icerik", `${m.slice(0, bas)}**${m.slice(bas, son) || "metin"}**${m.slice(son)}`);
      return;
    }
    const satirBasi = m.lastIndexOf("\n", bas - 1) + 1;
    set("icerik", `${m.slice(0, satirBasi)}${oneki}${m.slice(satirBasi)}`);
    t.focus();
  }

  function kaydet() {
    let baslik = v.baslik.trim();
    if (!baslik && v.tur === "DURUSMA" && v.dosya) {
      const e = dosyalar?.find((d) => d.deger === v.dosya)?.etiket;
      if (e) baslik = `Duruşma · ${e}`;
    }
    if (!baslik) return setHata("Başlık yazın.");
    onKaydet({ ...v, baslik, etiketler: etiketMetni.split(",").map((e) => e.trim()).filter(Boolean) });
  }

  const dosyaBaglantisi = oge?.dosya ? (oge.dosya.startsWith("d:") ? `/kokpit/dava-dosyalari/${oge.dosya.slice(2)}` : `/kokpit/cmk-dosyalari/${oge.dosya.slice(2)}`) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-10" onMouseDown={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-[var(--yuzey,#1c2432)] p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <input
            ref={baslikKutusu}
            value={v.baslik}
            disabled={salt}
            onChange={(e) => set("baslik", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !salt && (e.preventDefault(), kaydet())}
            placeholder="Başlık"
            className="min-w-0 flex-1 bg-transparent text-xl font-semibold text-white outline-none placeholder:text-white/30"
          />
          <button type="button" onClick={onKapat} className="rounded-full px-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Kapat">
            ✕
          </button>
        </div>

        {salt ? (
          <div className="flex flex-col gap-3 text-sm text-white/75">
            <p>
              {oge?.turetilmis === "dogum"
                ? "Doğum günleri Ayarlar › Kullanıcılar bölümündeki tarihten gelir."
                : "Bu duruşma dosya kaydındaki duruşma tarihinden gelir. Tarihini sürükleyerek değiştirebilirsiniz; dosyayı açarak düzenleyin."}
            </p>
            {dosyaBaglantisi && (
              <Link href={dosyaBaglantisi} className="w-fit rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white">
                Dosyayı aç
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label>
                <span className={etiket}>Takvim</span>
                <select value={v.takvim} onChange={(e) => set("takvim", e.target.value as OgeGirdisi["takvim"])} className={`${alan} w-full`}>
                  {TAKVIMLER.filter((t) => t.kod !== "DOGUM").map((t) => (
                    <option key={t.kod} value={t.kod}>
                      {t.ad}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={etiket}>Tür</span>
                <select value={v.tur} onChange={(e) => set("tur", e.target.value as OgeGirdisi["tur"])} className={`${alan} w-full`}>
                  {TURLER.map((t) => (
                    <option key={t.kod} value={t.kod}>
                      {t.ad}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={etiket}>Durum</span>
                <select value={v.durum} onChange={(e) => set("durum", e.target.value as OgeGirdisi["durum"])} className={`${alan} w-full`}>
                  {DURUMLAR.map((t) => (
                    <option key={t.kod} value={t.kod}>
                      {t.ad}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={etiket}>Sorumlu</span>
                <select value={v.sorumluId ?? ""} onChange={(e) => set("sorumluId", e.target.value || null)} className={`${alan} w-full`}>
                  <option value="">—</option>
                  {kisiler.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.ad}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label>
                <span className={etiket}>Başlangıç</span>
                <input type="date" value={v.tarih} onChange={(e) => set("tarih", e.target.value)} className={`${alan} w-full`} />
              </label>
              <label>
                <span className={etiket}>Saat</span>
                <input type="time" value={v.saat ?? ""} onChange={(e) => set("saat", e.target.value || null)} className={`${alan} w-full`} />
              </label>
              <label>
                <span className={etiket}>Bitiş (çok günlü)</span>
                <input type="date" value={v.bitisTarihi ?? ""} min={v.tarih} onChange={(e) => set("bitisTarihi", e.target.value || null)} className={`${alan} w-full`} />
              </label>
              <label>
                <span className={etiket}>Bitiş saati</span>
                <input type="time" value={v.bitisSaati ?? ""} onChange={(e) => set("bitisSaati", e.target.value || null)} className={`${alan} w-full`} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="col-span-1">
                <span className={etiket}>Tekrar</span>
                <select value={v.tekrar ?? ""} onChange={(e) => set("tekrar", (e.target.value || null) as OgeGirdisi["tekrar"])} className={`${alan} w-full`}>
                  <option value="">Tekrarlanmaz</option>
                  {TEKRARLAR.map((t) => (
                    <option key={t.kod} value={t.kod}>
                      {t.ad}
                    </option>
                  ))}
                </select>
              </label>
              {v.tekrar && (
                <label className="col-span-1">
                  <span className={etiket}>Tekrar bitişi</span>
                  <input type="date" value={v.tekrarBitis ?? ""} onChange={(e) => set("tekrarBitis", e.target.value || null)} className={`${alan} w-full`} />
                </label>
              )}
              <label className="col-span-2">
                <span className={etiket}>Yer</span>
                <input value={v.yer ?? ""} onChange={(e) => set("yer", e.target.value || null)} placeholder="Adliye, salon, adres…" className={`${alan} w-full`} />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className={etiket}>Toplantı bağlantısı (Meet / Zoom)</span>
                <input value={v.meet ?? ""} onChange={(e) => set("meet", e.target.value || null)} placeholder="https://meet.google.com/…" className={`${alan} w-full`} />
              </label>
              <label>
                <span className={etiket}>Etiketler (virgülle)</span>
                <input value={etiketMetni} onChange={(e) => setEtiketMetni(e.target.value)} placeholder="acil, istinaf, keşif" className={`${alan} w-full`} />
              </label>
            </div>

            {v.tur === "DURUSMA" && (
              <label>
                <span className={etiket}>Bağlı dosya</span>
                <select value={v.dosya ?? ""} onChange={(e) => set("dosya", e.target.value || null)} className={`${alan} w-full`}>
                  <option value="">{dosyalar ? "Dosya seçin (isteğe bağlı)" : "Dosyalar yükleniyor…"}</option>
                  {v.dosya && !dosyalar?.some((d) => d.deger === v.dosya) && <option value={v.dosya}>{oge?.dosyaEtiketi ?? v.dosya}</option>}
                  {(dosyalar ?? []).map((d) => (
                    <option key={d.deger} value={d.deger}>
                      {d.etiket}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className={`${etiket} mb-0`}>Sayfa / notlar</span>
                <div className="flex items-center gap-1 text-xs text-white/60">
                  {[
                    ["# ", "Başlık"],
                    ["- ", "• Liste"],
                    ["- [ ] ", "☐ Alt görev"],
                    ["**", "B"],
                  ].map(([o, ad]) => (
                    <button key={o} type="button" onClick={() => bicim(o)} className="rounded-md px-2 py-0.5 hover:bg-white/10 hover:text-white">
                      {ad}
                    </button>
                  ))}
                  <button type="button" onClick={() => setOnizle((x) => !x)} className="rounded-md bg-white/10 px-2 py-0.5 text-white">
                    {onizle ? "Düzenle" : "Önizle"}
                  </button>
                </div>
              </div>
              {onizle ? (
                <div className="min-h-28 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <Onizleme metin={v.icerik || "_Boş sayfa_"} onDegis={(m) => set("icerik", m)} />
                </div>
              ) : (
                <textarea
                  ref={metinKutusu}
                  value={v.icerik}
                  onChange={(e) => set("icerik", e.target.value)}
                  rows={6}
                  placeholder="Dilekçe taslağı, notlar, alt görevler (- [ ] ile onay kutusu)…"
                  className={`${alan} w-full resize-y`}
                />
              )}
            </div>
          </div>
        )}

        {hata && <p className="mt-2 text-sm text-red-300">{hata}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {oge && !salt && (
              <button type="button" onClick={() => onSil(oge.id)} className="rounded-lg px-3 py-1.5 text-[#ff8a80] hover:bg-white/10">
                Sil
              </button>
            )}
            {oge && oge.turetilmis !== "dogum" && (
              <a href={googleTakvimBaglantisi(oge)} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-1.5 text-[var(--link)] hover:bg-white/10">
                Google Takvim’e ekle
              </a>
            )}
          </div>
          {!salt && (
            <div className="flex gap-2">
              <button type="button" onClick={onKapat} className="rounded-lg px-4 py-1.5 text-sm text-white/70 hover:bg-white/10">
                Vazgeç
              </button>
              <button type="button" onClick={kaydet} className="rounded-lg bg-[var(--accent)] px-5 py-1.5 text-sm font-medium text-white">
                Kaydet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
