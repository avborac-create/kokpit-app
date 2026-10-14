import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { paraGirisiGuncelle } from "@/modules/dava-dosyasi/lib/dosya-ekonomisi-actions";
import { ParaGirisiFormu } from "@/modules/dava-dosyasi/components/ekonomi/ekonomi-formlari";

export default async function ParaGirisiDuzenlemeSayfasi({
  params,
}: {
  params: Promise<{ id: string; girisId: string }>;
}) {
  const { id, girisId } = await params;
  const giris = await prisma.dosyaParaGirisi.findUnique({
    where: { id: girisId },
    include: { dagitimlar: { select: { tutar: true } } },
  });
  if (!giris || giris.dosyaId !== id) notFound();
  const dagitilan = giris.dagitimlar.reduce((t, d) => t + Number(d.tutar), 0);

  return (
    <div className="pt-3">
      <div className="mb-6">
        <Link
          href={`/kokpit/dava-dosyalari/${id}?sekme=ekonomi&alt=havuz`}
          className="text-sm text-[#6db8ff] hover:underline"
        >
          ‹ 101 Havuz
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Para Girişini Düzenle</h1>
        <p className="mt-1 text-sm text-white/45">
          Tarih, tutar ve açıklamayı düzeltebilirsiniz.
          {dagitilan > 0 &&
            ` Bu girişten cari kodlara ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
              dagitilan,
            )} aktarılmış; tutar bunun altına indirilemez.`}
        </p>
      </div>
      <ParaGirisiFormu
        action={paraGirisiGuncelle.bind(null, girisId, id)}
        duzenlemeVerisi={{
          tarih: giris.tarih.toISOString().slice(0, 10),
          tutar: Number(giris.tutar),
          aciklama: giris.aciklama ?? "",
        }}
      />
    </div>
  );
}
