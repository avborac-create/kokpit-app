import type { ReactNode } from "react";
import Link from "next/link";
import { davaDosyalariniListele } from "@/modules/dava-dosyasi/lib/queries";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { Dugme } from "@/core/ui/button";
import { Girdi, Secim } from "@/core/ui/form";
import { DavaDosyasiSilmeButonu } from "@/modules/dava-dosyasi/components/dava-dosyasi-silme-butonu";
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

type Dosya = Awaited<ReturnType<typeof davaDosyalariniListele>>[number];

// Sütun anahtarı -> hücre içeriği. Admin (Ayarlar > Sütun Düzeni) hangi
// sütunun görüneceğini/sırasını değiştirebilir; bu harita her sütunun
// NASIL render edileceğinin tek kaynağıdır.
const SUTUN_HUCRELERI: Record<string, (dosya: Dosya) => ReactNode> = {
  kayitNo: (dosya) => (
    <Link
      href={`/kokpit/dava-dosyalari/${dosya.id}`}
      className="font-medium text-white hover:text-[#6db8ff] hover:underline"
    >
      KP-{String(dosya.kayitNo).padStart(4, "0")}
    </Link>
  ),
  dosyaNo: (dosya) => dosya.dosyaNo ?? "—",
  tur: (dosya) => dosya.tur?.etiket ?? "—",
  birimAdi: (dosya) => dosya.birimAdi ?? "—",
  konu: (dosya) => dosya.konu,
  karsiTaraflar: (dosya) =>
    dosya.karsiTaraflar.length > 0 ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ") : "—",
  muvekkiller: (dosya) => dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—",
  durum: (dosya) => (
    <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
      {dosya.durum.etiket}
    </span>
  ),
  sorumluAvukat: (dosya) => dosya.sorumluAvukat?.adSoyad ?? "—",
};

export default async function DavaDosyalariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string; durum?: string }>;
}) {
  const params = await searchParams;
  const [dosyalar, durumlar, kullanici, sutunDuzeni] = await Promise.all([
    davaDosyalariniListele({ arama: params.arama, durumKod: params.durum }),
    secenekleriGetir("dava_dosyasi_durumu"),
    mevcutKullanici(),
    tabloSutunDuzeniniGetir("dava-dosyalari"),
  ]);
  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));

  // Admin panelinde henüz seed edilmemiş/eksik bir sütun varsa (ör. yeni
  // deploy sonrası seed henüz koşmadıysa) varsayılan sıraya düşülür - tablo
  // hiçbir zaman bir sütunu sessizce kaybetmez.
  const sutunSirasi =
    sutunDuzeni.length > 0 ? sutunDuzeni.map((s) => s.sutunAnahtari) : DAVA_DOSYALARI_VARSAYILAN_SUTUN_SIRASI;
  const gizliSutunlar = new Set(sutunDuzeni.filter((s) => s.gizliMi).map((s) => s.sutunAnahtari));
  const gorunurSutunlar = sutunSirasi.filter((anahtar) => SUTUN_HUCRELERI[anahtar] && !gizliSutunlar.has(anahtar));

  const sutunPaneliOgeleri: TabloSutunSatiri[] = sutunSirasi
    .filter((anahtar) => SUTUN_HUCRELERI[anahtar])
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
          <Link href="/kokpit/dava-dosyalari/yeni">
            <Dugme>+ Yeni Dosya</Dugme>
          </Link>
        </div>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <Girdi
          type="search"
          name="arama"
          placeholder="Dosya no, konu ara…"
          defaultValue={params.arama}
          className="max-w-xs"
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

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              {gorunurSutunlar.map((anahtar) => (
                <th key={anahtar} className="px-4 py-3 font-medium">
                  {DAVA_DOSYALARI_SUTUN_ETIKETLERI[anahtar] ?? anahtar}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {dosyalar.map((dosya) => (
              <tr key={dosya.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                {gorunurSutunlar.map((anahtar) => (
                  <td
                    key={anahtar}
                    className={`px-4 py-3 ${anahtar === "konu" ? "text-white/85" : "text-white/60"}`}
                  >
                    {SUTUN_HUCRELERI[anahtar](dosya)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/kokpit/dava-dosyalari/${dosya.id}/duzenle`}>
                      <Dugme type="button" varyant="ikincil">
                        Düzenle
                      </Dugme>
                    </Link>
                    {silmeYetkisiVar && <DavaDosyasiSilmeButonu dosyaId={dosya.id} />}
                  </div>
                </td>
              </tr>
            ))}
            {dosyalar.length === 0 && (
              <tr>
                <td colSpan={gorunurSutunlar.length + 1} className="px-4 py-8 text-center text-white/40">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
