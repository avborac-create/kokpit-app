"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AY_ADLARI, GUN_ADLARI, GUN_ADLARI_UZUN, ayBasi, ayEkle, gunBicimi, gunEkle, haftaBasi, haftaninGunu, ornekleriUret, takvimRengi, type Oge } from "../takvim/tipler";
import { durumBilgisi, sinifBilgisi } from "./durum";

export type TakvimGorevi = { id: string; baslik: string; durum: string; vade: string; sorumluAd: string; sinif: string };

// Gorevler sayfasi icin kisiye ozel takvim: gorevlerin vade gunleri + kisiye atanmis buro takvimi ogeleri (duruşma, toplanti...).
export function TakvimGorunumu({
  gorevler,
  ogeler,
  bugun,
  gorevHref,
  seciliId,
  ekle,
  bekliyor,
}: {
  gorevler: TakvimGorevi[];
  ogeler: Oge[];
  bugun: string;
  gorevHref: (id: string) => string;
  seciliId?: string;
  ekle: (baslik: string, gun: string) => void;
  bekliyor: boolean;
}) {
  const [ay, setAy] = useState(ayBasi(bugun));
  const [gun, setGun] = useState(bugun);
  const [baslik, setBaslik] = useState("");

  const ilk = haftaBasi(ay);
  const gunler = Array.from({ length: 42 }, (_, i) => gunEkle(ilk, i));
  const ornekler = useMemo(() => ornekleriUret(ogeler, gunler[0], gunler[41]), [ogeler, gunler[0], gunler[41]]); // eslint-disable-line react-hooks/exhaustive-deps

  const gundeki = (g: string) => ({
    g: gorevler.filter((x) => x.vade === g),
    o: ornekler.filter((x) => x.gun === g).map((x) => x.oge),
  });
  const tarihsiz = gorevler.filter((x) => !x.vade && x.durum !== "TAMAMLANDI");
  const ayNo = Number(ay.slice(5, 7));
  const secimi = gundeki(gun);

  const gorevChip = (x: TakvimGorevi, kisa: boolean) => {
    const bitti = x.durum === "TAMAMLANDI";
    const gecmis = !bitti && x.vade < bugun;
    const renk = bitti ? "#22c55e" : gecmis ? "#ff7a70" : (sinifBilgisi(x.sinif)?.renk ?? durumBilgisi(x.durum).renk);
    return (
      <Link key={x.id} href={gorevHref(x.id)} scroll={false} title={x.baslik} className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight hover:brightness-125 ${seciliId === x.id ? "ring-1 ring-[var(--accent)]" : ""} ${bitti ? "line-through opacity-60" : ""}`} style={{ background: renk + "30", color: renk }}>
        {kisa ? "" : "☑ "}
        {x.baslik}
      </Link>
    );
  };
  const ogeChip = (o: Oge) => {
    const renk = takvimRengi(o.takvim);
    return (
      <span key={o.id} title={o.baslik} className="block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight" style={{ background: renk + "22", color: renk }}>
        {o.saat ? `${o.saat} ` : ""}
        {o.baslik}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-white">
          {AY_ADLARI[ayNo - 1]} {ay.slice(0, 4)}
        </h3>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Önceki ay" onClick={() => setAy(ayEkle(ay, -1))} className="rounded-lg border border-white/15 px-3 py-1 text-sm text-white/75 hover:bg-white/10">
            ‹
          </button>
          <button type="button" onClick={() => { setAy(ayBasi(bugun)); setGun(bugun); }} className="rounded-lg border border-white/15 px-3 py-1 text-sm text-white/75 hover:bg-white/10">
            Bugün
          </button>
          <button type="button" aria-label="Sonraki ay" onClick={() => setAy(ayEkle(ay, 1))} className="rounded-lg border border-white/15 px-3 py-1 text-sm text-white/75 hover:bg-white/10">
            ›
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
          {GUN_ADLARI.map((a) => (
            <div key={a} className="bg-white/[0.06] px-2 py-1 text-center text-xs font-semibold text-white/55">
              {a}
            </div>
          ))}
          {gunler.map((g) => {
            const { g: gv, o } = gundeki(g);
            const buAy = Number(g.slice(5, 7)) === ayNo;
            const hepsi = [...gv.map((x) => ({ t: "g" as const, x })), ...o.map((x) => ({ t: "o" as const, x }))];
            const gorunur = hepsi.slice(0, 3);
            return (
              <div
                key={g}
                role="button"
                tabIndex={0}
                onClick={() => setGun(g)}
                onKeyDown={(e) => e.key === "Enter" && setGun(g)}
                className={`flex min-h-[88px] cursor-pointer flex-col gap-0.5 p-1 ${buAy ? "bg-[var(--background-2)]" : "bg-black/20"} ${gun === g ? "outline outline-2 -outline-offset-2 outline-[var(--accent)]" : ""}`}
              >
                <span className={`mb-0.5 self-end rounded-full px-1.5 text-[11px] ${g === bugun ? "bg-[var(--accent)] font-bold text-white" : buAy ? "text-white/70" : "text-white/30"}`}>{Number(g.slice(8))}</span>
                {gorunur.map((h) => (h.t === "g" ? gorevChip(h.x, true) : ogeChip(h.x)))}
                {hepsi.length > 3 && <span className="px-1 text-[11px] text-white/45">+{hepsi.length - 3} daha</span>}
              </div>
            );
          })}
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <h4 className="mb-2 text-sm font-semibold text-white">
          {gunBicimi(gun)} · {GUN_ADLARI_UZUN[haftaninGunu(gun)]}
        </h4>
        {secimi.g.length + secimi.o.length === 0 && <p className="mb-2 text-xs text-white/45">Bu günde görev veya takvim kaydı yok.</p>}
        <div className="mb-2 flex flex-col gap-1">
          {secimi.o.map((o) => ogeChip(o))}
          {secimi.g.map((x) => gorevChip(x, false))}
        </div>
        <div className="flex gap-2">
          <input
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && baslik.trim()) {
                ekle(baslik, gun);
                setBaslik("");
              }
            }}
            placeholder={`${gunBicimi(gun)} için görev yazın…`}
            className="alan-bmw [color-scheme:dark] min-w-0 flex-1"
          />
          <button type="button" disabled={bekliyor || !baslik.trim()} onClick={() => { ekle(baslik, gun); setBaslik(""); }} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Ekle
          </button>
        </div>
      </section>

      {tarihsiz.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <h4 className="mb-2 text-sm font-semibold text-white/80">
            Tarihsiz görevler <span className="ml-1 rounded-full bg-white/10 px-2 text-xs font-normal">{tarihsiz.length}</span>
          </h4>
          <p className="mb-2 text-xs text-white/45">Bir göreve tıklayıp sağ panelden bitiş tarihi verirseniz takvimde yerini alır.</p>
          <div className="flex flex-col gap-1">{tarihsiz.map((x) => gorevChip(x, false))}</div>
        </section>
      )}
    </div>
  );
}
