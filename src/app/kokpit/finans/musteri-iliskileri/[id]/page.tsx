import Link from "next/link";
import { notFound } from "next/navigation";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { musterininDosyalari } from "@/modules/dava-dosyasi/lib/queries";
import { Dugme } from "@/core/ui/button";

export default async function MusteriFinansAksiyonSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [musteri, dosyalar] = await Promise.all([musteriGetir(id), musterininDosyalari(id)]);
  if (!musteri) notFound();

  return (
    <div className="pt-3">
      <Link href="/kokpit/finans/musteri-iliskileri" className="text-sm text-[#6db8ff] hover:underline">
        ‹ Müvekkil Finansal İlişkiler
      </Link>
      <h1 className="mt-1 mb-6 text-2xl font-semibold tracking-tight text-white">{musteri.adSoyadUnvan}</h1>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-white">Dosyalar</h2>
          <Link href={`/kokpit/dava-dosyalari/yeni?musteriId=${id}`}>
            <Dugme varyant="ikincil">+ Yeni Dosya</Dugme>
          </Link>
        </div>
        <p className="mb-3 text-sm text-white/45">
          Bir işin başlangıç noktası dosyadır — müvekkilden para gelmeden de masraf yapılabilir
          (harç, pul vb.). Masraf girmek için ilgili dosyaya girin.
        </p>
        {dosyalar.length === 0 ? (
          <p className="glass rounded-xl px-4 py-3 text-sm text-white/40">
            Bu müvekkile bağlı dava dosyası yok. Önce bir dosya açın.
          </p>
        ) : (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Kokpit No</th>
                  <th className="px-4 py-3 font-medium">Dosya No</th>
                  <th className="px-4 py-3 font-medium">Tür</th>
                  <th className="px-4 py-3 font-medium">Konu</th>
                  <th className="px-4 py-3 font-medium">Karşı Taraf(lar)</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
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
                    <td className="px-4 py-3 text-white/60">{dosya.dosyaNo ?? "—"}</td>
                    <td className="px-4 py-3 text-white/60">{dosya.tur?.etiket ?? "—"}</td>
                    <td className="px-4 py-3 text-white/85">{dosya.konu}</td>
                    <td className="px-4 py-3 text-white/60">
                      {dosya.karsiTaraflar.length > 0
                        ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                        {dosya.durum.etiket}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Cari Hesap</h2>
      <div className="flex flex-col gap-3">
        <Link
          href={`/kokpit/finans/musteri-iliskileri/${id}/cari-hesap`}
          className="glass block rounded-2xl p-5 transition-colors hover:bg-white/[0.06]"
        >
          <p className="font-medium text-white">Cari Hesap Yönetmek</p>
          <p className="mt-1 text-sm text-white/55">
            Müvekkilden gelen tahsilatları girin ve cari kodlara tasnif edin.
          </p>
        </Link>

        <div className="glass rounded-2xl p-5 opacity-50">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">Finansal Rapor Oluştur</p>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/50">
              Yakında
            </span>
          </div>
          <p className="mt-1 text-sm text-white/40">Müvekkile sunulacak tek parça PDF raporu.</p>
        </div>
      </div>
    </div>
  );
}
