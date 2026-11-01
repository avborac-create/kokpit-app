"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { isEkle, operasyonYapildi } from "./actions";
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
  yorumSayisi: number;
  maddeToplam: number;
  maddeTamam: number;
  yardimBenim: boolean;
  yardimIsteyen: string;
  destekMi: boolean;
  tarih: string;
};

const alan = "rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[15px] text-white outline-none [color-scheme:dark] focus:border-[var(--accent)]";

export function IsListesi({ isler, kisiler, benimId, tumBuro }: { isler: Is[]; kisiler: { id: string; adSoyad: string }[]; benimId: string; tumBuro: boolean }) {
  const yonlendirici = useRouter();
  const [baslik, setBaslik] = useState("");
  const [tur, setTur] = useState<string>("PARCA");
  const [hedef, setHedef] = useState(3);
  const [sorumlu, setSorumlu] = useState(benimId);
  const [destek, setDestek] = useState("");
  const [hata, setHata] = useState("");
  const [filtre, setFiltre] = useState<string>("ACIK");
  const [turFiltre, setTurFiltre] = useState<string>("HEPSI");
  const [bekliyor, basla] = useTransition();

  const benim = (i: Is) => i.sorumluId === benimId || i.yardimBenim;
  const beklenen = (i: Is) => benim(i) && (i.tur === "OPERASYONEL" ? i.hedef > 0 && i.yapilan < i.hedef : i.durum !== "TAMAMLANDI");
  const beklenenler = isler.filter(beklenen);

  const gorunen = isler.filter((i) => {
    if (!(tumBuro || benim(i))) return false;
    if (turFiltre !== "HEPSI" && i.tur !== turFiltre) return false;
    if (i.tur === "OPERASYONEL") return filtre === "ACIK" || filtre === "HEPSI";
    return filtre === "HEPSI" ? true : filtre === "ACIK" ? i.durum !== "TAMAMLANDI" : i.durum === filtre;
  });

  function ekle() {
    setHata("");
    basla(async () => {
      const s = await isEkle(baslik, sorumlu, "", destek, tur, hedef);
      if (s.hata) setHata(s.hata);
      else if (s.id) yonlendirici.push(`/kokpit/isler/${s.id}`);
    });
  }

  const sekme = (secili: boolean) => `rounded-full px-3.5 py-1.5 text-sm ${secili ? "bg-white/15 font-semibold text-white" : "text-white/60 hover:bg-white/10"}`;

  function Satir({ i }: { i: Is }) {
    const d = durumBilgisi(i.durum);
    const t = turBilgisi(i.tur);
    const op = i.tur === "OPERASYONEL";
    return (
      <li className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07]">
        <Link href={`/kokpit/isler/${i.id}`} className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 text-[15px] font-medium text-white">{i.baslik}</span>
            {op ? (
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: i.yapilan >= i.hedef ? "#22c55e26" : t.renk + "26", color: i.yapilan >= i.hedef ? "#22c55e" : t.renk }}>
                Bu hafta {i.yapilan}/{i.hedef}
              </span>
            ) : (
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: d.renk + "26", color: d.renk }}>
                {d.ad}
              </span>
            )}
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
            <span>{i.sorumluAd}</span>
            {i.maddeToplam > 0 && (
              <span>
                ☑ {i.maddeTamam}/{i.maddeToplam}
              </span>
            )}
            {i.yorumSayisi > 0 && <span>💬 {i.yorumSayisi}</span>}
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/kokpit/isler" className={sekme(!tumBuro)}>
          Benim görevlerim
        </Link>
        <Link href="/kokpit/isler?kimin=buro" className={sekme(tumBuro)}>
          Tüm büro
        </Link>
      </div>

      {!tumBuro && (
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

      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
        <div className="flex flex-wrap gap-1.5">
          {TURLER.map((t) => (
            <button key={t.anahtar} type="button" onClick={() => setTur(t.anahtar)} className="rounded-full border px-3.5 py-1.5 text-sm font-medium" style={tur === t.anahtar ? { background: t.renk, borderColor: t.renk, color: "#fff" } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}>
              {t.ad}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/50">{turBilgisi(tur).aciklama}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={baslik} onChange={(e) => setBaslik(e.target.value)} onKeyDown={(e) => e.key === "Enter" && baslik.trim() && ekle()} placeholder="Yeni görev başlığı…" className={`${alan} flex-1`} />
          {tur === "OPERASYONEL" && (
            <label className="flex items-center gap-1.5 text-sm text-white/65">
              Haftada
              <input type="number" min={1} max={14} value={hedef} onChange={(e) => setHedef(Number(e.target.value))} className={`${alan} w-16 px-2`} />
              kez
            </label>
          )}
          <select value={sorumlu} onChange={(e) => setSorumlu(e.target.value)} className={alan}>
            {kisiler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.adSoyad}
              </option>
            ))}
          </select>
          <select value={destek} onChange={(e) => setDestek(e.target.value)} className={alan} title="Destek (yardımcı) kişi">
            <option value="">Destek yok</option>
            {kisiler.filter((c) => c.id !== sorumlu).map((c) => (
              <option key={c.id} value={c.id}>
                Destek: {c.adSoyad}
              </option>
            ))}
          </select>
          <button type="button" onClick={ekle} disabled={bekliyor || !baslik.trim()} className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            Aç
          </button>
        </div>
      </div>
      {hata && <p className="text-sm text-red-300">{hata}</p>}

      <div className="flex flex-wrap gap-1.5">
        {[{ anahtar: "HEPSI", ad: "Tüm türler" }, ...TURLER.map((t) => ({ anahtar: t.anahtar as string, ad: t.ad }))].map((f) => (
          <button key={f.anahtar} type="button" onClick={() => setTurFiltre(f.anahtar)} className={`rounded-full border px-3 py-1 text-xs ${turFiltre === f.anahtar ? "border-white/40 bg-white/15 text-white" : "border-white/10 text-white/55"}`}>
            {f.ad}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[{ anahtar: "ACIK", ad: "Açık olanlar" }, ...DURUMLAR.map((d) => ({ anahtar: d.anahtar as string, ad: d.ad })), { anahtar: "HEPSI", ad: "Hepsi" }].map((f) => (
          <button key={f.anahtar} type="button" onClick={() => setFiltre(f.anahtar)} className={`rounded-full border px-3 py-1 text-xs ${filtre === f.anahtar ? "border-white/40 bg-white/15 text-white" : "border-white/10 text-white/55"}`}>
            {f.ad}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {gorunen.length === 0 && <li className="px-1 py-6 text-center text-sm text-white/45">Bu görünümde görev yok.</li>}
        {gorunen.map((i) => (
          <Satir key={i.id} i={i} />
        ))}
      </ul>
    </div>
  );
}
