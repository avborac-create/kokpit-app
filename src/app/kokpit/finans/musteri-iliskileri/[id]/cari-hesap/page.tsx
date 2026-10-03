import Link from "next/link";
import { notFound } from "next/navigation";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { paraTrafigiKaydiEkle } from "@/modules/musteri/lib/actions";
import { musteriCariHesapOzeti, dagitilmamisParaToplami, musteriDosyaAvansBakiyeleri } from "@/modules/dava-dosyasi/lib/queries";
import { ParaTrafigiFormu } from "@/modules/musteri/components/para-trafigi-formu";
import { ParaTrafigiListesi } from "@/modules/musteri/components/para-trafigi-listesi";
import { CariHesapOzeti } from "@/modules/dava-dosyasi/components/cari-hesap-ozeti";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

export default async function CariHesapSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [musteri, kullanici, ozet, dagitimBekleyen, dosyaBakiyeleri] = await Promise.all([
    musteriGetir(id),
    mevcutKullanici(),
    musteriCariHesapOzeti(id),
    dagitilmamisParaToplami(id),
    musteriDosyaAvansBakiyeleri(id),
  ]);
  if (!musteri) notFound();

  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));

  return (
    <div className="pt-3">
      <div className="mb-6">
        <Link
          href={`/kokpit/finans/musteri-iliskileri/${id}`}
          className="text-sm text-[#6db8ff] hover:underline"
        >
          ‹ {musteri.adSoyadUnvan}
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Cari Hesap</h1>
          <Link
            href={`/kokpit/musteriler/${id}`}
            className="text-sm text-white/45 hover:text-[#6db8ff] hover:underline"
          >
            Müvekkil Profili →
          </Link>
        </div>
      </div>

      <p className="mb-3 text-sm text-white/45">
        Bu müvekkilin tüm uyuşmazlık/dosyalarındaki toplam durumu — dosya veya küme bazında ayrıntı
        için ilgili dosya/küme sayfasına bakın.
      </p>
      <div className="mb-8">
        <CariHesapOzeti ozet={ozet} dagitimBekleyen={dagitimBekleyen} />
      </div>

      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Dosya Bazında Avans Bakiyeleri</h2>
      <p className="mb-3 text-sm text-white/45">
        Eksi bakiyeli bir dosyayı, avansı olan başka bir dosyadan aktararak kapatmak için ilgili dosyanın
        Dosya Ekonomisi sekmesindeki &quot;Avans Aktarımı&quot; bölümünü kullanın.
      </p>
      <div className="glass mb-8 overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Dosya</th>
              <th className="px-4 py-3 font-medium">Birim</th>
              <th className="px-4 py-3 font-medium">Dosya No</th>
              <th className="px-4 py-3 font-medium">Bakiye Avans</th>
            </tr>
          </thead>
          <tbody>
            {dosyaBakiyeleri.map((d) => (
              <tr key={d.id} className="border-t border-white/[0.06]">
                <td className="px-4 py-3">
                  <Link
                    href={`/kokpit/dava-dosyalari/${d.id}?sekme=ekonomi`}
                    title={d.buroNo ? "OBJEKT BÜRO NO" : undefined}
                    className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                  >
                    {d.buroNo ? `BN-${d.buroNo}` : `KP-${String(d.kayitNo).padStart(4, "0")}`}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/60">{d.birimAdi ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{d.dosyaNo ?? "—"}</td>
                <td
                  className={`px-4 py-3 font-medium ${
                    d.bakiye > 0 ? "text-[#32d74b]" : d.bakiye < 0 ? "text-[#ff7a70]" : "text-white/50"
                  }`}
                >
                  {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(d.bakiye)}
                </td>
              </tr>
            ))}
            {dosyaBakiyeleri.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-white/40">
                  Dosya yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Para Trafiği</h2>
      <div className="mb-4">
        <ParaTrafigiFormu action={paraTrafigiKaydiEkle.bind(null, id)} musteriId={id} />
      </div>
      <ParaTrafigiListesi kayitlar={musteri.paraTrafigi} silmeYetkisiVar={silmeYetkisiVar} />
    </div>
  );
}
