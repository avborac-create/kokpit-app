"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type YeniEk, durumDegistir, isBilgisiniGuncelle, isSil, maddeDurumu, maddeEkle, maddeSil, sorumluDegistir, yardimIste, yardimKaldir, yorumEkle, operasyonYapildi, operasyonKaydiSil, hedefGuncelle } from "../actions";
import { DURUMLAR, turBilgisi } from "../durum";

type Detay = {
  id: string;
  baslik: string;
  aciklama: string | null;
  durum: string;
  tur: string;
  haftalikHedef: number;
  yapilan: number;
  kayitlar: { id: string; yapan: string; zaman: string }[];
  sorumluId: string;
  olusturan: string;
  yardimlar: { id: string; ad: string; isteyen: string; yardimciId: string }[];
  maddeler: { id: string; metin: string; tamam: boolean }[];
  yorumlar: { id: string; yazan: string; benim: boolean; metin: string; zaman: string; ekler: { id: string; ad: string; tur: string }[] }[];
};

const alan = "alan-bmw [color-scheme:dark]";
const kutu = "rounded-2xl border border-white/10 bg-white/[0.04] p-4";

export function IsDetayi({ is, kisiler, benimId }: { is: Detay; kisiler: { id: string; adSoyad: string }[]; benimId: string }) {
  const yonlendirici = useRouter();
  const [bekliyor, basla] = useTransition();
  const [baslik, setBaslik] = useState(is.baslik);
  const [aciklama, setAciklama] = useState(is.aciklama ?? "");
  const [yeniMadde, setYeniMadde] = useState("");
  const [yorum, setYorum] = useState("");
  const [silOnayi, setSilOnayi] = useState(false);
  const [ekler, setEkler] = useState<YeniEk[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yukHata, setYukHata] = useState("");
  const [yardimKisi, setYardimKisi] = useState("");

  async function dosyaSec(liste: FileList | null) {
    if (!liste || liste.length === 0) return;
    setYukleniyor(true);
    setYukHata("");
    try {
      for (const d of Array.from(liste)) {
        const s = await upload(`isler/${is.id}/${crypto.randomUUID()}-${d.name}`, d, { access: "private", handleUploadUrl: "/api/isler/blob-upload" });
        setEkler((m) => [...m, { url: s.url, ad: d.name, tur: d.type }]);
      }
    } catch (e) {
      setYukHata("Yüklenemedi: " + (e instanceof Error ? e.message : "bilinmeyen hata"));
    } finally {
      setYukleniyor(false);
    }
  }

  function gonder() {
    basla(async () => {
      await yorumEkle(is.id, yorum, ekler);
      setYorum("");
      setEkler([]);
      yonlendirici.refresh();
    });
  }

  const biten = is.maddeler.filter((m) => m.tamam).length;
  const yuzde = is.maddeler.length ? Math.round((biten / is.maddeler.length) * 100) : 0;
  const degisti = baslik !== is.baslik || aciklama !== (is.aciklama ?? "");

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className={kutu}>
        <span className="mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: turBilgisi(is.tur).renk + "26", color: turBilgisi(is.tur).renk }}>
          {turBilgisi(is.tur).ad}
        </span>
        <input value={baslik} onChange={(e) => setBaslik(e.target.value)} className="w-full bg-transparent text-xl font-semibold text-white outline-none" />
        <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} rows={2} placeholder="Açıklama (isteğe bağlı)…" className="mt-2 w-full resize-y bg-transparent text-[15px] text-white/80 outline-none placeholder:text-white/30" />
        {degisti && (
          <button type="button" disabled={bekliyor} onClick={() => basla(() => isBilgisiniGuncelle(is.id, baslik, aciklama).then(() => yonlendirici.refresh()))} className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white">
            Kaydet
          </button>
        )}
        {is.tur === "OPERASYONEL" ? (
          <div className="mt-3 rounded-xl bg-white/[0.05] p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[15px] text-white">
                Bu hafta: <b>{is.yapilan}</b> / {is.haftalikHedef}
              </span>
              <button type="button" disabled={bekliyor} onClick={() => basla(async () => { await operasyonYapildi(is.id); yonlendirici.refresh(); })} className="rounded-lg bg-[#14b8c4]/25 px-4 py-1.5 text-sm font-semibold text-[#7ee8ef] disabled:opacity-50">
                Yaptım ✓
              </button>
              <label className="ml-auto flex items-center gap-1.5 text-sm text-white/55">
                Haftada
                <input type="number" min={1} max={14} defaultValue={is.haftalikHedef} onBlur={(e) => basla(() => hedefGuncelle(is.id, Number(e.target.value)).then(() => yonlendirici.refresh()))} className={`${alan} w-16 px-2 py-1 text-sm`} />
                kez
              </label>
            </div>
            {is.kayitlar.length > 0 && (
              <ul className="mt-2 flex flex-col text-xs text-white/50">
                {is.kayitlar.map((k) => (
                  <li key={k.id} className="flex items-center gap-2 py-0.5">
                    <span>
                      ✓ {k.yapan} · {k.zaman}
                    </span>
                    <button type="button" aria-label="Kaydı sil" onClick={() => basla(() => operasyonKaydiSil(k.id).then(() => yonlendirici.refresh()))} className="text-white/30 hover:text-red-300">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {DURUMLAR.map((d) => {
            const secili = is.durum === d.anahtar;
            return (
              <button key={d.anahtar} type="button" disabled={bekliyor} onClick={() => basla(() => durumDegistir(is.id, d.anahtar).then(() => yonlendirici.refresh()))} className="rounded-full border px-3.5 py-1.5 text-sm font-medium" style={secili ? { background: d.renk, borderColor: d.renk, color: "#fff" } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}>
                {d.ad}
              </button>
            );
          })}
        </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/55">
          <span>Sorumlu:</span>
          <select value={is.sorumluId} onChange={(e) => basla(() => sorumluDegistir(is.id, e.target.value).then(() => yonlendirici.refresh()))} className={`${alan} py-1.5 text-sm`}>
            <option value="">Atanmadı</option>
            {kisiler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.adSoyad}
              </option>
            ))}
          </select>
          <span className="ml-auto">Açan: {is.olusturan}</span>
        </div>
        {is.yardimlar.some((y) => y.yardimciId === benimId) && (
          <p className="mt-3 rounded-xl bg-[#8b5cf6]/20 px-3 py-2 text-sm text-[#d8ccff]">🤝 Bu işte sizden yardım/destek istendi. Burada yazdığınız her şey işin sahibinin kanalında da görünür.</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/55">
          <span>Yardım:</span>
          {is.yardimlar.map((y) => (
            <span key={y.id} className="flex items-center gap-1.5 rounded-full bg-[#8b5cf6]/25 px-2.5 py-1 text-[#d8ccff]">
              🤝 {y.ad}
              <button type="button" aria-label="Yardım isteğini kaldır" onClick={() => basla(() => yardimKaldir(y.id).then(() => yonlendirici.refresh()))} className="text-white/50 hover:text-red-300">
                ✕
              </button>
            </span>
          ))}
          <select value={yardimKisi} onChange={(e) => setYardimKisi(e.target.value)} className={`${alan} py-1.5 text-sm`}>
            <option value="">Kişi seç…</option>
            {kisiler.filter((c) => c.id !== is.sorumluId && !is.yardimlar.some((y) => y.yardimciId === c.id)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.adSoyad}
              </option>
            ))}
          </select>
          <button type="button" disabled={bekliyor || !yardimKisi} onClick={() => basla(async () => { await yardimIste(is.id, yardimKisi); setYardimKisi(""); yonlendirici.refresh(); })} className="rounded-xl border border-[#8b5cf6]/50 px-3.5 py-1.5 text-sm font-medium text-[#d8ccff] disabled:opacity-40">
            Yardım iste
          </button>
        </div>
      </div>

      <div className={kutu}>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-base font-semibold text-white">Kontrol listesi</h2>
          {is.maddeler.length > 0 && (
            <span className="text-xs text-white/50">
              {biten}/{is.maddeler.length} · %{yuzde}
            </span>
          )}
        </div>
        {is.maddeler.length > 0 && (
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#22c55e] transition-all" style={{ width: `${yuzde}%` }} />
          </div>
        )}
        <ul className="flex flex-col">
          {is.maddeler.map((m) => (
            <li key={m.id} className="flex items-center gap-3 border-b border-white/5 py-2 last:border-0">
              <input type="checkbox" checked={m.tamam} disabled={bekliyor} onChange={(e) => basla(() => maddeDurumu(m.id, e.target.checked).then(() => yonlendirici.refresh()))} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
              <span className={`min-w-0 flex-1 break-words text-[15px] ${m.tamam ? "text-white/40 line-through" : "text-white"}`}>{m.metin}</span>
              <button type="button" aria-label="Maddeyi sil" onClick={() => basla(() => maddeSil(m.id).then(() => yonlendirici.refresh()))} className="px-2 text-white/35 hover:text-red-300">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input value={yeniMadde} onChange={(e) => setYeniMadde(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && yeniMadde.trim()) basla(async () => { await maddeEkle(is.id, yeniMadde); setYeniMadde(""); yonlendirici.refresh(); }); }} placeholder="Madde ekle…" className={`${alan} flex-1`} />
          <button type="button" disabled={bekliyor || !yeniMadde.trim()} onClick={() => basla(async () => { await maddeEkle(is.id, yeniMadde); setYeniMadde(""); yonlendirici.refresh(); })} className="rounded-xl border border-white/15 px-4 text-sm text-white/80 disabled:opacity-40">
            Ekle
          </button>
        </div>
      </div>

      <div className={kutu}>
        <h2 className="mb-3 text-base font-semibold text-white">Yorumlar</h2>
        <ul className="flex flex-col gap-2.5">
          {is.yorumlar.length === 0 && <li className="text-sm text-white/40">Henüz yorum yok.</li>}
          {is.yorumlar.map((y) => (
            <li key={y.id} className={`max-w-[88%] rounded-2xl px-3.5 py-2 ${y.benim ? "self-end bg-[var(--accent)]/25" : "self-start bg-white/[0.07]"}`}>
              <div className="text-xs text-white/50">
                {y.yazan} · {y.zaman}
              </div>
              {y.metin && <div className="whitespace-pre-wrap break-words text-[15px] text-white">{y.metin}</div>}
              {y.ekler.map((e) =>
                e.tur.startsWith("image/") ? (
                  <a key={e.id} href={`/api/isler/dosya?id=${e.id}`} target="_blank" rel="noreferrer" className="mt-1.5 block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/isler/dosya?id=${e.id}`} alt={e.ad} loading="lazy" className="max-h-64 max-w-full rounded-lg" />
                  </a>
                ) : (
                  <a key={e.id} href={`/api/isler/dosya?id=${e.id}`} target="_blank" rel="noreferrer" className="mt-1.5 block text-sm text-[var(--accent)] underline">
                    📎 {e.ad}
                  </a>
                ),
              )}
            </li>
          ))}
        </ul>
        {(ekler.length > 0 || yukleniyor || yukHata) && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {ekler.map((e, i) => (
              <span key={e.url} className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white/80">
                {e.tur.startsWith("image/") ? "📷" : "📎"} {e.ad.slice(0, 24)}
                <button type="button" aria-label="Eki kaldır" onClick={() => setEkler((m) => m.filter((_, k) => k !== i))} className="text-white/50 hover:text-red-300">
                  ✕
                </button>
              </span>
            ))}
            {yukleniyor && <span className="px-2 py-1 text-white/60">Yükleniyor…</span>}
            {yukHata && <span className="px-2 py-1 text-red-300">{yukHata}</span>}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <textarea value={yorum} onChange={(e) => setYorum(e.target.value)} rows={2} placeholder="Yorum yaz… (ilgililere bildirim gider)" className={`${alan} flex-1 resize-y`} />
          <label className="flex h-[42px] w-[46px] shrink-0 cursor-pointer items-center justify-center self-end rounded-xl border border-white/15 text-lg text-white/75 hover:bg-white/10" title="Fotoğraf / PDF ekle">
            📎
            <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => { void dosyaSec(e.target.files); e.target.value = ""; }} />
          </label>
          <button type="button" disabled={bekliyor || yukleniyor || (!yorum.trim() && ekler.length === 0)} onClick={gonder} className="self-end rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            Gönder
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        {silOnayi ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-white/60">Bu iş, maddeleri ve yorumlarıyla silinsin mi?</span>
            <button type="button" onClick={() => basla(async () => { await isSil(is.id); yonlendirici.push("/kokpit/isler"); })} className="rounded-lg bg-red-500/80 px-3 py-1.5 font-semibold text-white">
              Evet, sil
            </button>
            <button type="button" onClick={() => setSilOnayi(false)} className="rounded-lg border border-white/15 px-3 py-1.5 text-white/70">
              Vazgeç
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setSilOnayi(true)} className="text-sm text-white/35 hover:text-red-300">
            İşi sil
          </button>
        )}
      </div>
    </div>
  );
}
