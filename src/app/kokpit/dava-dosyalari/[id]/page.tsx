import Link from "next/link";
import { notFound } from "next/navigation";
import { davaDosyasiGetir, dosyaCariHesapOzeti } from "@/modules/dava-dosyasi/lib/queries";
import { dosyaMasrafiEkle, karsiTarafAlacagiEkle } from "@/modules/dava-dosyasi/lib/actions";
import { DavaDosyasiSilmeButonu } from "@/modules/dava-dosyasi/components/dava-dosyasi-silme-butonu";
import { DosyaParaTrafigiListesi } from "@/modules/dava-dosyasi/components/dosya-para-trafigi-listesi";
import { MasrafFormu } from "@/modules/dava-dosyasi/components/masraf-formu";
import { MasrafListesi } from "@/modules/dava-dosyasi/components/masraf-listesi";
import { CariHesapOzeti } from "@/modules/dava-dosyasi/components/cari-hesap-ozeti";
import { KarsiTarafAlacagiFormu } from "@/modules/dava-dosyasi/components/karsi-taraf-alacagi-formu";
import { KarsiTarafAlacagiListesi } from "@/modules/dava-dosyasi/components/karsi-taraf-alacagi-listesi";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { Dugme } from "@/core/ui/button";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

export default async function DavaDosyasiDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dosya, kullanici, cariHesapOzeti] = await Promise.all([
    davaDosyasiGetir(id),
    mevcutKullanici(),
    dosyaCariHesapOzeti(id),
  ]);
  if (!dosya) notFound();

  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {dosya.dosyaNo ? `${dosya.dosyaNo} — ` : ""}
            {dosya.konu}
          </h1>
          <p className="mt-1 text-sm text-white/55">
            <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
              {dosya.durum.etiket}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/kokpit/dava-dosyalari/${id}/duzenle`}>
            <Dugme varyant="ikincil">Düzenle</Dugme>
          </Link>
          {silmeYetkisiVar && <DavaDosyasiSilmeButonu dosyaId={id} />}
        </div>
      </div>

      <div className="glass mb-8 grid grid-cols-2 gap-4 rounded-2xl p-5 text-sm md:grid-cols-4">
        <div>
          <p className="text-white/45">Birim (Mahkeme/İcra Dairesi)</p>
          <p className="text-white">{dosya.birimAdi ?? "—"}</p>
        </div>
        <div>
          <p className="text-white/45">Karşı Taraf</p>
          <p className="text-white">{dosya.karsiTaraf?.ad ?? "—"}</p>
        </div>
        <div>
          <p className="text-white/45">Uyuşmazlık Grubu</p>
          <p className="text-white">
            {dosya.uyusmazlikGrubu ? (
              <Link
                href={`/kokpit/dava-dosyalari/gruplar/${dosya.uyusmazlikGrubu.id}`}
                className="hover:text-[#6db8ff] hover:underline"
              >
                {dosya.uyusmazlikGrubu.ad}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div>
          <p className="text-white/45">Bağlı Olduğu Esas Dosya</p>
          <p className="text-white">
            {dosya.bagliOlduguDosya ? (
              <Link
                href={`/kokpit/dava-dosyalari/${dosya.bagliOlduguDosya.id}`}
                className="hover:text-[#6db8ff] hover:underline"
              >
                {dosya.bagliOlduguDosya.dosyaNo ?? dosya.bagliOlduguDosya.konu}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div>
          <p className="text-white/45">Müvekkil(ler)</p>
          <p className="text-white">
            {dosya.muvekkiller.map((m, i) => (
              <span key={m.musteriId}>
                {i > 0 && ", "}
                <Link
                  href={`/kokpit/musteriler/${m.musteriId}`}
                  className="hover:text-[#6db8ff] hover:underline"
                >
                  {m.musteri.adSoyadUnvan}
                </Link>
              </span>
            ))}
          </p>
        </div>
        <div>
          <p className="text-white/45">Sorumlu Avukat</p>
          <p className="text-white">{dosya.sorumluAvukat?.adSoyad ?? "—"}</p>
        </div>
        <div>
          <p className="text-white/45">Açılış Tarihi</p>
          <p className="text-white">{tarihFormatlayici.format(dosya.acilisTarihi)}</p>
        </div>
        <div>
          <p className="text-white/45">Kapanış Tarihi</p>
          <p className="text-white">
            {dosya.kapanisTarihi ? tarihFormatlayici.format(dosya.kapanisTarihi) : "—"}
          </p>
        </div>
        {dosya.aciklama && (
          <div className="col-span-2 md:col-span-4">
            <p className="text-white/45">Açıklama</p>
            <p className="whitespace-pre-wrap text-white">{dosya.aciklama}</p>
          </div>
        )}
      </div>

      {dosya.baglananDosyalar.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">
            Bu Dosyaya Bağlı Dosyalar
          </h2>
          <div className="flex flex-col gap-2">
            {dosya.baglananDosyalar.map((bagli) => (
              <Link
                key={bagli.id}
                href={`/kokpit/dava-dosyalari/${bagli.id}`}
                className="glass rounded-xl px-4 py-2.5 text-sm text-white/85 hover:bg-white/[0.06] hover:text-[#6db8ff]"
              >
                {bagli.dosyaNo ? `${bagli.dosyaNo} — ` : ""}
                {bagli.konu}
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Cari Hesap Özeti</h2>
      {dosya.uyusmazlikGrubu && (
        <p className="mb-3 text-sm text-white/45">
          Bu sadece bu dosyanın kırılımıdır. Müvekkilden gelen bir avans genelde tüm{" "}
          <Link
            href={`/kokpit/dava-dosyalari/gruplar/${dosya.uyusmazlikGrubu.id}`}
            className="text-[#6db8ff] hover:underline"
          >
            {dosya.uyusmazlikGrubu.ad}
          </Link>{" "}
          grubuna aittir — asıl Borç/Alacak durumunu grup sayfasından takip edin.
        </p>
      )}
      <div className="mb-8">
        <CariHesapOzeti ozet={cariHesapOzeti} />
      </div>

      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Para Trafiği</h2>
      <p className="mb-3 text-sm text-white/45">
        Yeni bir kayıt eklemek için ilgili müvekkilin Finans sayfasına gidip &quot;Hangi Uyuşmazlık
        Dosyası/Dosyalarına İstinaden&quot; alanından bu dosyayı seçin.
      </p>
      <DosyaParaTrafigiListesi baglantilar={dosya.paraTrafigiKayitlari} />

      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-white">Masraflar</h2>
      <div className="mb-4">
        <MasrafFormu action={dosyaMasrafiEkle.bind(null, id)} />
      </div>
      <MasrafListesi
        masraflar={dosya.masraflar.map((m) => ({ ...m, tutar: Number(m.tutar) }))}
        dosyaId={id}
        silmeYetkisiVar={silmeYetkisiVar}
      />

      <h2 className="mb-1 mt-10 text-lg font-semibold tracking-tight text-white">
        Karşı Taraftan Alacaklarımız
      </h2>
      <p className="mb-3 text-sm text-white/45">
        Müvekkilin cari hesabıyla (yukarısı) karıştırılmamalı: bu, cebimizden çıkan bir para değil
        — karşı tarafın (borçlunun) dava/icra sonucu bize/müvekkile ayrıca ödemesi gereken bir
        alacak (ör. icra vekalet ücreti).
      </p>
      <div className="mb-4">
        <KarsiTarafAlacagiFormu action={karsiTarafAlacagiEkle.bind(null, id)} />
      </div>
      <KarsiTarafAlacagiListesi
        alacaklar={dosya.karsiTarafAlacaklari.map((a) => ({ ...a, tutar: Number(a.tutar) }))}
        dosyaId={id}
        silmeYetkisiVar={silmeYetkisiVar}
      />
    </div>
  );
}
