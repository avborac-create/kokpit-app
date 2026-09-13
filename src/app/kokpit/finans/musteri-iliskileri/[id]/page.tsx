import Link from "next/link";
import { notFound } from "next/navigation";
import { musteriGetir } from "@/modules/musteri/lib/queries";

export default async function MusteriFinansAksiyonSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const musteri = await musteriGetir(id);
  if (!musteri) notFound();

  return (
    <div className="pt-3">
      <Link href="/kokpit/finans/musteri-iliskileri" className="text-sm text-[#6db8ff] hover:underline">
        ‹ Müvekkil Finansal İlişkiler
      </Link>
      <h1 className="mt-1 mb-6 text-2xl font-semibold tracking-tight text-white">{musteri.adSoyadUnvan}</h1>
      <p className="mb-4 text-sm text-white/55">Ne yapmak istiyorsunuz?</p>

      <div className="flex flex-col gap-3">
        <Link
          href={`/kokpit/finans/musteri-iliskileri/${id}/cari-hesap`}
          className="glass block rounded-2xl p-5 transition-colors hover:bg-white/[0.06]"
        >
          <p className="font-medium text-white">Cari Hesap Yönetmek</p>
          <p className="mt-1 text-sm text-white/55">
            Tahsilat girişi, cari kodlara tasnif ve dosya bazlı masraf takibi.
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
