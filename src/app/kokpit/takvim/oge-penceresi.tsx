"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { takvimDosyaSecenekleri } from "../takvim-actions";
import {
  DURUMLAR,
  SECILEBILIR_TAKVIMLER,
  TEKRARLAR,
  TURLER,
  googleTakvimBaglantisi,
  gunEkle,
  takvimRengi,
  type Oge,
  type OgeGirdisi,
} from "./tipler";

const alan = "alan-bmw [color-scheme:dark]";
const etiket = "mb-1 block text-xs font-medium text-white/55";
const bolumBasligi = "text-sm font-semibold text-white/85";
// Secenek dugmesi: secili olan dolu, digerleri hafif cizgili. kucuk = ikincil sira, yesil = Tamamlandi.
const cip = (secili: boolean, kucuk = false, yesil = false) =>
  `rounded-full border ${kucuk ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm font-medium"} transition-colors ${
    secili
      ? yesil
        ? "border-[#34c77b] bg-[#34c77b]/20 text-[#7be6a8]"
        : "border-[var(--accent)] bg-[var(--accent)]/20 text-white"
      : "border-white/15 text-white/65 hover:bg-white/[0.06]"
  }`;

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
  // "is": Gorevler modulundeki son gunlu is; baslik, son gun, sorumlu, durum ve aciklama burada duzenlenir.
  const isMi = oge?.turetilmis === "is";
  const salt = !!oge?.turetilmis && !isMi;
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

  const [ekAcik, setEkAcik] = useState(Boolean(v.yer || v.meet || etiketMetni.trim()) || v.tur === "DURUSMA" || v.tur === "TOPLANTI");
  const [bitisAcik, setBitisAcik] = useState(Boolean(v.bitisTarihi || v.bitisSaati));

  const dosyaBaglantisi = oge?.dosya ? (oge.dosya.startsWith("d:") ? `/kokpit/dava-dosyalari/${oge.dosya.slice(2)}` : `/kokpit/cmk-dosyalari/${oge.dosya.slice(2)}`) : null;

  const bugun = new Date().toLocaleDateString("sv-SE");
  const hizliTarihler = [
    ["Bugün", bugun],
    ["Yarın", gunEkle(bugun, 1)],
    ["Haftaya", gunEkle(bugun, 7)],
  ] as const;
  const altGorevToplam = (v.icerik.match(/^- \[( |x)\] /gm) ?? []).length;
  const altGorevTamam = (v.icerik.match(/^- \[x\] /gm) ?? []).length;
  const turAdi = TURLER.find((t) => t.kod === v.tur)?.ad ?? "Görev";
  const baslikIpucu = { GOREV: "Ne yapılacak?", DURUSMA: "Hangi duruşma?", TOPLANTI: "Toplantı konusu?", NOT: "Not başlığı" }[v.tur];
  const renk = takvimRengi(v.takvim);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-start sm:p-4 sm:pt-10" onMouseDown={(e) => e.target === e.currentTarget && onKapat()}>
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-[var(--yuzey,#1c2432)] shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl">
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: renk }} />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/50">{salt ? "Takvim kaydı" : isMi ? "Son günlü görev · düzenle" : oge ? `${turAdi} · düzenle` : `Yeni ${turAdi.toLocaleLowerCase("tr")}`}</p>
              <input
                ref={baslikKutusu}
                value={v.baslik}
                disabled={salt}
                onChange={(e) => set("baslik", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !salt && (e.preventDefault(), kaydet())}
                placeholder={baslikIpucu}
                className="mt-1 w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-white/30"
              />
            </div>
            <button type="button" onClick={onKapat} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white" aria-label="Kapat">
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
            <div className="flex flex-col gap-5">
              {!isMi && (
                <div className="flex flex-wrap gap-2">
                  {TURLER.map((t) => (
                    <button key={t.kod} type="button" onClick={() => set("tur", t.kod)} className={cip(v.tur === t.kod)}>
                      {t.ad}
                    </button>
                  ))}
                </div>
              )}

              <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className={bolumBasligi}>{isMi ? "Son gün" : "Ne zaman?"}</p>
                <div className="flex flex-wrap gap-2">
                  {hizliTarihler.map(([ad, g]) => (
                    <button key={ad} type="button" onClick={() => set("tarih", g)} className={cip(v.tarih === g, true)}>
                      {ad}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <label className="min-w-0 flex-1">
                    <span className={etiket}>Tarih</span>
                    <input type="date" value={v.tarih} onChange={(e) => set("tarih", e.target.value)} className={`${alan} w-full min-w-0`} />
                  </label>
                  {!isMi && (
                    <label className="w-[8.5rem] shrink-0">
                      <span className={etiket}>Saat</span>
                      <input type="time" value={v.saat ?? ""} onChange={(e) => set("saat", e.target.value || null)} className={`${alan} w-full min-w-0`} />
                    </label>
                  )}
                </div>
                {isMi ? null : bitisAcik ? (
                  <div className="flex gap-2">
                    <label className="min-w-0 flex-1">
                      <span className={etiket}>Bitiş tarihi</span>
                      <input type="date" value={v.bitisTarihi ?? ""} min={v.tarih} onChange={(e) => set("bitisTarihi", e.target.value || null)} className={`${alan} w-full min-w-0`} />
                    </label>
                    <label className="w-[8.5rem] shrink-0">
                      <span className={etiket}>Bitiş saati</span>
                      <input type="time" value={v.bitisSaati ?? ""} onChange={(e) => set("bitisSaati", e.target.value || null)} className={`${alan} w-full min-w-0`} />
                    </label>
                  </div>
                ) : (
                  <button type="button" onClick={() => setBitisAcik(true)} className="w-fit text-sm text-[var(--link)] hover:underline">
                    + Bitiş ekle (çok günlü ya da saat aralığı)
                  </button>
                )}
                {!isMi && (
                <div>
                  <span className={etiket}>Tekrar</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => set("tekrar", null)} className={cip(!v.tekrar, true)}>
                      Tekrarlanmaz
                    </button>
                    {TEKRARLAR.map((t) => (
                      <button key={t.kod} type="button" onClick={() => set("tekrar", t.kod)} className={cip(v.tekrar === t.kod, true)}>
                        {t.ad}
                      </button>
                    ))}
                  </div>
                  {v.tekrar && (
                    <label className="mt-2 block">
                      <span className={etiket}>Tekrar bitişi (isteğe bağlı)</span>
                      <input type="date" value={v.tekrarBitis ?? ""} onChange={(e) => set("tekrarBitis", e.target.value || null)} className={`${alan} w-full min-w-0`} />
                    </label>
                  )}
                </div>
                )}
              </section>

              <section className="flex flex-col gap-3">
                <p className={bolumBasligi}>Durum ve sorumlu</p>
                <div className="flex flex-wrap gap-2">
                  {DURUMLAR.map((t) => (
                    <button key={t.kod} type="button" onClick={() => set("durum", t.kod)} className={cip(v.durum === t.kod, true, t.kod === "TAMAM")}>
                      {t.kod === "TAMAM" ? "✓ " : ""}
                      {t.ad}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {!isMi && (
                    <label>
                      <span className={etiket}>Takvim</span>
                      <select value={v.takvim} onChange={(e) => set("takvim", e.target.value as OgeGirdisi["takvim"])} className={`${alan} w-full min-w-0`}>
                        {SECILEBILIR_TAKVIMLER.map((t) => (
                          <option key={t.kod} value={t.kod}>
                            {t.ad}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    <span className={etiket}>Sorumlu</span>
                    <select value={v.sorumluId ?? ""} onChange={(e) => set("sorumluId", e.target.value || null)} className={`${alan} w-full min-w-0`}>
                      <option value="">Atanmadı</option>
                      {kisiler.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.ad}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {v.tur === "DURUSMA" && (
                <label>
                  <span className={etiket}>Bağlı dosya</span>
                  <select value={v.dosya ?? ""} onChange={(e) => set("dosya", e.target.value || null)} className={`${alan} w-full min-w-0`}>
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

              {isMi && oge && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Link href={`/kokpit/isler/${oge.id.slice(2)}`} className="rounded-lg bg-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/15">
                    Görev sayfasını aç
                  </Link>
                  {dosyaBaglantisi && (
                    <Link href={dosyaBaglantisi} className="text-[var(--link)] hover:underline">
                      Bağlı dosya: {oge.dosyaEtiketi}
                    </Link>
                  )}
                </div>
              )}

              {!isMi && (
              <section className="flex flex-col gap-3">
                {ekAcik ? (
                  <>
                    <p className={bolumBasligi}>Yer, bağlantı ve etiket</p>
                    <label>
                      <span className={etiket}>Yer</span>
                      <input value={v.yer ?? ""} onChange={(e) => set("yer", e.target.value || null)} placeholder="Adliye, salon, adres…" className={`${alan} w-full min-w-0`} />
                    </label>
                    <label>
                      <span className={etiket}>Toplantı bağlantısı (Meet / Zoom)</span>
                      <input value={v.meet ?? ""} onChange={(e) => set("meet", e.target.value || null)} placeholder="https://meet.google.com/…" className={`${alan} w-full min-w-0`} />
                    </label>
                    <label>
                      <span className={etiket}>Etiketler (virgülle ayırın)</span>
                      <input value={etiketMetni} onChange={(e) => setEtiketMetni(e.target.value)} placeholder="acil, istinaf, keşif" className={`${alan} w-full min-w-0`} />
                    </label>
                  </>
                ) : (
                  <button type="button" onClick={() => setEkAcik(true)} className="w-fit text-sm text-[var(--link)] hover:underline">
                    + Yer, toplantı bağlantısı, etiket ekle
                  </button>
                )}
              </section>
              )}

              <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className={bolumBasligi}>{isMi ? "Açıklama" : "Notlar ve alt görevler"}</p>
                  <div className="flex items-center gap-1 text-xs text-white/60">
                    {[
                      ["# ", "Başlık"],
                      ["- ", "• Liste"],
                      ["- [ ] ", "☐ Alt görev"],
                      ["**", "B"],
                    ].map(([o, ad]) => (
                      <button key={o} type="button" onClick={() => bicim(o)} className="rounded-md px-2 py-1 hover:bg-white/10 hover:text-white">
                        {ad}
                      </button>
                    ))}
                    <button type="button" onClick={() => setOnizle((x) => !x)} className="rounded-md bg-white/10 px-2 py-1 text-white">
                      {onizle ? "Düzenle" : "Önizle"}
                    </button>
                  </div>
                </div>
                {altGorevToplam > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 flex justify-between text-xs text-white/60">
                      <span>{altGorevTamam === altGorevToplam ? "Hepsi tamam, harika!" : `${altGorevTamam}/${altGorevToplam} alt görev tamam`}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-[#34c77b] transition-all" style={{ width: `${(altGorevTamam / altGorevToplam) * 100}%` }} />
                    </div>
                  </div>
                )}
                {onizle ? (
                  <div className="min-h-28 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <Onizleme metin={v.icerik || "_Boş sayfa_"} onDegis={(m) => set("icerik", m)} />
                  </div>
                ) : (
                  <textarea
                    ref={metinKutusu}
                    value={v.icerik}
                    onChange={(e) => set("icerik", e.target.value)}
                    rows={5}
                    placeholder="Dilekçe taslağı, notlar, alt görevler (- [ ] ile onay kutusu)…"
                    className={`${alan} w-full resize-y`}
                  />
                )}
              </section>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[var(--yuzey,#1c2432)] px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3">
          {hata && <p className="mb-2 text-sm text-red-300">{hata}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {oge && !salt && !isMi && (
                <button type="button" onClick={() => onSil(oge.id)} className="rounded-lg px-3 py-2 text-[#ff8a80] hover:bg-white/10">
                  Sil
                </button>
              )}
              {oge && oge.turetilmis !== "dogum" && (
                <a href={googleTakvimBaglantisi(oge)} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2 text-[var(--link)] hover:bg-white/10">
                  Google Takvim’e ekle
                </a>
              )}
            </div>
            {!salt && (
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={onKapat} className="rounded-xl px-4 py-2.5 text-sm text-white/70 hover:bg-white/10">
                  Vazgeç
                </button>
                <button type="button" onClick={kaydet} className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white active:opacity-80">
                  Kaydet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
