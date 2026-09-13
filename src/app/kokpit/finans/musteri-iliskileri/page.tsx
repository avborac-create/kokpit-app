import Link from "next/link";
import { musterileriListele } from "@/modules/musteri/lib/queries";
import { Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";

export default async function MusteriIliskileriSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string }>;
}) {
  const params = await searchParams;
  const musteriler = await musterileriListele({ arama: params.arama });

  return (
    <div className="pt-3">
      <Link href="/kokpit/finans" className="text-sm text-[#6db8ff] hover:underline">
        ‹ Finans
      </Link>
      <div className="mt-1 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Müvekkil Finansal İlişkiler</h1>
        <p className="mt-1 text-sm text-white/55">Bir müvekkil seçin.</p>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <Girdi
          type="search"
          name="arama"
          placeholder="Müvekkil ara…"
          defaultValue={params.arama}
          className="max-w-xs"
        />
        <Dugme type="submit" varyant="ikincil">
          Filtrele
        </Dugme>
      </form>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Ad Soyad / Unvan</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Kayıt Sayısı</th>
            </tr>
          </thead>
          <tbody>
            {musteriler.map((musteri) => (
              <tr key={musteri.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <Link
                    href={`/kokpit/finans/musteri-iliskileri/${musteri.id}`}
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
                <td className="px-4 py-3 text-white/60">{musteri._count.paraTrafigi}</td>
              </tr>
            ))}
            {musteriler.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/40">
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
