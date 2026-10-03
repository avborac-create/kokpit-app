"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  masrafExcelAktar,
  masrafExcelOnizle,
  type OnizlemeSatiri,
  type OnizlemeSonucu,
} from "@/modules/dava-dosyasi/lib/masraf-aktar-actions";
import { Dugme } from "@/core/ui/button";
import { Secim } from "@/core/ui/form";

type Duzenlenen = OnizlemeSatiri & { onayli: boolean; hatirla: boolean };

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

const GUVEN_ETIKETI: Record<OnizlemeSatiri["guven"], { metin: string; sinif: string }> = {
  ogrenilmis: { metin: "Öğrenilmiş", sinif: "bg-[#32d74b]/15 text-[#32d74b]" },
  yuksek: { metin: "Tahmin", sinif: "bg-[var(--accent-soft)] text-[#6db8ff]" },
  dusuk: { metin: "Emin değilim", sinif: "bg-[#ff9f0a]/15 text-[#ff9f0a]" },
};

// Excel'den masraf aktarimi: 1) dosya yuklenir, 2) sistem her satirin tasnifini
// TAHMIN eder ve NEDENINI gosterir, 3) kullanici satir satir onaylar/duzeltir,
// 4) yalniz onaylananlar kaydedilir. Ilk etapta hicbir satir kendiliginden
// onaylanmaz - yalniz daha once onaylanip "hatirla" denmis kararlar (Öğrenilmiş)
// onayli gelir.
export function MasrafExcelAktar({ dosyaId, dosyaEtiketi }: { dosyaId: string; dosyaEtiketi: string }) {
  const router = useRouter();
  const [bekliyor, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [satirlar, setSatirlar] = useState<Duzenlenen[] | null>(null);
  const [secenekler, setSecenekler] = useState<Extract<OnizlemeSonucu, { satirlar: unknown }>["secenekler"] | null>(null);
  const [sonuc, setSonuc] = useState<string | null>(null);

  function yukle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setHata(null);
    setSonuc(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const cevap = await masrafExcelOnizle(dosyaId, formData);
      if ("hata" in cevap) {
        setHata(cevap.hata);
        return;
      }
      setSecenekler(cevap.secenekler);
      setSatirlar(
        cevap.satirlar.map((s) => ({
          ...s,
          onayli: s.guven === "ogrenilmis" && !s.tekrarMi && !s.gecersizNedeni,
          hatirla: true,
        })),
      );
    });
  }

  function guncelle(anahtar: string, parca: Partial<Duzenlenen>) {
    setSatirlar((onceki) => onceki?.map((s) => (s.anahtar === anahtar ? { ...s, ...parca } : s)) ?? null);
  }

  const aktarilabilir = (s: Duzenlenen) => !s.tekrarMi && !s.gecersizNedeni;
  const onayliSayisi = satirlar?.filter((s) => s.onayli && aktarilabilir(s)).length ?? 0;
  const eksikliOnayli =
    satirlar?.some((s) => s.onayli && aktarilabilir(s) && (!s.turId || !s.cariKodId)) ?? false;

  function aktar() {
    if (!satirlar) return;
    setHata(null);
    const secili = satirlar.filter((s) => s.onayli && aktarilabilir(s));
    startTransition(async () => {
      try {
        const r = await masrafExcelAktar(
          dosyaId,
          secili.map((s) => ({
            tarih: s.tarih as string,
            tutar: s.tutar as number,
            aciklama: s.aciklama,
            turId: s.turId,
            grupId: s.grupId,
            kalemId: s.kalemId,
            cariKodId: s.cariKodId,
            yansitmaHedefi: s.yansitmaHedefi,
            hatirla: s.hatirla,
            kuralAnahtari: s.kuralAnahtari,
          })),
        );
        setSonuc(`${r.eklenen} masraf eklendi.`);
        setSatirlar(null);
        router.refresh();
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Aktarım başarısız oldu.");
      }
    });
  }

  if (sonuc) {
    return (
      <div className="glass rounded-2xl p-5">
        <p className="mb-3 text-sm text-[#32d74b]">{sonuc}</p>
        <Link href={`/kokpit/dava-dosyalari/${dosyaId}?sekme=ekonomi`}>
          <Dugme>Dosya Ekonomisine dön</Dugme>
        </Link>
      </div>
    );
  }

  if (!satirlar || !secenekler) {
    return (
      <form onSubmit={yukle} className="glass max-w-xl rounded-2xl p-5">
        <p className="mb-3 text-sm text-white/70">
          {dosyaEtiketi} dosyasına eklenecek masrafların Excel dosyasını (.xlsx) seçin. Sütunlar: Tarih, Tür, Tutar,
          Cari Kod ve Açıklama. Sistem her satırın tasnifini tahmin edip <b>nedenini</b> gösterecek; siz onaylamadan hiçbir
          kayıt yapılmaz.
        </p>
        <input
          type="file"
          name="excel"
          accept=".xlsx"
          required
          className="mb-4 block w-full text-sm text-white/80 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white"
        />
        {hata && <p className="mb-3 text-sm text-[#ff7a70]">{hata}</p>}
        <Dugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Okunuyor…" : "Excel'i oku ve tahmin et"}
        </Dugme>
      </form>
    );
  }

  const secimSatiri = (
    liste: { id: string; etiket: string }[],
    deger: string,
    onDegis: (v: string) => void,
    bos: string,
    uyari = false,
  ) => (
    <Secim
      value={deger}
      onChange={(e) => onDegis(e.target.value)}
      className={`!py-1 !text-xs ${uyari && !deger ? "!border-[#ff9f0a]" : ""}`}
    >
      <option value="">{bos}</option>
      {liste.map((o) => (
        <option key={o.id} value={o.id}>
          {o.etiket}
        </option>
      ))}
    </Secim>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-white/70">
          {satirlar.length} satır okundu. Tasnifleri kontrol edip aktarmak istediklerinizi <b>onaylayın</b>.
        </p>
        <div className="flex gap-2">
          <Dugme
            type="button"
            varyant="ikincil"
            boyut="kompakt"
            onClick={() =>
              setSatirlar((o) =>
                o?.map((s) => (s.guven === "yuksek" && aktarilabilir(s) && s.turId && s.cariKodId ? { ...s, onayli: true } : s)) ??
                null,
              )
            }
          >
            Güvenli tahminleri onayla
          </Dugme>
          <Dugme
            type="button"
            varyant="ikincil"
            boyut="kompakt"
            onClick={() => setSatirlar((o) => o?.map((s) => ({ ...s, onayli: false })) ?? null)}
          >
            Seçimi temizle
          </Dugme>
        </div>
      </div>

      <div className="glass mb-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[1100px] text-left text-xs">
          <thead className="text-white/50">
            <tr>
              <th className="px-2 py-2 font-medium">Onay</th>
              <th className="px-2 py-2 font-medium">Excel</th>
              <th className="px-2 py-2 font-medium">Tutar</th>
              <th className="px-2 py-2 font-medium">Tür</th>
              <th className="px-2 py-2 font-medium">Grup</th>
              <th className="px-2 py-2 font-medium">Kalem</th>
              <th className="px-2 py-2 font-medium">Cari Kod</th>
              <th className="px-2 py-2 font-medium">Yansıtma</th>
              <th className="px-2 py-2 font-medium">Neden böyle?</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((s) => {
              const engelli = !aktarilabilir(s);
              const etiket = GUVEN_ETIKETI[s.guven];
              return (
                <tr key={s.anahtar} className={`border-t border-white/[0.06] align-top ${engelli ? "opacity-50" : ""}`}>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={s.onayli && !engelli}
                      disabled={engelli}
                      onChange={(e) => guncelle(s.anahtar, { onayli: e.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                      aria-label={`Satır ${s.satirNo} onay`}
                    />
                  </td>
                  <td className="max-w-[220px] px-2 py-2 text-white/70">
                    <div>
                      {s.tarih ?? "?"} · {s.excelTur || "(tür yok)"}
                    </div>
                    <div className="text-white/50">{s.aciklama}</div>
                    <div className="text-white/35">{s.excelCariKod}</div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-white">{s.tutar === null ? "—" : paraFormatlayici.format(s.tutar)}</td>
                  <td className="px-2 py-2">{secimSatiri(secenekler.tur, s.turId, (v) => guncelle(s.anahtar, { turId: v }), "Seçiniz…", true)}</td>
                  <td className="px-2 py-2">{secimSatiri(secenekler.grup, s.grupId, (v) => guncelle(s.anahtar, { grupId: v }), "—")}</td>
                  <td className="px-2 py-2">{secimSatiri(secenekler.kalem, s.kalemId, (v) => guncelle(s.anahtar, { kalemId: v }), "—")}</td>
                  <td className="px-2 py-2">{secimSatiri(secenekler.cariKod, s.cariKodId, (v) => guncelle(s.anahtar, { cariKodId: v }), "Seçiniz…", true)}</td>
                  <td className="px-2 py-2">
                    <Secim
                      value={s.yansitmaHedefi}
                      onChange={(e) => guncelle(s.anahtar, { yansitmaHedefi: e.target.value as Duzenlenen["yansitmaHedefi"] })}
                      className="!py-1 !text-xs"
                    >
                      <option value="MUVEKKIL">Müvekkile</option>
                      <option value="BURO">Büroya</option>
                      <option value="BORCLU">Borçluya</option>
                    </Secim>
                  </td>
                  <td className="max-w-[260px] px-2 py-2">
                    {s.tekrarMi && <p className="mb-1 text-[#ff9f0a]">Bu dosyada aynı kayıt zaten var, atlanır.</p>}
                    {s.gecersizNedeni && <p className="mb-1 text-[#ff7a70]">{s.gecersizNedeni}, atlanır.</p>}
                    <span className={`mb-1 inline-block rounded-full px-2 py-0.5 ${etiket.sinif}`}>{etiket.metin}</span>
                    <ul className="list-disc pl-4 text-white/45">
                      {s.nedenler.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                    {!engelli && (
                      <label className="mt-1 flex items-center gap-1 text-white/50">
                        <input
                          type="checkbox"
                          checked={s.hatirla}
                          onChange={(e) => guncelle(s.anahtar, { hatirla: e.target.checked })}
                          className="h-3 w-3 accent-[var(--accent)]"
                        />
                        Bu kararı hatırla
                      </label>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hata && <p className="mb-3 text-sm text-[#ff7a70]">{hata}</p>}
      {eksikliOnayli && <p className="mb-3 text-sm text-[#ff9f0a]">Onaylı satırlarda Tür ve Cari Kod seçili olmalı.</p>}
      <div className="flex gap-2">
        <Dugme type="button" onClick={aktar} disabled={bekliyor || onayliSayisi === 0 || eksikliOnayli}>
          {bekliyor ? "Aktarılıyor…" : `${onayliSayisi} onaylı masrafı aktar`}
        </Dugme>
        <Dugme type="button" varyant="ikincil" onClick={() => setSatirlar(null)} disabled={bekliyor}>
          Başka dosya seç
        </Dugme>
      </div>
    </div>
  );
}
