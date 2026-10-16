import Link from "next/link";
import { dosyaKisaNo } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { notFound } from "next/navigation";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { paraTrafigiKaydiEkle } from "@/modules/musteri/lib/actions";
import { musteriCariHesapOzeti, dagitilmamisParaToplami, musteriDosyaAvansBakiyeleri } from "@/modules/dava-dosyasi/lib/queries";
import { ParaTrafigiFormu } from "@/modules/musteri/components/para-trafigi-formu";
import { ParaTrafigiListesi } from "@/modules/musteri/components/para-trafigi-listesi";
import { EkonomiPaneli } from "@/modules/dava-dosyasi/components/ekonomi/ekonomi-paneli";
import { muvekkilDosyalari } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { CariHesapOzeti } from "@/modules/dava-dosyasi/components/cari-hesap-ozeti";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

export default async function CariHesapSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sayfa?: string; alt?: string }>;
}) {
  const { id } = await params;
  const { sayfa, alt } = await searchParams;
  const dosyalar = await muvekkilDosyalari(id);
  const aktifSayfa = dosyalar.some((x) => x.id === sayfa) ? (sayfa as string) : "genel";
  const sayfaSekmeleri = [
    { anahtar: "genel", etiket: "MÜVEKKİL ANA EKONOMİ" },
    ...dosyalar.map((x) => ({ anahtar: x.id, etiket: x.etiket, baslik: x.konu })),
  ];
  const kapsam = aktifSayfa === "genel" ? { musteriId: id } : { musteriId: id, dosyaId: aktifSayfa };
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

      <div className="mb-8">
        <EkonomiPaneli
          kapsam={kapsam}
          alt={alt ?? "ozet"}
          aktifSayfa={aktifSayfa}
          sayfaSekmeleri={sayfaSekmeleri}
          silmeYetkisiVar={silmeYetkisiVar}
          hrefYaz={({ sayfa: s2, alt: a2 }) =>
            `/kokpit/finans/musteri-iliskileri/${id}/cari-hesap?sayfa=${s2 ?? aktifSayfa}&alt=${a2 ?? (s2 ? "ozet" : (alt ?? "ozet"))}`
          }
        />
      </div>

      <details className="mt-8 rounded-2xl border border-white/10 p-4">
        <summary className="cursor-pointer text-sm text-white/60">Eski cari hesap kayıtları (önceki sistem)</summary>
        <div className="mt-4">
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Eski Cari Hesap Özeti</h2>
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
                    {dosyaKisaNo(d)}
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
      </details>
    </div>
  );
}
