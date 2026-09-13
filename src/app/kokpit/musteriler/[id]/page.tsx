import Link from "next/link";
import { notFound } from "next/navigation";
import { musteriGetir } from "@/modules/musteri/lib/queries";
import { irtibatKisisiEkle } from "@/modules/musteri/lib/actions";
import { MusteriSilmeButonu } from "@/modules/musteri/components/musteri-silme-butonu";
import { IrtibatKisisiFormu } from "@/modules/musteri/components/irtibat-kisisi-formu";
import { IrtibatKisileriListesi } from "@/modules/musteri/components/irtibat-kisileri-listesi";
import { musterininDosyalari } from "@/modules/dava-dosyasi/lib/queries";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { Dugme } from "@/core/ui/button";

export default async function MusteriDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [musteri, kullanici, dosyalar] = await Promise.all([
    musteriGetir(id),
    mevcutKullanici(),
    musterininDosyalari(id),
  ]);
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
          <p className="text-white/45">Genel Telefon</p>
          <p className="text-white">{musteri.telefon ?? "—"}</p>
        </div>
        <div>
          <p className="text-white/45">Genel E-posta</p>
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

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">İrtibat Kişileri</h2>
        <div className="mb-4">
          <IrtibatKisisiFormu action={irtibatKisisiEkle.bind(null, id)} />
        </div>
        <IrtibatKisileriListesi
          kisiler={musteri.irtibatKisileri}
          musteriId={id}
          silmeYetkisiVar={silmeYetkisiVar}
        />
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-white">Dava Dosyaları</h2>
          <Link href={`/kokpit/dava-dosyalari/yeni?musteriId=${id}`}>
            <Dugme varyant="ikincil">+ Yeni Dosya</Dugme>
          </Link>
        </div>
        {dosyalar.length === 0 ? (
          <p className="text-sm text-white/40">Bu müvekkile bağlı dava dosyası yok.</p>
        ) : (
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Dosya No</th>
                  <th className="px-4 py-3 font-medium">Konu</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {dosyalar.map((dosya) => (
                  <tr key={dosya.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/kokpit/dava-dosyalari/${dosya.id}`}
                        className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                      >
                        {dosya.dosyaNo ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/85">{dosya.konu}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                        {dosya.durum.etiket}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass mb-8 flex items-center justify-between rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Finansal Kayıtlar</h2>
          <p className="mt-1 text-sm text-white/45">
            Para trafiği ve tasnif kayıtları Finans modülünden yönetilir ({musteri.paraTrafigi.length}{" "}
            kayıt).
          </p>
        </div>
        <Link href={`/kokpit/finans/${id}`}>
          <Dugme varyant="ikincil">Finansal Kayıtları Görüntüle →</Dugme>
        </Link>
      </div>
    </div>
  );
}
