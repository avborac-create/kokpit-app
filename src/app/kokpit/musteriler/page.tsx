import Link from "next/link";
import { musterileriListele, avukatlariListele } from "@/modules/musteri/lib/queries";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { Dugme } from "@/core/ui/button";
import { Girdi, Secim } from "@/core/ui/form";

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

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <Girdi
          type="search"
          name="arama"
          placeholder="Ad, soyad, unvan ara…"
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
        <Secim name="avukat" defaultValue={params.avukat ?? ""} className="max-w-[12rem]">
          <option value="">Tüm sorumlu avukatlar</option>
          {avukatlar.map((avukat) => (
            <option key={avukat.id} value={avukat.id}>
              {avukat.adSoyad}
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
              <th className="px-4 py-3 font-medium">Ad Soyad / Unvan</th>
              <th className="px-4 py-3 font-medium">Tip</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Sorumlu Avukat</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
            </tr>
          </thead>
          <tbody>
            {musteriler.map((musteri) => (
              <tr key={musteri.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <Link
                    href={`/kokpit/musteriler/${musteri.id}`}
                    className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                  >
                    {musteri.adSoyadUnvan}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/60">{musteri.tip.etiket}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                    {musteri.durum.etiket}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/60">{musteri.sorumluAvukat?.adSoyad ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{musteri.telefon ?? "—"}</td>
              </tr>
            ))}
            {musteriler.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
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
