"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  dosyaDurusmasiniOtele,
  takvimOgesiEkle,
  takvimOgesiOtele,
  takvimOgesiSil,
  takvimDosyaSecenekleri,
  takvimGunSirasiKaydet,
  takvimOgesiTamamla,
} from "./takvim-actions";

export type TakvimOgeVeri = {
  key: string;
  kaynak: "oge" | "dava" | "cmk" | "dogum";
  id: string;
  gun: number;
  saat: string | null;
  baslik: string;
  tur: "DURUSMA" | "GOREV" | "TOPLANTI" | "NOT" | "DOGUM";
  tamam: boolean;
};

export type DosyaSecenegi = { deger: string; etiket: string };

const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUN_ADLARI = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const TUR_ETIKET: Record<string, string> = { DURUSMA: "Duruşma", GOREV: "Görev", TOPLANTI: "Toplantı", NOT: "Not", DOGUM: "Doğum günü" };
const TUR_RENK: Record<string, string> = {
  DURUSMA: "bg-[#6db8ff]",
  GOREV: "bg-[#7bd88f]",
  TOPLANTI: "bg-[#c39bff]",
  NOT: "bg-[#e6c34d]",
  DOGUM: "bg-[#ff9f43]",
};

const iki = (n: number) => String(n).padStart(2, "0");

const simgeDugme =
  "flex h-6 w-6 items-center justify-center rounded-md text-xs text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-30";
const alan = "rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-sm text-white outline-none focus:border-[var(--accent)]";

export function TakvimIstemci({
  yil,
  ay,
  bugun,
  oncekiAy,
  sonrakiAy,
  buAyMi,
  ogeler: ilkOgeler,
}: {
  yil: number;
  ay: number;
  bugun: { yil: number; ay: number; gun: number };
  oncekiAy: string;
  sonrakiAy: string;
  buAyMi: boolean;
  ogeler: TakvimOgeVeri[];
}) {
  const gunSayisi = new Date(Date.UTC(yil, ay + 1, 0)).getUTCDate();
  const ilkGun = (new Date(Date.UTC(yil, ay, 1)).getUTCDay() + 6) % 7;
  const hucreler: (number | null)[] = [...Array(ilkGun).fill(null), ...Array.from({ length: gunSayisi }, (_, i) => i + 1)];
  while (hucreler.length % 7 !== 0) hucreler.push(null);

  const [secili, setSecili] = useState<number>(buAyMi ? bugun.gun : (ilkOgeler[0]?.gun ?? 1));
  const [ekleAcik, setEkleAcik] = useState(false);
  const [oteleId, setOteleId] = useState<string | null>(null);
  const [oteleTarih, setOteleTarih] = useState("");
  const [hata, setHata] = useState("");
  // Liste istemcide tutulur: her islem aninda ekrana yansir, sunucuya arka planda gider.
  const [ogeler, setOgeler] = useState<TakvimOgeVeri[]>(ilkOgeler);
  const [dosyalar, setDosyalar] = useState<DosyaSecenegi[] | null>(null);

  const gunTarihi = (g: number) => `${yil}-${iki(ay + 1)}-${iki(g)}`;
  const gununOgeleri = ogeler.filter((o) => o.gun === secili);
  const dogumlar = gununOgeleri.filter((o) => o.tur === "DOGUM");
  const digerleri = gununOgeleri.filter((o) => o.tur !== "DOGUM");
  const duzenlenebilirler = digerleri.filter((o) => o.kaynak === "oge");

  // Aninda uygula; sunucu hata verirse eski listeye don.
  function iyimser(uygula: (l: TakvimOgeVeri[]) => TakvimOgeVeri[], is: () => Promise<unknown>) {
    const onceki = ogeler;
    setHata("");
    setOgeler(uygula);
    is().catch((e) => {
      setOgeler(onceki);
      setHata(e instanceof Error ? e.message : "İşlem yapılamadı.");
    });
  }

  function dosyalariYukle() {
    if (dosyalar) return;
    takvimDosyaSecenekleri().then(setDosyalar).catch(() => setDosyalar([]));
  }

  function ekle(giris: { tarih: string; saat: string; baslik: string; tur: string; dosya: string; notlar: string }) {
    const gecici = `t-${Date.now()}`;
    const yeni: TakvimOgeVeri = {
      key: gecici,
      kaynak: "oge",
      id: gecici,
      gun: secili,
      saat: giris.saat || null,
      baslik: giris.baslik,
      tur: giris.tur as TakvimOgeVeri["tur"],
      tamam: false,
    };
    const onceki = ogeler;
    setHata("");
    setOgeler((l) => [...l, yeni]);
    takvimOgesiEkle(giris)
      .then((id) => setOgeler((l) => l.map((o) => (o.key === gecici ? { ...o, key: `o-${id}`, id } : o))))
      .catch((e) => {
        setOgeler(onceki);
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      });
  }

  function sirala(o: TakvimOgeVeri, yon: -1 | 1) {
    const idler = duzenlenebilirler.map((x) => x.key);
    const i = idler.indexOf(o.key);
    const j = i + yon;
    if (i < 0 || j < 0 || j >= idler.length) return;
    [idler[i], idler[j]] = [idler[j], idler[i]];
    iyimser(
      (l) => {
        // Ayni gunun elle girilen ogeleri, listede kapladiklari yerlere yeni sirayla yerlesir.
        const yerler = l.flatMap((x, k) => (x.gun === secili && x.kaynak === "oge" ? [k] : []));
        const harita = new Map(l.map((x) => [x.key, x]));
        const kopya = [...l];
        yerler.forEach((yer, n) => (kopya[yer] = harita.get(idler[n])!));
        return kopya;
      },
      () => takvimGunSirasiKaydet(idler.map((k) => k.replace(/^o-/, ""))),
    );
  }

  function ote(o: TakvimOgeVeri, tarih: string) {
    const [y, m, g] = tarih.split("-").map(Number);
    const ayniAy = y === yil && m === ay + 1;
    iyimser(
      (l) => (ayniAy ? l.map((x) => (x.key === o.key ? { ...x, gun: g } : x)) : l.filter((x) => x.key !== o.key)),
      () => (o.kaynak === "oge" ? takvimOgesiOtele(o.id, tarih) : dosyaDurusmasiniOtele(o.kaynak as "dava" | "cmk", o.id, tarih)),
    );
    if (ayniAy) setSecili(g);
    setOteleId(null);
  }

  const gezinti = "rounded-full px-2.5 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white";

  return (
    <section className="glass flex h-full min-w-0 flex-col rounded-3xl p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
          <Link href="/kokpit/takvim" className="hover:text-white" title="Tam ekran takvim, ajanda ve pano">
            Büro takvimi ›
          </Link>
        </h2>
        <div className="flex items-center gap-1">
          <Link href={`/kokpit?ay=${oncekiAy}`} className={gezinti} aria-label="Önceki ay">
            ‹
          </Link>
          <span className="min-w-28 text-center text-sm font-medium text-white">
            {AY_ADLARI[ay]} {yil}
          </span>
          <Link href={`/kokpit?ay=${sonrakiAy}`} className={gezinti} aria-label="Sonraki ay">
            ›
          </Link>
          {!buAyMi && (
            <Link href="/kokpit" className="ml-1 rounded-full px-2.5 py-1 text-xs text-[var(--link)] hover:bg-white/10">
              Bugün
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
        {GUN_ADLARI.map((g) => (
          <div key={g} className="pb-0.5 text-white/40">
            {g}
          </div>
        ))}
        {hucreler.map((g, i) => {
          if (g === null) return <div key={i} />;
          const turler = new Set(ogeler.filter((o) => o.gun === g).map((o) => o.tur));
          const bugunMu = buAyMi && g === bugun.gun;
          const seciliMi = g === secili;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSecili(g);
                setEkleAcik(false);
                setOteleId(null);
              }}
              className="flex flex-col items-center gap-0.5 rounded-lg py-0.5 hover:bg-white/[0.06]"
              aria-pressed={seciliMi}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] ${
                  bugunMu ? "bg-[var(--accent)] font-semibold text-white" : "text-white/85"
                } ${seciliMi && !bugunMu ? "ring-1 ring-[var(--accent)]" : ""}`}
              >
                {g}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {(["DURUSMA", "GOREV", "TOPLANTI", "NOT", "DOGUM"] as const)
                  .filter((t) => turler.has(t))
                  .map((t) => (
                    <span key={t} className={`h-1.5 w-1.5 rounded-full ${TUR_RENK[t]}`} />
                  ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
        {Object.entries(TUR_ETIKET).map(([t, ad]) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${TUR_RENK[t]}`} /> {ad}
          </span>
        ))}
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col border-t border-white/[0.08] pt-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-white">
            {secili} {AY_ADLARI[ay]}
          </h3>
          <button
            type="button"
            onClick={() => setEkleAcik((a) => !a)}
            className="rounded-full px-2.5 py-0.5 text-xs text-[var(--link)] hover:bg-white/10"
          >
            {ekleAcik ? "Vazgeç" : "+ Ekle"}
          </button>
        </div>

        {ekleAcik && <EkleFormu tarih={gunTarihi(secili)} dosyalar={dosyalar} dosyalariYukle={dosyalariYukle} onEkle={ekle} />}

        <div className="max-h-44 min-h-0 flex-1 overflow-y-auto">
          {gununOgeleri.length === 0 && !ekleAcik ? (
            <p className="py-1 text-sm text-white/40">Bu gün için kayıt yok. “+ Ekle” ile duruşma, görev, toplantı veya not girebilirsiniz.</p>
          ) : (
            <ul className="flex flex-col">
              {digerleri.map((o) => {
                const sira = duzenlenebilirler.findIndex((x) => x.key === o.key);
                return (
                  <li key={o.key} className="border-b border-white/[0.06] py-1.5 last:border-0">
                    <div className="flex items-center gap-2">
                      {o.kaynak === "oge" ? (
                        <input
                          type="checkbox"
                          checked={o.tamam}
                          onChange={(e) => {
                            const tamam = e.target.checked;
                            iyimser((l) => l.map((x) => (x.key === o.key ? { ...x, tamam } : x)), () => takvimOgesiTamamla(o.id, tamam));
                          }}
                          aria-label="Tamamlandı"
                          className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                        />
                      ) : (
                        <span className={`h-2 w-2 shrink-0 rounded-full ${TUR_RENK[o.tur]}`} />
                      )}
                      <span className={`min-w-0 flex-1 truncate text-sm ${o.tamam ? "text-white/35 line-through" : "text-white/90"}`}>
                        {o.saat && o.saat !== "00:00" && <span className="mr-1.5 text-white/50">{o.saat}</span>}
                        {o.baslik}
                      </span>
                      <span className="hidden shrink-0 text-[10px] uppercase tracking-wider text-white/35 sm:inline">{TUR_ETIKET[o.tur]}</span>
                      <span className="flex shrink-0 items-center">
                        {o.kaynak === "oge" && (
                          <>
                            <button
                              type="button"
                              className={simgeDugme}
                              disabled={sira <= 0}
                              onClick={() => sirala(o, -1)}
                              aria-label="Yukarı taşı"
                              title="Yukarı taşı"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={simgeDugme}
                              disabled={sira < 0 || sira >= duzenlenebilirler.length - 1}
                              onClick={() => sirala(o, 1)}
                              aria-label="Aşağı taşı"
                              title="Aşağı taşı"
                            >
                              ↓
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className={simgeDugme}
                          onClick={() => {
                            setOteleId(oteleId === o.key ? null : o.key);
                            setOteleTarih(gunTarihi(secili));
                          }}
                          aria-label="Ötele"
                          title="Başka güne ötele"
                        >
                          ⇥
                        </button>
                        {o.kaynak === "oge" && (
                          <button
                            type="button"
                            className={simgeDugme}
                            onClick={() => iyimser((l) => l.filter((x) => x.key !== o.key), () => takvimOgesiSil(o.id))}
                            aria-label="Sil"
                            title="Sil"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    </div>
                    {oteleId === o.key && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-5">
                        <input type="date" value={oteleTarih} onChange={(e) => setOteleTarih(e.target.value)} className={alan} />
                        <button
                          type="button"
                          className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
                          disabled={!oteleTarih}
                          onClick={() => ote(o, oteleTarih)}
                        >
                          Ötele
                        </button>
                        {o.kaynak !== "oge" && <span className="text-[11px] text-white/40">Dosyadaki duruşma tarihi de değişir.</span>}
                      </div>
                    )}
                  </li>
                );
              })}
              {dogumlar.map((o) => (
                <li key={o.key} className="flex items-center gap-2 py-1.5 text-sm text-[#ffb870]">
                  <span aria-hidden="true">🎂</span>
                  <span className="min-w-0 truncate">{o.baslik}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {hata && <p className="mt-1 text-xs text-red-300">{hata}</p>}
      </div>
    </section>
  );
}

function EkleFormu({
  tarih,
  dosyalar,
  dosyalariYukle,
  onEkle,
}: {
  tarih: string;
  dosyalar: DosyaSecenegi[] | null;
  dosyalariYukle: () => void;
  onEkle: (g: { tarih: string; saat: string; baslik: string; tur: string; dosya: string; notlar: string }) => void;
}) {
  const [tur, setTur] = useState("DURUSMA");
  const [saat, setSaat] = useState("");
  const [baslik, setBaslik] = useState("");
  const [dosya, setDosya] = useState("");
  const baslikKutusu = useRef<HTMLInputElement>(null);

  useEffect(() => {
    baslikKutusu.current?.focus();
  }, []);
  useEffect(() => {
    if (tur === "DURUSMA") dosyalariYukle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tur]);

  const dosyaEtiketi = dosyalar?.find((d) => d.deger === dosya)?.etiket ?? "";
  const sonBaslik = baslik.trim() || (tur === "DURUSMA" && dosyaEtiketi ? `Duruşma · ${dosyaEtiketi}` : "");

  // Kaydeder ve formu acik birakir: art arda giris hizli olsun.
  function gonder() {
    if (!sonBaslik) return;
    onEkle({ tarih, saat, baslik: sonBaslik, tur, dosya: tur === "DURUSMA" ? dosya : "", notlar: "" });
    setBaslik("");
    setSaat("");
    setDosya("");
    baslikKutusu.current?.focus();
  }

  return (
    <div className="mb-2 flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-2">
      <div className="flex flex-wrap gap-1.5">
        <select value={tur} onChange={(e) => setTur(e.target.value)} className={alan} aria-label="Tür">
          <option value="DURUSMA">Duruşma</option>
          <option value="GOREV">Görev</option>
          <option value="TOPLANTI">Toplantı</option>
          <option value="NOT">Not</option>
        </select>
        <input type="time" value={saat} onChange={(e) => setSaat(e.target.value)} className={alan} aria-label="Saat" />
        {tur === "DURUSMA" && (
          <select value={dosya} onChange={(e) => setDosya(e.target.value)} className={`${alan} min-w-0 flex-1`} aria-label="Dosya">
            <option value="">{dosyalar ? "Dosya seçin (isteğe bağlı)" : "Dosyalar yükleniyor…"}</option>
            {(dosyalar ?? []).map((d) => (
              <option key={d.deger} value={d.deger}>
                {d.etiket}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          ref={baslikKutusu}
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              gonder();
            }
          }}
          placeholder={tur === "DURUSMA" ? "Başlık, Enter ile kaydet (boşsa dosyadan alınır)" : "Başlık, Enter ile kaydet"}
          className={`${alan} min-w-0 flex-1`}
        />
        <button
          type="button"
          disabled={!sonBaslik}
          onClick={gonder}
          className="rounded-lg bg-[var(--accent)] px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}
