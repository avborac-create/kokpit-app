import Link from "next/link";
import { notFound } from "next/navigation";
import { davaDosyasiGetir, dosyaFaturasiGetir } from "@/modules/dava-dosyasi/lib/queries";
import { dosyaFaturasiGuncelle } from "@/modules/dava-dosyasi/lib/actions";
import { FaturaFormu } from "@/modules/dava-dosyasi/components/fatura-formu";

export default async function FaturaDuzenlemeSayfasi({
  params,
}: {
  params: Promise<{ id: string; faturaId: string }>;
}) {
  const { id, faturaId } = await params;
  const [dosya, fatura] = await Promise.all([davaDosyasiGetir(id), dosyaFaturasiGetir(faturaId)]);
  if (!dosya || !fatura || fatura.dosyaId !== id) notFound();

  const duzenlemeVerisi = {
    tarih: fatura.tarih.toISOString().slice(0, 10),
    turId: fatura.turId,
    tutar: Number(fatura.tutar),
    aciklama: fatura.aciklama,
  };

  return (
    <div className="pt-3">
      <div className="mb-6">
        <Link
          href={`/kokpit/dava-dosyalari/${id}`}
          className="text-sm text-[#6db8ff] hover:underline"
        >
          ‹ {dosya.dosyaNo ? `${dosya.dosyaNo} — ` : ""}
          {dosya.konu}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Faturayı Düzenle</h1>
      </div>

      <FaturaFormu action={dosyaFaturasiGuncelle.bind(null, id, faturaId)} duzenlemeVerisi={duzenlemeVerisi} />
    </div>
  );
}
