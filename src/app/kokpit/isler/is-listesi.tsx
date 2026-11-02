"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { durumDegistir, isEkle, operasyonYapildi } from "./actions";
import { DURUMLAR, TURLER, durumBilgisi, turBilgisi } from "./durum";

type Is = {
  id: string;
  baslik: string;
  durum: string;
  tur: string;
  hedef: number;
  yapilan: number;
  sorumluId: string | null;
  sorumluAd: string;
  atayanAd: string;
  vade: string;
  yorumSayisi: number;
  maddeToplam: number;
  maddeTamam: number;
  yardimBenim: boolean;
  yardimIsteyen: string;
  destekMi: boolean;
  tarih: string;
};

const alan = "alan-bmw [color-scheme:dark]";

const GORUNUMLER = [
  { k: "liste", ad: "Liste" },
  { k: "tablo", ad: "Tablo" },
  { k: "pano", ad: "Pano" },
  { k: "kisiler", ad: "Kişiler" },
] as const;
type Gorunum = (typeof GORUNUMLER)[number]["k"];

// Kullanicinin sectigi gorunum tarayicida saklanir (herkes kendi arzusuna gore).
const GORUNUM_ANAHTARI = "kokpit_gorev_gorunum";
const GORUNUM_OLAYI = "kokpit-gorev-gorunum";
function gorunumAbone(f: () => void) {
  window.addEventListener("storage", f);
  window.addEventListener(GORUNUM_OLAYI, f);
  return () => {
    window.removeEventListener("storage", f);
    window.removeEventListener(GORUNUM_OLAYI, f);
  };
}
function gorunumOku(): string | null {
  try {
    return localStorage.getItem(GORUNUM_ANAHTARI);
  } catch {
    return null;
  }
}
function gorunumYaz(k: Gorunum) {
  try {
    localStorage.setItem(GORUNUM_ANAHTARI, k);
  } catch {
    // saklanamazsa yalniz bu oturumda gecerli olmaz
  }
  window.dispatchEvent(new Event(GORUNUM_OLAYI));
}

const RENKLER = ["#8fd8ff", "#f2b04c", "#45d483", "#d89cf2", "#ff9a8f", "#9fb4ff"];
function Avatar({ ad }: { ad: string }) {
  const bas = ad.trim().charAt(0).toLocaleUpperCase("tr-TR") || "?";
  let h = 0;
  for (const c of ad) h = (h * 31 + c.charCodeAt(0)) % RENKLER.length;
  return (
    <span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-[#10161c]" style={{ background: RENKLER[h] }}>
      {bas}
    </span>
  );
}

export function IsListesi({ isler, kisiler, benimId, tumBuro, bugun, seciliId }: { isler: Is[]; kisiler: { id: string; adSoyad: string }[]; benimId: string; tumBuro: boolean; bugun: string; seciliId?: string }) {
  const yonlendirici = useRouter();
  const kayitliGorunum = useSyncExternalStore(gorunumAbone, gorunumOku, () => null);
  const gorunum: Gorunum = GORUNUMLER.some((g) => g.k === kayitliGorunum) ? (kayitliGorunum as Gorunum) : "liste";
  const [baslik, setBaslik] = useState("");
  const [tur, setTur] = useState<string>("PARCA");
  const [hedef, setHedef] = useState(3);
  const [sorumlu, setSorumlu] = useState(benimId);
  const [destek, setDestek] = useState("");
  const [hata, setHata] = useState("");
  const [filtre, setFiltre] = useState<string>("ACIK");
  const [turFiltre, setTurFiltre] = useState<string>("HEPSI");
  const [kisiSecili, setKisiSecili] = useState(benimId);
  const [bekliyor, basla] = useTransition();

  const kimin = tumBuro ? "kimin=buro&" : "";
  const gorevHref = (id: string) => `/kokpit/isler?${kimin}is=${id}`;

  const benim = (i: Is) => i.sorumluId === benimId || i.yardimBenim;
  const beklenen = (i: Is) => benim(i) && (i.tur === "OPERASYONEL" ? i.hedef > 0 && i.yapilan < i.hedef : i.durum !== "TAMAMLANDI");
  const beklenenler = isler.filter(beklenen);

  // Gorunume gore kimlerin gorevleri: kisiler gorunumunde secilen kisi, digerlerinde ben / tum buro.
  const kapsam = isler.filter((i) => (gorunum === "kisiler" ? i.sorumluId === kisiSecili : tumBuro || benim(i)));
  const turdeki = kapsam.filter((i) => turFiltre === "HEPSI" || i.tur === turFiltre);
  const gorunen = turdeki.filter((i) => {
    if (i.tur === "OPERASYONEL") return filtre === "ACIK" || filtre === "HEPSI";
    return filtre === "HEPSI" ? true : filtre === "ACIK" ? i.durum !== "TAMAMLANDI" : i.durum === filtre;
  });

  function ekle() {
    setHata("");
    basla(async () => {
      const s = await isEkle(baslik, sorumlu, "", destek, tur, hedef);
      if (s.hata) setHata(s.hata);
      else if (s.id) {
        setBaslik("");
        yonlendirici.push(gorevHref(s.id));
      }
    });
  }

  const sekme = (secili: boolean) => `rounded-full px-3.5 py-1.5 text-sm ${secili ? "bg-white/15 font-semibold text-white" : "text-white/60 hover:bg-white/10"}`;
  const vadeRenk = (i: Is) => (i.vade && i.durum !== "TAMAMLANDI" && i.vade < bugun ? "#ff7a70" : "rgba(255,255,255,0.6)");
  const vadeYaz = (v: string) => (v ? new Date(v + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "—");
  const DurumRozeti = ({ i }: { i: Is }) => {
    const d = durumBilgisi(i.durum);
    return i.tur === "OPERASYONEL" ? (
      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: i.yapilan >= i.hedef ? "#22c55e26" : "#14b8c426", color: i.yapilan >= i.hedef ? "#22c55e" : "#14b8c4" }}>
        Bu hafta {i.yapilan}/{i.hedef}
      </span>
    ) : (
      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: d.renk + "26", color: d.renk }}>
        {d.ad}
      </span>
    );
  };

  function Satir({ i }: { i: Is }) {
    const t = turBilgisi(i.tur);
    const op = i.tur === "OPERASYONEL";
    return (
      <li className={`rounded-2xl border bg-white/[0.04] hover:bg-white/[0.07] ${seciliId === i.id ? "border-[var(--accent)]" : "border-white/10"}`}>
        <Link href={gorevHref(i.id)} scroll={false} className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 text-[15px] font-medium text-white">{i.baslik}</span>
            <DurumRozeti i={i} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/50">
            <span className="font-semibold" style={{ color: t.renk }}>
              {t.kisa}
            </span>
            {i.yardimBenim && i.sorumluId !== benimId && (
              <span className="rounded-full bg-[#8b5cf6]/25 px-2 py-0.5 font-semibold text-[#c4b5fd]">
                🤝 {i.destekMi ? "Destek" : "Yardım"}
                {i.yardimIsteyen ? ` · ${i.yardimIsteyen} ${i.destekMi ? "atadı" : "istedi"}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Avatar ad={i.sorumluAd} />
              {i.sorumluAd}
            </span>
            {i.maddeToplam > 0 && (
              <span>
                ☑ {i.maddeTamam}/{i.maddeToplam}
              </span>
            )}
            {i.yorumSayisi > 0 && <span>💬 {i.yorumSayisi}</span>}
            {i.vade && <span style={{ color: vadeRenk(i) }}>📅 {vadeYaz(i.vade)}</span>}
            <span className="ml-auto">{i.tarih}</span>
          </div>
        </Link>
        {op && i.yapilan < i.hedef && benim(i) && (
          <div className="border-t border-white/10 px-4 py-2">
            <button type="button" disabled={bekliyor} onClick={() => basla(async () => { await operasyonYapildi(i.id); yonlendirici.refresh(); })} className="rounded-lg bg-[#14b8c4]/25 px-4 py-1.5 text-sm font-semibold text-[#7ee8ef] disabled:opacity-50">
              Yaptım ✓
            </button>
          </div>
        )}
      </li>
    );
  }

  const filtreSatirlari = (
    <>
      <div className="flex flex-wrap gap-1.5">
        {[{ anahtar: "HEPSI", ad: "Tüm türler" }, ...TURLER.map((t) => ({ anahtar: t.anahtar as string, ad: t.ad }))].map((f) => (
          <button key={f.anahtar} type="button" onClick={() => setTurFiltre(f.anahtar)} className={`rounded-full border px-3 py-1 text-xs ${turFiltre === f.anahtar ? "border-white/40 bg-white/15 text-white" : "border-white/10 text-white/55"}`}>
            {f.ad}
          </button>
        ))}
      </div>
      {gorunum !== "pano" && (
        <div className="flex flex-wrap gap-1.5">
          {[{ anahtar: "ACIK", ad: "Açık olanlar" }, ...DURUMLAR.map((d) => ({ anahtar: d.anahtar as string, ad: d.ad })), { anahtar: "HEPSI", ad: "Hepsi" }].map((f) => (
            <button key={f.anahtar} type="button" onClick={() => setFiltre(f.anahtar)} className={`rounded-full border px-3 py-1 text-xs ${filtre === f.anahtar ? "border-white/40 bg-white/15 text-white" : "border-white/10 text-white/55"}`}>
              {f.ad}
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/kokpit/isler" className={sekme(!tumBuro)}>
          Benim görevlerim
        </Link>
        <Link href="/kokpit/isler?kimin=buro" className={sekme(tumBuro)}>
          Tüm büro
        </Link>
        <div className="ml-auto flex gap-1 rounded-full border border-white/15 p-1" role="tablist" aria-label="Görünüm">
          {GORUNUMLER.map((g) => (
            <button key={g.k} type="button" role="tab" aria-selected={gorunum === g.k} onClick={() => gorunumYaz(g.k)} className={`rounded-full px-3.5 py-1 text-sm ${gorunum === g.k ? "bg-[var(--accent)] font-semibold text-white" : "text-white/65 hover:bg-white/10"}`}>
              {g.ad}
            </button>
          ))}
        </div>
      </div>

      {/* Yeni gorev / atama */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
        <div className="flex flex-wrap gap-1.5">
          {TURLER.map((t) => (
            <button key={t.anahtar} type="button" onClick={() => setTur(t.anahtar)} className="rounded-full border px-3.5 py-1.5 text-sm font-medium" style={tur === t.anahtar ? { background: t.renk, borderColor: t.renk, color: "#fff" } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}>
              {t.ad}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/50">{turBilgisi(tur).aciklama}</p>
        <div className="flex flex-col gap-2 lg:flex-row">
          <input value={baslik} onChange={(e) => setBaslik(e.target.value)} onKeyDown={(e) => e.key === "Enter" && baslik.trim() && ekle()} placeholder="Yeni görev başlığı…" className={`${alan} flex-1`} />
          {tur === "OPERASYONEL" && (
            <label className="flex items-center gap-1.5 text-sm text-white/65">
              Haftada
              <input type="number" min={1} max={14} value={hedef} onChange={(e) => setHedef(Number(e.target.value))} className={`${alan} w-16 px-2`} />
              kez
            </label>
          )}
          <label className="flex items-center gap-1.5 text-sm text-white/65">
            <span className="whitespace-nowrap">Kime:</span>
            <select value={sorumlu} onChange={(e) => setSorumlu(e.target.value)} className={alan}>
              {kisiler.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id === benimId ? `${c.adSoyad} (ben)` : c.adSoyad}
                </option>
              ))}
            </select>
          </label>
          <select value={destek} onChange={(e) => setDestek(e.target.value)} className={alan} title="Destek (yardımcı) kişi">
            <option value="">Destek yok</option>
            {kisiler.filter((c) => c.id !== sorumlu).map((c) => (
              <option key={c.id} value={c.id}>
                Destek: {c.adSoyad}
              </option>
            ))}
          </select>
          <button type="button" onClick={ekle} disabled={bekliyor || !baslik.trim()} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {sorumlu && sorumlu !== benimId ? "Ata" : "Aç"}
          </button>
        </div>
      </div>
      {hata && <p className="text-sm text-red-300">{hata}</p>}

      {gorunum === "kisiler" && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {kisiler.map((c) => {
            const acik = isler.filter((i) => i.sorumluId === c.id && i.durum !== "TAMAMLANDI").length;
            const gecik = isler.filter((i) => i.sorumluId === c.id && i.durum !== "TAMAMLANDI" && i.vade && i.vade < bugun).length;
            return (
              <button key={c.id} type="button" onClick={() => setKisiSecili(c.id)} className={`min-w-[140px] rounded-xl border p-3 text-center ${kisiSecili === c.id ? "border-[var(--accent)] bg-[var(--accent)]/15" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}>
                <span className="mx-auto mb-1 block w-fit">
                  <Avatar ad={c.adSoyad} />
                </span>
                <b className="block text-sm text-white">{c.adSoyad}</b>
                <small className="text-white/55">
                  {acik} açık{gecik > 0 ? ` · ${gecik} gecikmiş` : ""}
                </small>
              </button>
            );
          })}
        </div>
      )}

      {gorunum === "liste" && !tumBuro && (
        <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-3.5">
          <h2 className="mb-2 text-base font-semibold text-white">
            Şu an benden beklenenler <span className="text-white/55">· {beklenenler.length}</span>
          </h2>
          {beklenenler.length === 0 ? (
            <p className="text-sm text-[#7be6a8]">✓ Şu an sizden beklenen bir şey yok.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {beklenenler.map((i) => (
                <Satir key={i.id} i={i} />
              ))}
            </ul>
          )}
        </div>
      )}

      {filtreSatirlari}

      {(gorunum === "liste" || gorunum === "kisiler") && (
        <ul className="flex flex-col gap-2">
          {gorunen.length === 0 && <li className="px-1 py-6 text-center text-sm text-white/45">Bu görünümde görev yok.</li>}
          {gorunen.map((i) => (
            <Satir key={i.id} i={i} />
          ))}
        </ul>
      )}

      {gorunum === "tablo" && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="px-3 py-2.5 font-medium">Görev</th>
                <th className="px-3 py-2.5 font-medium">Sorumlu</th>
                <th className="px-3 py-2.5 font-medium">Atayan</th>
                <th className="px-3 py-2.5 font-medium">Tür</th>
                <th className="px-3 py-2.5 font-medium">Durum</th>
                <th className="px-3 py-2.5 font-medium">Bitiş</th>
                <th className="px-3 py-2.5 font-medium">Alt görev</th>
              </tr>
            </thead>
            <tbody>
              {gorunen.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-white/45">
                    Bu görünümde görev yok.
                  </td>
                </tr>
              )}
              {gorunen.map((i) => (
                <tr key={i.id} className={`border-t border-white/[0.07] hover:bg-white/[0.06] ${seciliId === i.id ? "bg-[var(--accent)]/12" : ""}`}>
                  <td className="px-3 py-2.5">
                    <Link href={gorevHref(i.id)} scroll={false} className="font-medium text-white hover:underline">
                      {i.baslik}
                    </Link>
                    {i.yorumSayisi > 0 && <span className="ml-2 text-xs text-white/45">💬 {i.yorumSayisi}</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-white/85">
                      <Avatar ad={i.sorumluAd} />
                      {i.sorumluAd}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/60">{i.atayanAd}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold" style={{ color: turBilgisi(i.tur).renk }}>
                    {turBilgisi(i.tur).kisa}
                  </td>
                  <td className="px-3 py-2.5">
                    <DurumRozeti i={i} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5" style={{ color: vadeRenk(i) }}>
                    {vadeYaz(i.vade)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/60">{i.maddeToplam > 0 ? `☑ ${i.maddeTamam}/${i.maddeToplam}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {gorunum === "pano" && (
        <div className="grid grid-cols-[repeat(4,minmax(220px,1fr))] gap-3 overflow-x-auto pb-2">
          {DURUMLAR.map((d, di) => {
            const kolon = turdeki.filter((i) => i.durum === d.anahtar);
            const sonraki = DURUMLAR[di + 1];
            return (
              <div key={d.anahtar} className="rounded-xl bg-white/[0.04] p-2.5">
                <h3 className="mb-2 flex items-center justify-between px-1 text-[13px] font-semibold" style={{ color: d.renk }}>
                  {d.ad}
                  <span className="text-white/45">{kolon.length}</span>
                </h3>
                <div className="flex flex-col gap-2">
                  {kolon.map((i) => (
                    <div key={i.id} className={`rounded-xl border bg-[var(--background-2)] p-2.5 ${seciliId === i.id ? "border-[var(--accent)]" : "border-white/10"}`}>
                      <Link href={gorevHref(i.id)} scroll={false} className="block text-[14px] font-medium text-white hover:underline">
                        {i.baslik}
                      </Link>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-white/55">
                        <Avatar ad={i.sorumluAd} />
                        <span className="truncate">{i.sorumluAd}</span>
                        {i.maddeToplam > 0 && (
                          <span className="ml-1">
                            ☑ {i.maddeTamam}/{i.maddeToplam}
                          </span>
                        )}
                        {i.vade && (
                          <span className="ml-auto whitespace-nowrap" style={{ color: vadeRenk(i) }}>
                            {vadeYaz(i.vade)}
                          </span>
                        )}
                      </div>
                      {sonraki && (
                        <button type="button" disabled={bekliyor} onClick={() => basla(async () => { await durumDegistir(i.id, sonraki.anahtar); yonlendirici.refresh(); })} className="mt-2 w-full rounded-lg border border-white/12 py-1 text-xs text-white/65 hover:bg-white/10 disabled:opacity-40">
                          {sonraki.ad} →
                        </button>
                      )}
                    </div>
                  ))}
                  {kolon.length === 0 && <p className="px-1 py-3 text-center text-xs text-white/35">Boş</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
