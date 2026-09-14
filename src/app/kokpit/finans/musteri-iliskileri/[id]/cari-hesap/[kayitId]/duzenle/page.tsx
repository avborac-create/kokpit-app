import Link from "next/link";
import { notFound } from "next/navigation";
import { musteriGetir, paraTrafigiKaydiGetir } from "@/modules/musteri/lib/queries";
import { paraTrafigiKaydiGuncelle } from "@/modules/musteri/lib/actions";
import { ParaTrafigiFormu } from "@/modules/musteri/components/para-trafigi-formu";

export default async function ParaTrafigiKaydiDuzenlemeSayfasi({
  params,
}: {
  params: Promise<{ id: string; kayitId: string }>;
}) {
  const { id, kayitId } = await params;
  const [musteri, kayit] = await Promise.all([musteriGetir(id), paraTrafigiKaydiGetir(kayitId)]);
  if (!musteri || !kayit || kayit.musteriId !== id) notFound();

  const duzenlemeVerisi = {
    tarih: kayit.tarih.toISOString().slice(0, 10),
    tipId: kayit.tipId,
    tutar: Number(kayit.tutar),
    durumId: kayit.durumId,
    kaynakId: kayit.kaynakId,
    aciklama: kayit.aciklama,
    seciliDosyaIdler: kayit.dosyalar.map((d) => d.dosyaId),
    tasnifVarsayilan: Object.fromEntries(kayit.tasnif.map((t) => [t.cariKodId, Number(t.tutar)])),
    uyusmazlikGrubuId: kayit.uyusmazlikGrubuId,
    dagitimSatirlari: kayit.dagitimlar.map((d) => ({
      kumeId: d.uyusmazlikGrubuId,
      dosyaId: d.dosyaId,
      amaciId: d.kullanimAmaciId,
      tutar: Number(d.tutar),
    })),
  };

  return (
    <div className="pt-3">
      <div className="mb-6">
        <Link
          href={`/kokpit/finans/musteri-iliskileri/${id}/cari-hesap`}
          className="text-sm text-[#6db8ff] hover:underline"
        >
          ‹ {musteri.adSoyadUnvan} — Cari Hesap
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Para Trafiği Kaydını Düzenle
        </h1>
      </div>

      <ParaTrafigiFormu
        action={paraTrafigiKaydiGuncelle.bind(null, id, kayitId)}
        musteriId={id}
        duzenlemeVerisi={duzenlemeVerisi}
      />
    </div>
  );
}
