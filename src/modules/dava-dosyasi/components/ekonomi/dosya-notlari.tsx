"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dugme } from "@/core/ui/button";
import { MetinAlani } from "@/core/ui/form";
import { OnayliButon } from "@/core/ui/onayli-buton";
import { dosyaNotuEkle, dosyaNotuGuncelle, dosyaNotuSil } from "@/modules/dava-dosyasi/lib/cari-sistem-actions";

type Not = { id: string; baslik: string; icerik: string };

// Dosya Ekonomisi > Not: solda dikey not sekmeleri (adlari yerinde degistirilir: cift tikla ya da kalem),
// sagda serbest yazi alani. Yeni sekme eklenebilir, bos olmayan sekme silmeden once onay ister.
export function DosyaNotlari({ dosyaId, notlar }: { dosyaId: string; notlar: Not[] }) {
  const router = useRouter();
  const [secili, setSecili] = useState<string | null>(notlar[0]?.id ?? null);
  const [adDuzenlenen, setAdDuzenlenen] = useState<string | null>(null);
  const [yeniAd, setYeniAd] = useState("");
  const [yazilar, setYazilar] = useState<Record<string, string>>({});
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [beklemede, baslat] = useTransition();

  const gecerli = notlar.find((n) => n.id === secili) ?? notlar[0] ?? null;
  const yazi = gecerli ? (yazilar[gecerli.id] ?? gecerli.icerik) : "";
  const degisti = gecerli ? yazi !== gecerli.icerik : false;

  function ekle() {
    baslat(async () => {
      const { id } = await dosyaNotuEkle(dosyaId);
      setSecili(id);
      setAdDuzenlenen(id);
      setYeniAd("Yeni not");
      router.refresh();
    });
  }

  function adiKaydet(not: Not) {
    const ad = yeniAd.trim();
    setAdDuzenlenen(null);
    if (!ad || ad === not.baslik) return;
    baslat(async () => {
      await dosyaNotuGuncelle(not.id, { baslik: ad });
      router.refresh();
    });
  }

  function yaziyiKaydet(not: Not) {
    baslat(async () => {
      await dosyaNotuGuncelle(not.id, { icerik: yazi });
      setMesaj("Kaydedildi");
      router.refresh();
      setTimeout(() => setMesaj(null), 2000);
    });
  }

  if (notlar.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
        <p className="mb-1 text-sm text-white/70">Bu dosya için henüz not yok.</p>
        <p className="mb-4 text-xs text-white/45">Not sekmeleri açıp istediğiniz adı verebilirsiniz (ör. Sorgular, Yapılanlar, Muhasebe).</p>
        <Dugme type="button" onClick={ekle} disabled={beklemede}>
          ＋ İlk notu aç
        </Dugme>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)]">
      <div className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible" role="tablist" aria-label="Notlar">
        {notlar.map((n) => {
          const aktif = n.id === gecerli?.id;
          return adDuzenlenen === n.id ? (
            <input
              key={n.id}
              autoFocus
              value={yeniAd}
              maxLength={60}
              onChange={(e) => setYeniAd(e.target.value)}
              onBlur={() => adiKaydet(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter") adiKaydet(n);
                if (e.key === "Escape") setAdDuzenlenen(null);
              }}
              aria-label="Not adı"
              className="w-full rounded-lg border border-[var(--accent)] bg-black/20 px-3 py-1.5 text-sm text-white outline-none"
            />
          ) : (
            <div
              key={n.id}
              className={`group flex items-center justify-between gap-1 rounded-lg border-l-2 px-3 py-1.5 text-sm transition-colors ${
                aktif ? "border-[var(--link)] bg-white/[0.07] font-medium text-white" : "border-transparent text-white/60 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={aktif}
                onClick={() => setSecili(n.id)}
                onDoubleClick={() => {
                  setSecili(n.id);
                  setYeniAd(n.baslik);
                  setAdDuzenlenen(n.id);
                }}
                className="min-w-0 flex-1 truncate text-left"
                title="Adını değiştirmek için çift tıklayın"
              >
                {n.baslik}
              </button>
              <button
                type="button"
                aria-label={`${n.baslik} adını değiştir`}
                onClick={() => {
                  setSecili(n.id);
                  setYeniAd(n.baslik);
                  setAdDuzenlenen(n.id);
                }}
                className="shrink-0 text-xs text-white/40 opacity-0 hover:text-white group-hover:opacity-100 focus:opacity-100"
              >
                ✎
              </button>
            </div>
          );
        })}
        <button type="button" onClick={ekle} disabled={beklemede} className="rounded-lg px-3 py-1.5 text-left text-sm text-[#6db8ff] hover:bg-white/[0.05]">
          ＋ Yeni not
        </button>
      </div>

      {gecerli && (
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="ekonomi-notu" className="text-sm font-semibold text-white">
              {gecerli.baslik}
            </label>
            <span className="text-xs text-white/40">Yalnızca büro içinde görünür</span>
          </div>
          <MetinAlani
            id="ekonomi-notu"
            rows={12}
            maxLength={20000}
            value={yazi}
            onChange={(e) => setYazilar((y) => ({ ...y, [gecerli.id]: e.target.value }))}
            placeholder="Bu not sekmesine yazın…"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Dugme type="button" onClick={() => yaziyiKaydet(gecerli)} disabled={beklemede || !degisti}>
              {beklemede ? "Kaydediliyor…" : "Kaydet"}
            </Dugme>
            {degisti && <span className="text-xs text-[#f2b04c]">Kaydedilmemiş değişiklik var</span>}
            {mesaj && !degisti && <span className="text-xs text-[#32d74b]">{mesaj}</span>}
            <span className="flex-1" />
            <OnayliButon
              varyant="ikincil"
              boyut="kompakt"
              mesaj={`"${gecerli.baslik}" notu ve içindeki yazı silinsin mi? Bu işlem geri alınamaz.`}
              eylem={async () => {
                await dosyaNotuSil(gecerli.id);
                setSecili(null);
              }}
            >
              Bu notu sil
            </OnayliButon>
          </div>
        </div>
      )}
    </div>
  );
}
