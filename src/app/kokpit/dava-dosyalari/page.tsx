import Link from "next/link";
import { davaDosyalariniListele } from "@/modules/dava-dosyasi/lib/queries";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { Dugme } from "@/core/ui/button";
import { Girdi, Secim } from "@/core/ui/form";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { tabloSutunDuzeniniGetir } from "@/core/tablo-duzeni/queries";
import {
  DAVA_DOSYALARI_SUTUN_ETIKETLERI,
  DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI,
  DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR,
} from "@/core/tablo-duzeni/dava-dosyalari-sutunlari";
import { SutunDuzeniPaneli } from "@/core/tablo-duzeni/sutun-duzeni-paneli";
import type { TabloSutunSatiri } from "@/core/tablo-duzeni/tablo-sutun-listesi";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { DosyalarTablosu } from "./dosyalar-tablosu";

export default async function DavaDosyalariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string; durum?: string; musteri?: string }>;
}) {
  const params = await searchParams;
  const [dosyalar, durumlar, kullanici, sutunDuzeni, filtreMusteri] = await Promise.all([
    davaDosyalariniListele({ arama: params.arama, durumKod: params.durum, musteriId: params.musteri }),
    secenekleriGetir("dava_dosyasi_durumu"),
    mevcutKullanici(),
    tabloSutunDuzeniniGetir("dava-dosyalari"),
    params.musteri ? musteriGetir(params.musteri) : null,
  ]);
  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));

  // Admin panelinde henüz seed edilmemiş/eksik bir sütun varsa (ör. yeni
  // deploy sonrası seed henüz koşmadıysa) varsayılan sıraya düşülür - tablo
  // hiçbir zaman bir sütunu sessizce kaybetmez.
  const kayitliSutunlar = sutunDuzeni.map((s) => s.sutunAnahtari);
  // Sonradan eklenen sütunlar (ör. Büro No) seed koşana kadar DB'de satır
  // olarak bulunmaz - eksik olanlar varsayılan konumlarına eklenir.
  const sutunSirasi =
    sutunDuzeni.length > 0
      ? [
          ...kayitliSutunlar,
          ...DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI.filter((a) => !kayitliSutunlar.includes(a)),
        ]
      : DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI;
  const gizliSutunlar = new Set(sutunDuzeni.filter((s) => s.gizliMi).map((s) => s.sutunAnahtari));
  const gorunurSutunlar = sutunSirasi.filter(
    (anahtar) => DAVA_DOSYALARI_SUTUN_ETIKETLERI[anahtar] && !gizliSutunlar.has(anahtar),
  );

  const sutunPaneliOgeleri: TabloSutunSatiri[] = sutunSirasi
    .filter((anahtar) => DAVA_DOSYALARI_SUTUN_ETIKETLERI[anahtar])
    .map((anahtar) => ({
      anahtar,
      etiket: DAVA_DOSYALARI_SUTUN_ETIKETLERI[anahtar] ?? anahtar,
      gizliMi: gizliSutunlar.has(anahtar),
      gizlenebilirMi: !DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR.includes(anahtar),
    }));

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Dosyalar</h1>
        <div className="flex items-center gap-2">
          {silmeYetkisiVar && (
            <SutunDuzeniPaneli tabloAnahtari="dava-dosyalari" ogeler={sutunPaneliOgeleri} />
          )}
          <Link href={`/kokpit/dava-dosyalari/yeni${params.musteri ? `?musteriId=${params.musteri}` : ""}`}>
            <Dugme>+ Yeni Dosya</Dugme>
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
            href={`/kokpit/finans/musteri-iliskileri/${filtreMusteri.id}/cari-hesap`}
            className="text-[#6db8ff] hover:underline"
          >
            Cari Hesap
          </Link>
          <Link href="/kokpit/dava-dosyalari" className="ml-auto text-white/50 hover:text-white">
            Filtreyi kaldır ✕
          </Link>
        </div>
      )}

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        {params.musteri && <input type="hidden" name="musteri" value={params.musteri} />}
        <Girdi
          type="search"
          name="arama"
          placeholder="Müvekkil, karşı taraf, büro no, dosya no, birim, konu…"
          defaultValue={params.arama}
          className="max-w-md"
        />
        <Secim name="durum" defaultValue={params.durum ?? ""} className="max-w-[10rem]">
          <option value="">Tüm durumlar</option>
          {durumlar.map((durum) => (
            <option key={durum.id} value={durum.kod}>
              {durum.etiket}
            </option>
          ))}
        </Secim>
        <Dugme type="submit" varyant="ikincil">
          Filtrele
        </Dugme>
      </form>

      <DosyalarTablosu
        dosyalar={dosyalar}
        gorunurSutunlar={gorunurSutunlar}
        sutunEtiketleri={DAVA_DOSYALARI_SUTUN_ETIKETLERI}
        silmeYetkisiVar={silmeYetkisiVar}
      />
    </div>
  );
}
