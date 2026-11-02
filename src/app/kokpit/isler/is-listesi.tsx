"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { durumDegistir, isEkle, operasyonYapildi, yargiTuruAdiDegistir, yargiTuruEkle, yargiTuruSil } from "./actions";
import { DURUMLAR, TURLER, durumBilgisi, turBilgisi, zamanBaskisiBilgisi } from "./durum";
import { periyotBilgisi } from "./hafta";

type Is = {
  id: string;
  baslik: string;
  durum: string;
  tur: string;
  hedef: number;
  periyot: string;
  zamanBaskisi: string;
  yargiTuruId: string;
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

export function IsListesi({ isler, kisiler, yargiTurleri, benimId, tumBuro, bugun, seciliId }: { isler: Is[]; kisiler: { id: string; adSoyad: string }[]; yargiTurleri: { id: string; ad: string }[]; benimId: string; tumBuro: boolean; bugun: string; seciliId?: string }) {
  const yonlendirici = useRouter();
  const kayitliGorunum = useSyncExternalStore(gorunumAbone, gorunumOku, () => null);
  const gorunum: Gorunum = GORUNUMLER.some((g) => g.k === kayitliGorunum) ? (kayitliGorunum as Gorunum) : "liste";
  const [baslik, setBaslik] = useState("");
  const [sorumlu, setSorumlu] = useState(benimId);
  const [destek, setDestek] = useState("");
  const [hata, setHata] = useState("");
  const [filtre, setFiltre] = useState<string>("ACIK");
  const [turFiltre, setTurFiltre] = useState<string>("HEPSI");
  const [yargiFiltre, setYargiFiltre] = useState<string>("HEPSI");
  const [kisiSecili, setKisiSecili] = useState(benimId);
  const [bekliyor, basla] = useTransition();

  const kimin = tumBuro ? "kimin=buro&" : "";
  const gorevHref = (id: string) => `/kokpit/isler?${kimin}is=${id}`;

  const benim = (i: Is) => i.sorumluId === benimId || i.yardimBenim;
  // Donemsel gorev, baslatilmadikca (olay gerceklesmedikce) kullanicidan beklenmez.
  const beklenen = (i: Is) => benim(i) && (i.tur === "OPERASYONEL" ? i.hedef > 0 && i.yapilan < i.hedef : i.durum !== "TAMAMLANDI" && !(i.tur === "DONEMSEL" && i.durum === "BASLATILMADI"));
  const beklenenler = isler.filter(beklenen);

  // Gorunume gore kimlerin gorevleri: kisiler gorunumunde secilen kisi, digerlerinde ben / tum buro.
  const kapsam = isler.filter((i) => (gorunum === "kisiler" ? i.sorumluId === kisiSecili : tumBuro || benim(i)));
  const turdeki = kapsam.filter((i) => (turFiltre === "HEPSI" || i.tur === turFiltre) && (yargiFiltre === "HEPSI" || (yargiFiltre === "YOK" ? !i.yargiTuruId : i.yargiTuruId === yargiFiltre)));
  const acikSonGun = (i: Is) => i.zamanBaskisi === "SON_GUN" && i.durum !== "TAMAMLANDI";
  // Son gunlu (acik) gorevler en ustte, tarihi en yakin olan once; digerlerinin sirasi korunur.
  const sonGunSirasi = (a: Is, b: Is) => (acikSonGun(a) === acikSonGun(b) ? (acikSonGun(a) ? (a.vade || "9999").localeCompare(b.vade || "9999") : 0) : acikSonGun(a) ? -1 : 1);
  const gorunen = turdeki
    .filter((i) => {
      if (i.tur === "OPERASYONEL") return filtre === "ACIK" || filtre === "HEPSI";
      return filtre === "HEPSI" ? true : filtre === "ACIK" ? i.durum !== "TAMAMLANDI" : i.durum === filtre;
    })
    .sort(sonGunSirasi);

  function ekle() {
    setHata("");
    basla(async () => {
      const s = await isEkle(baslik, sorumlu, "", destek);
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
  const yargiAdi = (i: Is) => yargiTurleri.find((y) => y.id === i.yargiTuruId)?.ad ?? "";
  const BaskiRozeti = ({ i }: { i: Is }) => {
    const z = zamanBaskisiBilgisi(i.zamanBaskisi);
    if (!z || i.durum === "TAMAMLANDI") return null;
    return (
      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide" style={{ background: z.renk + "30", color: z.renk }}>
        {z.tarihEtiketi}
      </span>
    );
  };
  const DurumRozeti = ({ i }: { i: Is }) => {
    const d = durumBilgisi(i.durum);
    return i.tur === "OPERASYONEL" ? (
      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: i.yapilan >= i.hedef ? "#22c55e26" : "#14b8c426", color: i.yapilan >= i.hedef ? "#22c55e" : "#14b8c4" }}>
        {periyotBilgisi(i.periyot).bu} {i.yapilan}/{i.hedef}
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
            <BaskiRozeti i={i} />
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
            {yargiAdi(i) && <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">{yargiAdi(i)}</span>}
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
      <div className="flex flex-wrap items-center gap-1.5">
        {[{ anahtar: "HEPSI", ad: "Tüm yargı türleri" }, ...yargiTurleri.map((y) => ({ anahtar: y.id, ad: y.ad })), { anahtar: "YOK", ad: "Türü belirsiz" }].map((f) => (
          <button key={f.anahtar} type="button" onClick={() => setYargiFiltre(f.anahtar)} className={`rounded-full border px-3 py-1 text-xs ${yargiFiltre === f.anahtar ? "border-white/40 bg-white/15 text-white" : "border-white/10 text-white/55"}`}>
            {f.ad}
          </button>
        ))}
        <YargiTuruYonetimi yargiTurleri={yargiTurleri} />
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
        <p className="text-xs text-white/50">Görevi açın; tarzını (parça, artçı, süreç…), zaman baskısını ve yargı türünü görev ayrıntısında belirleyebilirsiniz.</p>
        <div className="flex flex-col gap-2 lg:flex-row">
          <input value={baslik} onChange={(e) => setBaslik(e.target.value)} onKeyDown={(e) => e.key === "Enter" && baslik.trim() && ekle()} placeholder="Yeni görev başlığı…" className={`${alan} flex-1`} />
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
                <th className="px-3 py-2.5 font-medium">Yargı türü</th>
                <th className="px-3 py-2.5 font-medium">Durum</th>
                <th className="px-3 py-2.5 font-medium">Bitiş</th>
                <th className="px-3 py-2.5 font-medium">Alt görev</th>
              </tr>
            </thead>
            <tbody>
              {gorunen.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-white/45">
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
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/65">{yargiAdi(i) || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <BaskiRozeti i={i} />
                      <DurumRozeti i={i} />
                    </span>
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

function YargiTuruYonetimi({ yargiTurleri }: { yargiTurleri: { id: string; ad: string }[] }) {
  const yonlendirici = useRouter();
  const [acik, setAcik] = useState(false);
  const [yeni, setYeni] = useState("");
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  const bitir = (s: { hata?: string }) => {
    setHata(s.hata ?? "");
    if (!s.hata) yonlendirici.refresh();
  };
  return (
    <>
      <button type="button" onClick={() => setAcik(!acik)} className="ml-1 rounded-full border border-dashed border-white/25 px-3 py-1 text-xs text-white/60 hover:bg-white/10">
        {acik ? "Kapat" : "⚙ Yargı türlerini düzenle"}
      </button>
      {acik && (
        <div className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <ul className="flex flex-col gap-1.5">
            {yargiTurleri.map((y) => (
              <li key={y.id} className="flex items-center gap-2">
                <input defaultValue={y.ad} onBlur={(e) => e.target.value.trim() !== y.ad && basla(async () => bitir(await yargiTuruAdiDegistir(y.id, e.target.value)))} className={`${alan} flex-1 py-1 text-sm`} />
                <OnayliSil ad={y.ad} onay={() => basla(async () => { await yargiTuruSil(y.id); yonlendirici.refresh(); })} />
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input value={yeni} onChange={(e) => setYeni(e.target.value)} onKeyDown={(e) => e.key === "Enter" && yeni.trim() && basla(async () => { bitir(await yargiTuruEkle(yeni)); setYeni(""); })} placeholder="+ Yeni yargı türü…" className={`${alan} flex-1 py-1 text-sm`} />
            <button type="button" disabled={bekliyor || !yeni.trim()} onClick={() => basla(async () => { bitir(await yargiTuruEkle(yeni)); setYeni(""); })} className="rounded-xl border border-white/15 px-4 text-sm text-white/80 disabled:opacity-40">
              Ekle
            </button>
          </div>
          {hata && <p className="mt-1 text-xs text-red-300">{hata}</p>}
          <p className="mt-2 text-xs text-white/40">Bir yargı türünü silerseniz o türdeki görevler silinmez, yalnızca türsüz kalır.</p>
        </div>
      )}
    </>
  );
}

function OnayliSil({ ad, onay }: { ad: string; onay: () => void }) {
  const [soruyor, setSoruyor] = useState(false);
  return soruyor ? (
    <span className="flex items-center gap-1 text-xs">
      <button type="button" onClick={onay} className="rounded-lg bg-red-500/80 px-2 py-1 font-semibold text-white" title={ad + " silinsin"}>
        Sil
      </button>
      <button type="button" onClick={() => setSoruyor(false)} className="rounded-lg border border-white/15 px-2 py-1 text-white/70">
        Vazgeç
      </button>
    </span>
  ) : (
    <button type="button" aria-label="Sil" onClick={() => setSoruyor(true)} className="px-1.5 text-white/35 hover:text-red-300">
      ✕
    </button>
  );
}
