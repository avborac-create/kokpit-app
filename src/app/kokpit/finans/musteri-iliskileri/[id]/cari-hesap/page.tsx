import Link from "next/link";
import { notFound } from "next/navigation";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { EkonomiPaneli } from "@/modules/dava-dosyasi/components/ekonomi/ekonomi-paneli";
import { muvekkilDosyalari } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

// NOT: "Eski cari hesap kayitlari (onceki sistem)" paneli (eski cari ozet, dosya bazinda avans
// bakiyeleri, eski para trafigi formu/listesi) kullanici karariyla bu sayfadan kaldirildi (2026-11-04).
// Veriler veritabaninda duruyor, bilesenler/sorgular (CariHesapOzeti, ParaTrafigiFormu, ParaTrafigiListesi,
// musteriCariHesapOzeti, dagitilmamisParaToplami, musteriDosyaAvansBakiyeleri) kodda arsivde; silinmedi.
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
  const [musteri, kullanici] = await Promise.all([musteriGetir(id), mevcutKullanici()]);
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
          <h1 className="text-2xl font-semibold tracking-tight text-white">Müvekkil Ekonomisi</h1>
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
    </div>
  );
}
