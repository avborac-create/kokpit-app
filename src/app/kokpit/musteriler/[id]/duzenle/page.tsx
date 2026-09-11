import { notFound } from "next/navigation";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { musteriGuncelle } from "@/modules/musteri/lib/actions";
import { MusteriFormu } from "@/modules/musteri/components/musteri-formu";

export default async function MusteriDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const musteri = await musteriGetir(id);
  if (!musteri) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-black dark:text-white">
        {musteri.adSoyadUnvan} — Düzenle
      </h1>
      <MusteriFormu
        action={musteriGuncelle.bind(null, id)}
        musteri={musteri}
        gonderButonuMetni="Kaydet"
      />
    </div>
  );
}
