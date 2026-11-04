"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { durumDegistir, isEkle, operasyonYapildi, smmKestim } from "./actions";
import { DURUMLAR, durumBilgisi, zamanBaskisiBilgisi } from "./durum";
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
  { k: "pano", ad: "Kanban" },
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

// Sol panelde: serbest meslek makbuzu kesilmesi beklenen vekalet ucreti girisleri. "SMM kestim" kutusu isaretlenince uyari kalkar.
function SmmUyarilari({ uyarilar }: { uyarilar: { id: string; baslik: string; dosyaId: string }[] }) {
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState("");
  if (uyarilar.length === 0) return null;
  return (
    <section aria-label="SMM kesme uyarıları" className="rounded-2xl border border-[#ffb340]/40 bg-[#ffb340]/[0.08] p-2.5">
      <h3 className="mb-2 flex items-center justify-between gap-2 px-1 text-[13px] font-semibold text-[#ffb340]">
        <span>SMM kesme uyarıları</span>
        <span className="rounded-full bg-[#ffb340]/25 px-2 text-xs">{uyarilar.length}</span>
      </h3>
      <ul className="flex max-h-[50vh] flex-col gap-1.5 overflow-y-auto">
        {uyarilar.map((u) => (
          <li key={u.id} className="rounded-lg bg-black/20 px-2.5 py-2 text-xs text-white/80">
            <Link href={`/kokpit/dava-dosyalari/${u.dosyaId}?sekme=ekonomi`} className="block leading-snug hover:underline">
              {u.baslik}
            </Link>
            <label className="mt-1.5 flex cursor-pointer items-center gap-2 font-medium text-white">
              <input
                type="checkbox"
                disabled={bekliyor}
                checked={false}
                onChange={() =>
                  basla(async () => {
                    const s = await smmKestim(u.id);
                    if (s.hata) setHata(s.hata);
                    else router.refresh();
                  })
                }
              />
              SMM kestim
            </label>
          </li>
        ))}
      </ul>
      {hata && <p className="mt-1 text-xs text-red-300">{hata}</p>}
    </section>
  );
}

export function IsListesi({ isler, kisiler, benimId, secili, bugun, seciliId, smmUyarilari = [] }: { smmUyarilari?: { id: string; baslik: string; dosyaId: string }[]; isler: Is[]; kisiler: { id: string; adSoyad: string }[]; yargiTurleri?: { id: string; ad: string }[]; benimId: string; secili: string; bugun: string; seciliId?: string }) {
  const yonlendirici = useRouter();
  const kayitliGorunum = useSyncExternalStore(gorunumAbone, gorunumOku, () => null);
  const gorunum: Gorunum = GORUNUMLER.some((g) => g.k === kayitliGorunum) ? (kayitliGorunum as Gorunum) : "liste";
  const [baslik, setBaslik] = useState("");
  const [sorumlu, setSorumlu] = useState(benimId);
  const [hata, setHata] = useState("");
  const [tamamlananlar, setTamamlananlar] = useState(false);
  const [bekliyor, basla] = useTransition();

  // Soldaki kisi panelinde secili olan: "buro" (herkes) ya da bir kisinin id'si. Adres cubugunda tasinir.
  const tumBuro = secili === "buro";
  const gorevHref = (id: string) => `/kokpit/isler?kisi=${secili}&is=${id}`;
  const seciliAd = tumBuro ? "Tüm büro" : (kisiler.find((c) => c.id === secili)?.adSoyad ?? "—");
  const bensem = secili === benimId;

  const benim = (i: Is) => i.sorumluId === benimId || i.yardimBenim;
  // Secili kisinin gorevleri (kendisi ise yardim istenenler dahil) ya da tum buro.
  const turdeki = isler.filter((i) => tumBuro || (bensem ? benim(i) : i.sorumluId === secili));
  const acikSayisi = (id: string) => isler.filter((i) => i.sorumluId === id && i.durum !== "TAMAMLANDI" && i.tur !== "OPERASYONEL").length;
  const acikSonGun = (i: Is) => i.zamanBaskisi === "SON_GUN" && i.durum !== "TAMAMLANDI";
  // Son gunlu (acik) gorevler en ustte, tarihi en yakin olan once; digerlerinin sirasi korunur.
  const sonGunSirasi = (a: Is, b: Is) => (acikSonGun(a) === acikSonGun(b) ? (acikSonGun(a) ? (a.vade || "9999").localeCompare(b.vade || "9999") : 0) : acikSonGun(a) ? -1 : 1);
  const gorunen = turdeki
    .filter((i) => i.tur === "OPERASYONEL" || tamamlananlar || i.durum !== "TAMAMLANDI")
    .sort(sonGunSirasi);

  function ekle() {
    setHata("");
    basla(async () => {
      const s = await isEkle(baslik, tumBuro ? sorumlu : secili, "", "");
      if (s.hata) setHata(s.hata);
      else if (s.id) {
        setBaslik("");
        yonlendirici.push(gorevHref(s.id));
      }
    });
  }

  const vadeRenk = (i: Is) => (i.vade && i.durum !== "TAMAMLANDI" && i.vade < bugun ? "#ff7a70" : "rgba(255,255,255,0.6)");
  const vadeYaz = (v: string) => (v ? new Date(v + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "—");
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
    <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-white/60">
      <input type="checkbox" checked={tamamlananlar} onChange={(e) => setTamamlananlar(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
      Tamamlananları da göster
    </label>
  );

  const kisiSirasi = [...kisiler].sort((a, b) => Number(b.id === benimId) - Number(a.id === benimId));
  const kisiOgesi = (aktif: boolean) => `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm md:w-full ${aktif ? "bg-[var(--accent)]/20 font-semibold text-white" : "text-white/70 hover:bg-white/10"}`;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      {/* Telegram gibi sol panel: kisiler. Birine tiklayinca sagda onun gorevleri acilir, ona yazilan gorev ona atanir. */}
      <div className="flex flex-col gap-3 md:sticky md:top-3 md:w-60 md:shrink-0">
      <SmmUyarilari uyarilar={smmUyarilari} />
      <nav aria-label="Kişiler" className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] p-2 md:flex-col md:overflow-visible">
        <Link href="/kokpit/isler?kisi=buro" className={kisiOgesi(tumBuro)}>
          <span className="min-w-0 flex-1 truncate">Tüm büro</span>
        </Link>
        {kisiSirasi.map((c) => {
          const n = acikSayisi(c.id);
          return (
            <Link key={c.id} href={`/kokpit/isler?kisi=${c.id}`} className={kisiOgesi(secili === c.id)}>
              <Avatar ad={c.adSoyad} />
              <span className="min-w-0 flex-1 truncate">{c.id === benimId ? `${c.adSoyad} (ben)` : c.adSoyad}</span>
              {n > 0 && <span className="rounded-full bg-white/15 px-2 text-xs font-semibold text-white/85">{n}</span>}
            </Link>
          );
        })}
      </nav>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-white">{bensem ? "Benim görevlerim" : seciliAd}</h2>
          <div className="ml-auto flex gap-1 rounded-full border border-white/15 p-1" role="tablist" aria-label="Görünüm">
            {GORUNUMLER.map((g) => (
              <button key={g.k} type="button" role="tab" aria-selected={gorunum === g.k} onClick={() => gorunumYaz(g.k)} className={`rounded-full px-3.5 py-1 text-sm ${gorunum === g.k ? "bg-[var(--accent)] font-semibold text-white" : "text-white/65 hover:bg-white/10"}`}>
                {g.ad}
              </button>
            ))}
          </div>
        </div>

        {/* Gorev yaz: secili kisiye atanir (tum buroda kime oldugu secilir). */}
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row">
          <input value={baslik} onChange={(e) => setBaslik(e.target.value)} onKeyDown={(e) => e.key === "Enter" && baslik.trim() && ekle()} placeholder={tumBuro ? "Görev yazın…" : bensem ? "Kendinize görev yazın…" : `${seciliAd} için görev yazın…`} className={`${alan} sm:min-w-0 sm:flex-1`} />
          {tumBuro && (
            <select value={sorumlu} onChange={(e) => setSorumlu(e.target.value)} aria-label="Kime" className={`${alan} sm:w-56`}>
              {kisiler.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id === benimId ? `${c.adSoyad} (ben)` : c.adSoyad}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={ekle} disabled={bekliyor || !baslik.trim()} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {(tumBuro ? sorumlu !== benimId : !bensem) ? "Ata" : "Ekle"}
          </button>
        </div>
        {hata && <p className="text-sm text-red-300">{hata}</p>}

      {gorunum === "liste" && filtreSatirlari}

      {gorunum === "liste" && (
        <ul className="flex flex-col gap-2">
          {gorunen.length === 0 && <li className="px-1 py-6 text-center text-sm text-white/45">Bu görünümde görev yok.</li>}
          {gorunen.map((i) => (
            <Satir key={i.id} i={i} />
          ))}
        </ul>
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
    </div>
  );
}
