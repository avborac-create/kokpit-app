import Link from "next/link";
import { davaDosyalariniListele } from "@/modules/dava-dosyasi/lib/queries";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { Dugme } from "@/core/ui/button";
import { Girdi, Secim } from "@/core/ui/form";
import { DavaDosyasiSilmeButonu } from "@/modules/dava-dosyasi/components/dava-dosyasi-silme-butonu";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export default async function DavaDosyalariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string; durum?: string }>;
}) {
  const params = await searchParams;
  const [dosyalar, durumlar, kullanici] = await Promise.all([
    davaDosyalariniListele({ arama: params.arama, durumKod: params.durum }),
    secenekleriGetir("dava_dosyasi_durumu"),
    mevcutKullanici(),
  ]);
  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Dosyalar</h1>
        <Link href="/kokpit/dava-dosyalari/yeni">
          <Dugme>+ Yeni Dosya</Dugme>
        </Link>
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

      {/* Dosya No/Tür/Birim ayrı sütun olmak yerine Konu'nun altında ikinci
          satır olarak gösterilir (üçü de opsiyonel alanlar, her dosyada
          dolu olmayabilir) - Sorumlu Avukat sütunu kaldırıldı (dosya
          kartında zaten görünüyor, listede az kullanılan bir kırılım),
          yerine dosyanın basit Cari Hesap bakiyesi eklendi - bkz.
          dosyaCariHesapDefteri. */}
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Kokpit No</th>
              <th className="px-4 py-3 font-medium">Konu</th>
              <th className="px-4 py-3 font-medium">Karşı Taraf</th>
              <th className="px-4 py-3 font-medium">Müvekkil(ler)</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Bakiye</th>
              <th className="px-4 py-3 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {dosyalar.map((dosya) => (
              <tr key={dosya.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <Link
                    href={`/kokpit/dava-dosyalari/${dosya.id}`}
                    className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                  >
                    KP-{String(dosya.kayitNo).padStart(4, "0")}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="text-white/85">{dosya.konu}</p>
                  {(dosya.dosyaNo || dosya.tur || dosya.birimAdi) && (
                    <p className="mt-0.5 text-xs text-white/40">
                      {[dosya.dosyaNo, dosya.tur?.etiket, dosya.birimAdi].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-white/60">
                  {dosya.karsiTaraflar.length > 0
                    ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-white/60">
                  {dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                    {dosya.durum.etiket}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {dosya.cariHesapBakiyesi !== 0 ? (
                    <span
                      className={
                        dosya.cariHesapBakiyesi > 0 ? "text-[#ff7a70]" : "text-[#32d74b]"
                      }
                    >
                      {paraFormatlayici.format(Math.abs(dosya.cariHesapBakiyesi))}
                    </span>
                  ) : (
                    <span className="text-white/35">—</span>
                  )}
                </td>
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
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
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
