import Link from "next/link";
import { notFound } from "next/navigation";
import { davaDosyasiGetir, dosyaMasrafiGetir } from "@/modules/dava-dosyasi/lib/queries";
import { dosyaMasrafiGuncelle } from "@/modules/dava-dosyasi/lib/actions";
import { MasrafFormu } from "@/modules/dava-dosyasi/components/masraf-formu";

export default async function MasrafDuzenlemeSayfasi({
  params,
}: {
  params: Promise<{ id: string; masrafId: string }>;
}) {
  const { id, masrafId } = await params;
  const [dosya, masraf] = await Promise.all([davaDosyasiGetir(id), dosyaMasrafiGetir(masrafId)]);
  if (!dosya || !masraf || masraf.dosyaId !== id) notFound();

  const duzenlemeVerisi = {
    tarih: masraf.tarih.toISOString().slice(0, 10),
    cariKodId: masraf.cariKodId,
    turId: masraf.turId,
    tutar: Number(masraf.tutar),
    aciklama: masraf.aciklama,
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
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Masrafı Düzenle</h1>
        <p className="mt-1 text-sm text-white/45">
          Bir kalemin cari kodunu değiştirmek gerekebilir — ör. Bloke Para olarak tutulan bir araç
          yakalama avansı, araç yediemine çekilip icra müdürlüğüne bildirildiğinde artık kalıcı bir
          masrafa (Masraf Hesabı) dönüşebilir.
        </p>
      </div>

      <MasrafFormu
        action={dosyaMasrafiGuncelle.bind(null, id, masrafId)}
        duzenlemeVerisi={duzenlemeVerisi}
      />
    </div>
  );
}
