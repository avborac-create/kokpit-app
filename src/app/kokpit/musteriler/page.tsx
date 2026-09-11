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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-white">Müvekkil Fihristi</h1>
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

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60">
            <tr>
              <th className="px-4 py-2 font-medium">Ad Soyad / Unvan</th>
              <th className="px-4 py-2 font-medium">Tip</th>
              <th className="px-4 py-2 font-medium">Durum</th>
              <th className="px-4 py-2 font-medium">Sorumlu Avukat</th>
              <th className="px-4 py-2 font-medium">Telefon</th>
            </tr>
          </thead>
          <tbody>
            {musteriler.map((musteri) => (
              <tr
                key={musteri.id}
                className="border-t border-black/5 hover:bg-black/[0.03] dark:border-white/5 dark:hover:bg-white/[0.03]"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/kokpit/musteriler/${musteri.id}`}
                    className="font-medium text-slate-900 hover:underline dark:text-white"
                  >
                    {musteri.adSoyadUnvan}
                  </Link>
                </td>
                <td className="px-4 py-2 text-black/70 dark:text-white/70">{musteri.tip.etiket}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                    {musteri.durum.etiket}
                  </span>
                </td>
                <td className="px-4 py-2 text-black/70 dark:text-white/70">
                  {musteri.sorumluAvukat?.adSoyad ?? "—"}
                </td>
                <td className="px-4 py-2 text-black/70 dark:text-white/70">{musteri.telefon ?? "—"}</td>
              </tr>
            ))}
            {musteriler.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
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
