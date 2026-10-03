import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { MasrafExcelAktar } from "@/modules/dava-dosyasi/components/masraf-excel-aktar";
import { kokpitNoGoster, buroNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";

export default async function MasrafAktarSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dosya = await prisma.davaDosyasi.findUnique({
    where: { id },
    select: {
      kayitNo: true,
      altSiraNo: true,
      buroNo: true,
      konu: true,
      anaDosya: { select: { kayitNo: true } },
    },
  });
  if (!dosya) notFound();

  const etiket = [kokpitNoGoster(dosya), dosya.buroNo ? buroNoGoster(dosya.buroNo) : null, dosya.konu]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="pt-3">
      <Link href={`/kokpit/dava-dosyalari/${id}?sekme=ekonomi`} className="text-sm text-[#6db8ff] hover:underline">
        ‹ Dosya Ekonomisi
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold tracking-tight text-white">Excel'den Masraf Aktar</h1>
      <MasrafExcelAktar dosyaId={id} dosyaEtiketi={etiket} />
    </div>
  );
}
