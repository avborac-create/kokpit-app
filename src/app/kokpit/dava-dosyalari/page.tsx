import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { davaDosyalariniListele, vekilAdaylariniGetir } from "@/modules/dava-dosyasi/lib/queries";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { Dugme } from "@/core/ui/button";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { tabloSutunDuzeniniGetir } from "@/core/tablo-duzeni/queries";
import {
  DAVA_DOSYALARI_SUTUN_ETIKETLERI,
  DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI,
  DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR,
} from "@/core/tablo-duzeni/dava-dosyalari-sutunlari";
import { etiketleriGetir } from "@/core/arayuz-etiketi/queries";
import { SutunDuzeniPaneli } from "@/core/tablo-duzeni/sutun-duzeni-paneli";
import type { TabloSutunSatiri } from "@/core/tablo-duzeni/tablo-sutun-listesi";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { DosyalarTablosu } from "./dosyalar-tablosu";
import { FiltreKaydedici } from "./filtre-kaydedici";
import { DosyaFiltre } from "./dosya-filtre";
import { DOSYA_FILTRE_COOKIE } from "./filtre-sabitleri";

export default async function DavaDosyalariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string; durum?: string; musteri?: string; temizle?: string }>;
}) {
  const params = await searchParams;

  // Kullanici kendisi temizlemedikce kayitli filtre geri gelir (bkz.
  // filtre-kaydedici.tsx). URL'de hic filtre/temizle yoksa kayitli olana gider.
  // Bos gonderilen form (?arama=&durum=) de "kullanici filtreyi kaldirdi"
  // anlamina gelir - deger bos olsa bile anahtarin varligi sayilir.
  const urldeFiltreVar = [params.arama, params.durum, params.musteri, params.temizle].some((d) => d !== undefined);
  if (!urldeFiltreVar) {
    const kayitli = (await cookies()).get(DOSYA_FILTRE_COOKIE)?.value;
    if (kayitli) redirect(`/kokpit/dava-dosyalari?${decodeURIComponent(kayitli)}`);
  }
  const [avukatlar, dosyalar, durumlar, kullanici, sutunDuzeni, filtreMusteri, etiketDegisiklikleri] = await Promise.all([
    vekilAdaylariniGetir(),
    davaDosyalariniListele({ arama: params.arama, durumKod: params.durum, musteriId: params.musteri }),
    secenekleriGetir("dava_dosyasi_durumu"),
    mevcutKullanici(),
    tabloSutunDuzeniniGetir("dava-dosyalari"),
    params.musteri ? musteriGetir(params.musteri) : null,
    etiketleriGetir(),
  ]);
  // Yonetici basliga tiklayip adini degistirebilir (bkz. dosyalar-tablosu.tsx); degisiklikler arayuz_etiketleri'nde durur.
  const sutunEtiketleri = Object.fromEntries(
    Object.entries(DAVA_DOSYALARI_SUTUN_ETIKETLERI).map(([a, v]) => [a, etiketDegisiklikleri[`tablo.dava-dosyalari.sutun.${a}`] ?? v]),
  );
  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));

  // Admin panelinde henüz seed edilmemiş/eksik bir sütun varsa (ör. yeni
  // deploy sonrası seed henüz koşmadıysa) varsayılan sıraya düşülür - tablo
  // hiçbir zaman bir sütunu sessizce kaybetmez.
  const kayitliSutunlar = sutunDuzeni.map((s) => s.sutunAnahtari);
  // Sonradan eklenen sütunlar (ör. Büro No) seed koşana kadar DB'de satır
  // olarak bulunmaz - eksik olanlar varsayılan konumlarına eklenir.
  // Eksik sütun, varsayılan sıradaki öncülünün hemen sağına konur (ör. Dosya Tipi, Dosya No'nun yanına).
  const sutunSirasi: string[] = [...kayitliSutunlar];
  if (sutunDuzeni.length === 0) sutunSirasi.push(...DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI);
  else {
    DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI.forEach((a, i) => {
      if (sutunSirasi.includes(a)) return;
      const oncul = i > 0 ? sutunSirasi.indexOf(DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI[i - 1]) : -1;
      sutunSirasi.splice(oncul >= 0 ? oncul + 1 : sutunSirasi.length, 0, a);
    });
  }
  const gizliSutunlar = new Set(sutunDuzeni.filter((s) => s.gizliMi).map((s) => s.sutunAnahtari));
  const gorunurSutunlar = sutunSirasi.filter(
    (anahtar) => DAVA_DOSYALARI_SUTUN_ETIKETLERI[anahtar] && !gizliSutunlar.has(anahtar),
  );

  const sutunPaneliOgeleri: TabloSutunSatiri[] = sutunSirasi
    .filter((anahtar) => DAVA_DOSYALARI_SUTUN_ETIKETLERI[anahtar])
    .map((anahtar) => ({
      anahtar,
      etiket: sutunEtiketleri[anahtar] ?? anahtar,
      gizliMi: gizliSutunlar.has(anahtar),
      gizlenebilirMi: !DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR.includes(anahtar),
    }));

  return (
    <div className="pt-3">
      <FiltreKaydedici />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Dosyalar</h1>
        <div className="flex items-center gap-2">
          {silmeYetkisiVar && (
            <SutunDuzeniPaneli tabloAnahtari="dava-dosyalari" ogeler={sutunPaneliOgeleri} />
          )}
          <Link href={`/kokpit/dava-dosyalari/yeni${params.musteri ? `?musteriId=${params.musteri}` : ""}`}>
            <Dugme className="whitespace-nowrap">+ Yeni Dosya</Dugme>
          </Link>
        </div>
      </div>

      {filtreMusteri && (
        <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm">
          <span className="text-white/55">Müvekkil:</span>
          <Link
            href={`/kokpit/musteriler/${filtreMusteri.id}`}
            className="font-medium text-white hover:text-[#6db8ff] hover:underline"
          >
            {filtreMusteri.adSoyadUnvan}
          </Link>
          <Link
            href={`/kokpit/finans/musteri-iliskileri/${filtreMusteri.id}/cari-hesap?sayfa=genel&alt=ozet`}
            className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[var(--accent)]/30"
          >
            Müvekkil Ekonomisi
          </Link>
          <Link href="/kokpit/dava-dosyalari?temizle=1" className="ml-auto text-white/50 hover:text-white">
            Filtreyi kaldır ✕
          </Link>
        </div>
      )}

      <DosyaFiltre
        arama={params.arama ?? ""}
        durum={params.durum ?? ""}
        musteri={params.musteri}
        durumlar={durumlar.map((d) => ({ id: d.id, kod: d.kod, etiket: d.etiket }))}
      />

      <DosyalarTablosu
        dosyalar={dosyalar}
        gorunurSutunlar={gorunurSutunlar}
        sutunEtiketleri={sutunEtiketleri}
        varsayilanEtiketler={DAVA_DOSYALARI_SUTUN_ETIKETLERI}
        etiketDuzenlenebilir={silmeYetkisiVar}
        silmeYetkisiVar={silmeYetkisiVar}
        durumlar={durumlar.map((d) => ({ id: d.id, etiket: d.etiket }))}
        avukatlar={avukatlar.map((a) => ({ id: a.id, adSoyad: a.adSoyad }))}
      />
    </div>
  );
}
