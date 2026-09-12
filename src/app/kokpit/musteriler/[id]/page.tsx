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
    <div className="pt-3">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{musteri.adSoyadUnvan}</h1>
          <p className="mt-1 text-sm text-white/55">
            {musteri.tip.etiket} ·{" "}
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
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

      <div className="glass mb-8 grid grid-cols-2 gap-4 rounded-2xl p-5 text-sm md:grid-cols-4">
        <div>
          <p className="text-white/45">Telefon</p>
          <p className="text-white">{musteri.telefon ?? "—"}</p>
        </div>
        <div>
          <p className="text-white/45">E-posta</p>
          <p className="text-white">{musteri.eposta ?? "—"}</p>
        </div>
        <div>
          <p className="text-white/45">Sorumlu Avukat</p>
          <p className="text-white">{musteri.sorumluAvukat?.adSoyad ?? "—"}</p>
        </div>
        <div>
          <p className="text-white/45">Adres</p>
          <p className="text-white">{musteri.adres ?? "—"}</p>
        </div>
        {musteri.notlar && (
          <div className="col-span-2 md:col-span-4">
            <p className="text-white/45">Notlar</p>
            <p className="whitespace-pre-wrap text-white">{musteri.notlar}</p>
          </div>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Para Trafiği</h2>
      <div className="mb-4">
        <ParaTrafigiFormu action={paraTrafigiKaydiEkle.bind(null, id)} />
      </div>
      <ParaTrafigiListesi kayitlar={musteri.paraTrafigi} silmeYetkisiVar={silmeYetkisiVar} />
    </div>
  );
}
