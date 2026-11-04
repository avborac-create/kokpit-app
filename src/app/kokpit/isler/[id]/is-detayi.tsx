"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { OdakDugmesi } from "../odak-dugmesi";
import { type YeniEk, durumDegistir, isBilgisiniGuncelle, isSil, maddeDurumu, maddeEkle, maddeSil, maddeSirala, maddeTasi, sorumluDegistir, vadeGuncelle, yardimIste, yardimKaldir, yorumEkle, operasyonYapildi, operasyonKaydiSil, hedefGuncelle, turDegistir, zamanBaskisiDegistir, yargiTuruDegistir, periyotDegistir, tetikleyiciGuncelle } from "../actions";
import { DURUMLAR, TURLER, ZAMAN_BASKILARI, turBilgisi, zamanBaskisiBilgisi } from "../durum";
import { PERIYOTLAR, periyotBilgisi } from "../hafta";
import type { Detay } from "../detay-veri";

const alan = "alan-bmw [color-scheme:dark]";
const kutu = "rounded-2xl border border-white/10 bg-white/[0.04] p-4";
const etiket = "pt-1.5 text-[13px] text-white/50";

export function IsDetayi({ is, kisiler, yargiTurleri, benimId, kapatHref, odakta }: { odakta?: boolean; is: Detay; kisiler: { id: string; adSoyad: string }[]; yargiTurleri: { id: string; ad: string }[]; benimId: string; kapatHref?: string }) {
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
  const [surukle, setSurukle] = useState<string | null>(null);
  const [yerel, setYerel] = useState<{ imza: string; idler: string[] } | null>(null);

  const yenile = () => yonlendirici.refresh();

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
      yenile();
    });
  }

  function maddeyiEkle() {
    if (!yeniMadde.trim()) return;
    basla(async () => {
      await maddeEkle(is.id, yeniMadde);
      setYeniMadde("");
      yenile();
    });
  }

  const imza = is.maddeler.map((m) => m.id).join(",");
  const maddeListesi = yerel && yerel.imza === imza ? (yerel.idler.map((id) => is.maddeler.find((m) => m.id === id)).filter(Boolean) as typeof is.maddeler) : is.maddeler;
  function birak(hedefId: string) {
    if (!surukle || surukle === hedefId) return;
    const idler = maddeListesi.map((m) => m.id).filter((id) => id !== surukle);
    idler.splice(idler.indexOf(hedefId), 0, surukle);
    setYerel({ imza, idler });
    setSurukle(null);
    basla(() => maddeSirala(is.id, idler).then(yenile));
  }
  const biten = is.maddeler.filter((m) => m.tamam).length;
  const yuzde = is.maddeler.length ? Math.round((biten / is.maddeler.length) * 100) : 0;
  const degisti = baslik !== is.baslik || aciklama !== (is.aciklama ?? "");
  const tur = turBilgisi(is.tur);
  const baski = zamanBaskisiBilgisi(is.zamanBaskisi);

  return (
    <div className="flex flex-col gap-4">
      {/* Baslik */}
      <div>
        <span className="mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: tur.renk + "26", color: tur.renk }}>
          {tur.ad}
        </span>
        {baski && (
          <span className="mb-1.5 ml-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide" style={{ background: baski.renk + "30", color: baski.renk }}>
            {baski.tarihEtiketi}
          </span>
        )}
        <input value={baslik} onChange={(e) => setBaslik(e.target.value)} className="w-full bg-transparent text-2xl font-semibold text-white outline-none" />
        {degisti && (
          <button type="button" disabled={bekliyor} onClick={() => basla(() => isBilgisiniGuncelle(is.id, baslik, aciklama).then(yenile))} className="mt-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white">
            Kaydet
          </button>
        )}
      </div>

      {/* Ozellikler (Notion tarzi satirlar) */}
      <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-3 gap-y-2.5 border-y border-white/10 py-3">
        <span className={etiket}>Tarz</span>
        <div>
          <select value={is.tur} onChange={(e) => basla(() => turDegistir(is.id, e.target.value).then(yenile))} className={`${alan} py-1.5 text-sm`}>
            {TURLER.map((t) => (
              <option key={t.anahtar} value={t.anahtar}>
                {t.ad}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-white/40">{tur.aciklama}</p>
        </div>

        <span className={etiket}>Zaman baskısı</span>
        <div className="flex flex-wrap gap-1.5">
          {[...ZAMAN_BASKILARI.map((z) => ({ anahtar: z.anahtar as string, ad: z.ad, renk: z.renk as string })), { anahtar: "", ad: "Yok", renk: "#94a3b8" }].map((z) => {
            const secili = is.zamanBaskisi === z.anahtar;
            return (
              <button key={z.anahtar || "yok"} type="button" disabled={bekliyor} onClick={() => basla(() => zamanBaskisiDegistir(is.id, z.anahtar).then(yenile))} className="rounded-full border px-3 py-1 text-[13px] font-medium" style={secili ? { background: z.renk, borderColor: z.renk, color: "#fff" } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}>
                {z.ad}
              </button>
            );
          })}
        </div>

        <span className={etiket}>Yargı türü</span>
        <select value={is.yargiTuruId} onChange={(e) => basla(() => yargiTuruDegistir(is.id, e.target.value).then(yenile))} className={`${alan} py-1.5 text-sm`}>
          <option value="">Belirtilmedi</option>
          {yargiTurleri.map((y) => (
            <option key={y.id} value={y.id}>
              {y.ad}
            </option>
          ))}
        </select>

        <span className={etiket}>Sorumlu</span>
        <select value={is.sorumluId} onChange={(e) => basla(() => sorumluDegistir(is.id, e.target.value).then(yenile))} className={`${alan} py-1.5 text-sm`}>
          <option value="">Atanmadı</option>
          {kisiler.map((c) => (
            <option key={c.id} value={c.id}>
              {c.adSoyad}
            </option>
          ))}
        </select>

        {is.tur === "OPERASYONEL" ? (
          <>
            <span className={etiket}>{periyotBilgisi(is.periyot).bu}</span>
            <div className="rounded-xl bg-white/[0.05] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[15px] text-white">
                  <b>{is.yapilan}</b> / {is.haftalikHedef}
                </span>
                <button type="button" disabled={bekliyor} onClick={() => basla(async () => { await operasyonYapildi(is.id); yenile(); })} className="rounded-lg bg-[#14b8c4]/25 px-4 py-1.5 text-sm font-semibold text-[#7ee8ef] disabled:opacity-50">
                  Yaptım ✓
                </button>
                <label className="ml-auto flex items-center gap-1.5 text-sm text-white/55">
                  <select value={is.periyot} onChange={(e) => basla(() => periyotDegistir(is.id, e.target.value).then(yenile))} className={`${alan} px-2 py-1 text-sm`}>
                    {PERIYOTLAR.map((p) => (
                      <option key={p.anahtar} value={p.anahtar}>
                        {p.birim}
                      </option>
                    ))}
                  </select>
                  <input type="number" min={1} max={31} defaultValue={is.haftalikHedef} onBlur={(e) => basla(() => hedefGuncelle(is.id, Number(e.target.value)).then(yenile))} className={`${alan} w-16 px-2 py-1 text-sm`} />
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
                      <button type="button" aria-label="Kaydı sil" onClick={() => basla(() => operasyonKaydiSil(k.id).then(yenile))} className="text-white/30 hover:text-red-300">
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <span className={etiket}>Durum</span>
            {odakta !== undefined && is.durum !== "TAMAMLANDI" && (
              <div className="mb-1 flex items-center gap-2">
                <OdakDugmesi isId={is.id} odakta={odakta} genis />
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {DURUMLAR.map((d) => {
                const secili = is.durum === d.anahtar;
                return (
                  <button key={d.anahtar} type="button" disabled={bekliyor} onClick={() => basla(() => durumDegistir(is.id, d.anahtar).then(yenile))} className="rounded-full border px-3 py-1 text-[13px] font-medium" style={secili ? { background: d.renk, borderColor: d.renk, color: "#fff" } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.65)" }}>
                    {d.ad}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {is.tur === "DONEMSEL" && (
          <>
            <span className={etiket}>Ne zaman?</span>
            <input defaultValue={is.tetikleyici} onBlur={(e) => e.target.value !== is.tetikleyici && basla(() => tetikleyiciGuncelle(is.id, e.target.value).then(yenile))} placeholder="Hangi olay olunca gündeme gelir? (ör. müvekkil talep edince)" className={`${alan} py-1.5 text-sm`} />
          </>
        )}

        <span className={etiket}>{baski ? baski.tarihEtiketi : "Bitiş"}</span>
        <div className="flex items-center gap-2">
          <input type="date" defaultValue={is.vade} onChange={(e) => basla(() => vadeGuncelle(is.id, e.target.value).then(yenile))} className={`${alan} py-1.5 text-sm`} />
          {is.vade && (
            <button type="button" onClick={() => basla(() => vadeGuncelle(is.id, "").then(yenile))} className="text-xs text-white/40 hover:text-red-300">
              Kaldır
            </button>
          )}
        </div>

        <span className={etiket}>Yardım</span>
        <div className="flex flex-wrap items-center gap-2">
          {is.yardimlar.map((y) => (
            <span key={y.id} className="flex items-center gap-1.5 rounded-full bg-[#8b5cf6]/25 px-2.5 py-1 text-[13px] text-[#d8ccff]">
              🤝 {y.ad}
              <button type="button" aria-label="Yardım isteğini kaldır" onClick={() => basla(() => yardimKaldir(y.id).then(yenile))} className="text-white/50 hover:text-red-300">
                ✕
              </button>
            </span>
          ))}
          <select value={yardimKisi} onChange={(e) => setYardimKisi(e.target.value)} className={`${alan} py-1 text-sm`}>
            <option value="">Kişi ekle…</option>
            {kisiler.filter((c) => c.id !== is.sorumluId && !is.yardimlar.some((y) => y.yardimciId === c.id)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.adSoyad}
              </option>
            ))}
          </select>
          {yardimKisi && (
            <button type="button" disabled={bekliyor} onClick={() => basla(async () => { await yardimIste(is.id, yardimKisi); setYardimKisi(""); yenile(); })} className="rounded-lg border border-[#8b5cf6]/50 px-3 py-1 text-sm font-medium text-[#d8ccff]">
              Yardım iste
            </button>
          )}
        </div>

        <span className={etiket}>Açan</span>
        <span className="pt-1.5 text-sm text-white/70">{is.olusturan}</span>
      </div>

      {is.yardimlar.some((y) => y.yardimciId === benimId) && (
        <p className="rounded-xl bg-[#8b5cf6]/20 px-3 py-2 text-sm text-[#d8ccff]">🤝 Bu işte sizden yardım/destek istendi. Burada yazdığınız her şey işin sahibinin kanalında da görünür.</p>
      )}

      {/* Alt gorevler: her zaman gorunur, siralanabilir */}
      <div className={kutu}>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-base font-semibold text-white">Alt görevler</h2>
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
          {maddeListesi.map((m, i) => (
            <li key={m.id} draggable onDragStart={() => setSurukle(m.id)} onDragEnd={() => setSurukle(null)} onDragOver={(e) => e.preventDefault()} onDrop={() => birak(m.id)} className={`flex items-center gap-2 border-b border-white/5 py-1.5 last:border-0 ${surukle === m.id ? "opacity-40" : ""}`}>
              <span aria-hidden title="Sürükleyip bırakarak sırala" className="cursor-grab select-none px-0.5 text-white/30">⋮⋮</span>
              <input type="checkbox" checked={m.tamam} disabled={bekliyor} onChange={(e) => basla(() => maddeDurumu(m.id, e.target.checked).then(yenile))} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
              <span className={`min-w-0 flex-1 break-words text-[15px] ${m.tamam ? "text-white/40 line-through" : "text-white"}`}>{m.metin}</span>
              <button type="button" aria-label="Yukarı taşı" disabled={bekliyor || i === 0} onClick={() => basla(() => maddeTasi(m.id, -1).then(yenile))} className="px-1.5 text-white/45 hover:text-white disabled:opacity-20">
                ▲
              </button>
              <button type="button" aria-label="Aşağı taşı" disabled={bekliyor || i === maddeListesi.length - 1} onClick={() => basla(() => maddeTasi(m.id, 1).then(yenile))} className="px-1.5 text-white/45 hover:text-white disabled:opacity-20">
                ▼
              </button>
              <button type="button" aria-label="Alt görevi sil" onClick={() => basla(() => maddeSil(m.id).then(yenile))} className="px-1.5 text-white/35 hover:text-red-300">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input value={yeniMadde} onChange={(e) => setYeniMadde(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") maddeyiEkle(); }} placeholder="+ Alt görev ekle…" className={`${alan} flex-1`} />
          <button type="button" disabled={bekliyor || !yeniMadde.trim()} onClick={maddeyiEkle} className="rounded-xl border border-white/15 px-4 text-sm text-white/80 disabled:opacity-40">
            Ekle
          </button>
        </div>
      </div>

      {/* Aciklama */}
      <div>
        <h2 className="mb-1.5 text-sm font-semibold text-white/60">Açıklama</h2>
        <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value)} rows={3} placeholder="Açıklama ekleyin…" className={`${alan} w-full resize-y`} />
      </div>

      {/* Yorumlar: tarih ve saatiyle */}
      <div className={kutu}>
        <h2 className="mb-3 text-base font-semibold text-white">Yorumlar</h2>
        <ul className="flex flex-col gap-2.5">
          {is.yorumlar.length === 0 && <li className="text-sm text-white/40">Henüz yorum yok.</li>}
          {is.yorumlar.map((y) => (
            <li key={y.id} className={`max-w-[92%] rounded-2xl px-3.5 py-2 ${y.benim ? "self-end bg-[var(--accent)]/25" : "self-start bg-white/[0.07]"}`}>
              <div className="text-xs text-white/50">
                <b className="text-white/70">{y.yazan}</b> · {y.zaman}
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
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/60">Bu görev, alt görevleri ve yorumlarıyla silinsin mi?</span>
            <button type="button" onClick={() => basla(async () => { await isSil(is.id); yonlendirici.push(kapatHref ?? "/kokpit/isler"); })} className="rounded-lg bg-red-500/80 px-3 py-1.5 font-semibold text-white">
              Evet, sil
            </button>
            <button type="button" onClick={() => setSilOnayi(false)} className="rounded-lg border border-white/15 px-3 py-1.5 text-white/70">
              Vazgeç
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setSilOnayi(true)} className="text-sm text-white/35 hover:text-red-300">
            Görevi sil
          </button>
        )}
      </div>
    </div>
  );
}
