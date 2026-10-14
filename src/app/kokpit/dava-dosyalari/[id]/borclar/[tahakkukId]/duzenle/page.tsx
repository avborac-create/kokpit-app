import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { cariTahakkukGuncelle } from "@/modules/dava-dosyasi/lib/dosya-ekonomisi-actions";
import { TahakkukFormu } from "@/modules/dava-dosyasi/components/ekonomi/ekonomi-formlari";

export default async function TahakkukDuzenlemeSayfasi({
  params,
}: {
  params: Promise<{ id: string; tahakkukId: string }>;
}) {
  const { id, tahakkukId } = await params;
  const tahakkuk = await prisma.dosyaCariTahakkuku.findUnique({
    where: { id: tahakkukId },
    include: { cariKod: true },
  });
  if (!tahakkuk || tahakkuk.dosyaId !== id) notFound();

  return (
    <div className="pt-3">
      <div className="mb-6">
        <Link
          href={`/kokpit/dava-dosyalari/${id}?sekme=ekonomi&alt=${tahakkuk.cariKod.kod}`}
          className="text-sm text-[#6db8ff] hover:underline"
        >
          ‹ {tahakkuk.cariKod.etiket}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Borç Kaydını Düzenle</h1>
      </div>
      <TahakkukFormu
        action={cariTahakkukGuncelle.bind(null, tahakkukId, id)}
        cariKodId={tahakkuk.cariKodId}
        duzenlemeVerisi={{
          tarih: tahakkuk.tarih.toISOString().slice(0, 10),
          tutar: Number(tahakkuk.tutar),
          dayanak: tahakkuk.dayanak,
        }}
      />
    </div>
  );
}
