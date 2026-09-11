import Link from "next/link";
import { notFound } from "next/navigation";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { paraTrafigiKaydiEkle } from "@/modules/musteri/lib/actions";
import { ParaTrafigiFormu } from "@/modules/musteri/components/para-trafigi-formu";
import { ParaTrafigiListesi } from "@/modules/musteri/components/para-trafigi-listesi";
import { MusteriSilmeButonu } from "@/modules/musteri/components/musteri-silme-butonu";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { Dugme } from "@/core/ui/button";

export default async function MusteriDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [musteri, kullanici] = await Promise.all([musteriGetir(id), mevcutKullanici()]);
  if (!musteri) notFound();

  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">{musteri.adSoyadUnvan}</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {musteri.tip.etiket} ·{" "}
            <span className="rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
              {musteri.durum.etiket}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/kokpit/musteriler/${id}/duzenle`}>
            <Dugme varyant="ikincil">Düzenle</Dugme>
          </Link>
          {silmeYetkisiVar && <MusteriSilmeButonu musteriId={id} />}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 rounded-lg border border-black/10 p-4 text-sm dark:border-white/10 md:grid-cols-4">
        <div>
          <p className="text-black/50 dark:text-white/50">Telefon</p>
          <p className="text-black dark:text-white">{musteri.telefon ?? "—"}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">E-posta</p>
          <p className="text-black dark:text-white">{musteri.eposta ?? "—"}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Sorumlu Avukat</p>
          <p className="text-black dark:text-white">{musteri.sorumluAvukat?.adSoyad ?? "—"}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Adres</p>
          <p className="text-black dark:text-white">{musteri.adres ?? "—"}</p>
        </div>
        {musteri.notlar && (
          <div className="col-span-2 md:col-span-4">
            <p className="text-black/50 dark:text-white/50">Notlar</p>
            <p className="whitespace-pre-wrap text-black dark:text-white">{musteri.notlar}</p>
          </div>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">Para Trafiği</h2>
      <div className="mb-4">
        <ParaTrafigiFormu action={paraTrafigiKaydiEkle.bind(null, id)} />
      </div>
      <ParaTrafigiListesi kayitlar={musteri.paraTrafigi} silmeYetkisiVar={silmeYetkisiVar} />
    </div>
  );
}
