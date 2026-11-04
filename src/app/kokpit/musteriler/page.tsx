import Link from "next/link";
import { musterileriListele, avukatlariListele } from "@/modules/musteri/lib/queries";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { Dugme } from "@/core/ui/button";
import { MusteriFiltre } from "./musteri-filtre";

export default async function MusterilerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string; durum?: string; avukat?: string }>;
}) {
  const params = await searchParams;
  const [musteriler, durumlar, avukatlar] = await Promise.all([
    musterileriListele({
      arama: params.arama,
      durumKod: params.durum,
      sorumluAvukatId: params.avukat,
    }),
    secenekleriGetir("musteri_durumu"),
    avukatlariListele(),
  ]);

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Müvekkil Fihristi</h1>
        <Link href="/kokpit/musteriler/yeni">
          <Dugme>+ Yeni Müvekkil</Dugme>
        </Link>
      </div>

      <MusteriFiltre
        arama={params.arama ?? ""}
        durum={params.durum ?? ""}
        avukat={params.avukat ?? ""}
        durumlar={durumlar.map((d) => ({ id: d.id, kod: d.kod, etiket: d.etiket }))}
        avukatlar={avukatlar.map((a) => ({ id: a.id, adSoyad: a.adSoyad }))}
      />

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Ad Soyad / Unvan</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Sorumlu Avukat</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Dosyalar</th>
            </tr>
          </thead>
          <tbody>
            {musteriler.map((musteri) => (
              <tr key={musteri.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                <td className="max-w-[15rem] truncate px-4 py-3" title={musteri.adSoyadUnvan}>
                  <Link
                    href={`/kokpit/musteriler/${musteri.id}`}
                    className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                  >
                    {musteri.adSoyadUnvan}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/60">{musteri.tip.etiket}</td>
                <td className="px-4 py-3">
                  <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                    {musteri.durum.etiket}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/60">{musteri.sorumluAvukat?.adSoyad ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{musteri.telefon ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/kokpit/dava-dosyalari?musteri=${musteri.id}`}>
                    <Dugme type="button" varyant="ikincil">
                      Dosyalar
                    </Dugme>
                  </Link>
                </td>
              </tr>
            ))}
            {musteriler.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
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
