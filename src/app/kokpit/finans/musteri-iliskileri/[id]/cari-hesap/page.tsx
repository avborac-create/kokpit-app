import Link from "next/link";
import { notFound } from "next/navigation";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { paraTrafigiKaydiEkle } from "@/modules/musteri/lib/actions";
import { musteriCariHesapOzeti, dagitilmamisParaToplami } from "@/modules/dava-dosyasi/lib/queries";
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
  const [musteri, kullanici, ozet, dagitimBekleyen] = await Promise.all([
    musteriGetir(id),
    mevcutKullanici(),
    musteriCariHesapOzeti(id),
    dagitilmamisParaToplami(id),
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

      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Para Trafiği</h2>
      <div className="mb-4">
        <ParaTrafigiFormu action={paraTrafigiKaydiEkle.bind(null, id)} musteriId={id} />
      </div>
      <ParaTrafigiListesi kayitlar={musteri.paraTrafigi} silmeYetkisiVar={silmeYetkisiVar} />
    </div>
  );
}
