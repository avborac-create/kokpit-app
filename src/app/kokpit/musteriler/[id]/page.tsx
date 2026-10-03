import Link from "next/link";
import { kokpitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { notFound } from "next/navigation";
import { musteriGetir, avukatlariListele } from "@/modules/musteri/lib/queries";
import { irtibatKisisiEkle, musteriAlanlariniGuncelle } from "@/modules/musteri/lib/actions";
import { MusteriSilmeButonu } from "@/modules/musteri/components/musteri-silme-butonu";
import { IrtibatKisisiFormu } from "@/modules/musteri/components/irtibat-kisisi-formu";
import { IrtibatKisileriListesi } from "@/modules/musteri/components/irtibat-kisileri-listesi";
import { musterininDosyalari } from "@/modules/dava-dosyasi/lib/queries";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { Dugme } from "@/core/ui/button";
import { DuzenlenebilirKart, type KartAlani } from "@/core/ui/duzenlenebilir-kart";
import { etiketleriGetir } from "@/core/arayuz-etiketi/queries";

export default async function MusteriDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [musteri, kullanici, dosyalar, avukatlar, etiketler] = await Promise.all([
    musteriGetir(id),
    mevcutKullanici(),
    musterininDosyalari(id),
    avukatlariListele(),
    etiketleriGetir(),
  ]);
  if (!musteri) notFound();

  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));
  const bilgiAlanlari: KartAlani[] = [
    { anahtar: "telefon", varsayilanEtiket: "Genel Telefon", tip: "metin", deger: musteri.telefon ?? "", gosterim: musteri.telefon ?? "—" },
    { anahtar: "eposta", varsayilanEtiket: "Genel E-posta", tip: "metin", deger: musteri.eposta ?? "", gosterim: musteri.eposta ?? "—" },
    {
      anahtar: "sorumluAvukatId",
      varsayilanEtiket: "Sorumlu Avukat",
      tip: "secim",
      deger: musteri.sorumluAvukatId ?? "",
      gosterim: musteri.sorumluAvukat?.adSoyad ?? "—",
      secenekler: [{ value: "", label: "—" }, ...avukatlar.map((a) => ({ value: a.id, label: a.adSoyad }))],
    },
    { anahtar: "adres", varsayilanEtiket: "Adres", tip: "cokSatir", deger: musteri.adres ?? "", gosterim: musteri.adres ?? "—" },
    {
      anahtar: "notlar",
      varsayilanEtiket: "Notlar",
      tip: "cokSatir",
      deger: musteri.notlar ?? "",
      gosterim: musteri.notlar ? <span className="whitespace-pre-wrap">{musteri.notlar}</span> : "—",
    },
  ];

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{musteri.adSoyadUnvan}</h1>
          <p className="mt-1 text-sm text-white/55">
            {musteri.tip.etiket} ·{" "}
            <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
              {musteri.durum.etiket}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/kokpit/dava-dosyalari?musteri=${id}`}>
            <Dugme>Dosyaları</Dugme>
          </Link>
          <Link href={`/kokpit/musteriler/${id}/duzenle`}>
            <Dugme varyant="ikincil">Düzenle</Dugme>
          </Link>
          {silmeYetkisiVar && <MusteriSilmeButonu musteriId={id} />}
        </div>
      </div>

      <div className="mb-8 max-w-2xl">
        <DuzenlenebilirKart
          etiketOnEki="musteri-detay.genel-bilgiler"
          varsayilanBaslik="Genel Bilgiler"
          etiketler={etiketler}
          alanlar={bilgiAlanlari}
          etiketDuzenleyebilir={silmeYetkisiVar}
          onKaydet={musteriAlanlariniGuncelle.bind(null, id)}
        />
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
                  <th className="px-4 py-3 font-medium">Kokpit No</th>
                  <th className="px-4 py-3 font-medium">Dosya No</th>
                  <th className="px-4 py-3 font-medium">Tür</th>
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
                        {kokpitNoGoster(dosya)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/60">{dosya.dosyaNo ?? "—"}</td>
                    <td className="px-4 py-3 text-white/60">{dosya.tur?.etiket ?? "—"}</td>
                    <td className="px-4 py-3 text-white/85">{dosya.konu}</td>
                    <td className="px-4 py-3">
                      <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
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
        <Link href={`/kokpit/finans/musteri-iliskileri/${id}/cari-hesap`}>
          <Dugme varyant="ikincil">Finansal Kayıtları Görüntüle →</Dugme>
        </Link>
      </div>
    </div>
  );
}
