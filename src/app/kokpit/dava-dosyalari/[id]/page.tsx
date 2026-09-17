import Link from "next/link";
import { notFound } from "next/navigation";
import { davaDosyasiGetir, dosyaCariHesapOzeti, dosyaCariHesapDefteri } from "@/modules/dava-dosyasi/lib/queries";
import { dosyaMasrafiEkle, karsiTarafAlacagiEkle, dosyaFaturasiEkle } from "@/modules/dava-dosyasi/lib/actions";
import { DavaDosyasiSilmeButonu } from "@/modules/dava-dosyasi/components/dava-dosyasi-silme-butonu";
import { DosyaParaTrafigiListesi } from "@/modules/dava-dosyasi/components/dosya-para-trafigi-listesi";
import { MasrafFormu } from "@/modules/dava-dosyasi/components/masraf-formu";
import { MasrafListesi } from "@/modules/dava-dosyasi/components/masraf-listesi";
import { FaturaFormu } from "@/modules/dava-dosyasi/components/fatura-formu";
import { FaturaListesi } from "@/modules/dava-dosyasi/components/fatura-listesi";
import { DosyaCariHesapDefteri } from "@/modules/dava-dosyasi/components/dosya-cari-hesap-defteri";
import { CariHesapOzeti } from "@/modules/dava-dosyasi/components/cari-hesap-ozeti";
import { DokumTablosu } from "@/modules/dava-dosyasi/components/dokum-tablosu";
import type { DokumSatiri } from "@/modules/dava-dosyasi/lib/queries";
import { KarsiTarafAlacagiFormu } from "@/modules/dava-dosyasi/components/karsi-taraf-alacagi-formu";
import { KarsiTarafAlacagiListesi } from "@/modules/dava-dosyasi/components/karsi-taraf-alacagi-listesi";
import { DosyaEvresiBlok } from "@/modules/dava-dosyasi/components/dosya-evresi-blok";
import { AvukatSapkasiBlok } from "@/modules/dava-dosyasi/components/avukat-sapkasi-blok";
import { ArtciIslerBlok } from "@/modules/dava-dosyasi/components/artci-isler-blok";
import { DosyaKartiSekmeleri } from "@/modules/dava-dosyasi/components/dosya-karti-sekmeleri";
import { EVRE_ONERI_HARITASI, ACIK_HUKUKI_MUDAHALE_DURUMLARI } from "@/modules/dava-dosyasi/lib/sabitler";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { avukatlariListele } from "@/modules/musteri/lib/queries";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { Dugme } from "@/core/ui/button";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");
const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export default async function DavaDosyasiDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dosya, kullanici, cariHesapOzeti, cariHesapDefteri, mudahaleTurleri, oncelikler, avukatlar] =
    await Promise.all([
      davaDosyasiGetir(id),
      mevcutKullanici(),
      dosyaCariHesapOzeti(id),
      dosyaCariHesapDefteri(id),
      secenekleriGetir("hukuki_mudahale_turu"),
      secenekleriGetir("hukuki_mudahale_onceligi"),
      avukatlariListele(),
    ]);
  if (!dosya) notFound();

  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));

  const acikMudahaleler = dosya.hukukiMudahaleler.filter((m) =>
    ACIK_HUKUKI_MUDAHALE_DURUMLARI.includes(m.durum),
  );
  const evreOneri = dosya.dosyaEvresi ? EVRE_ONERI_HARITASI[dosya.dosyaEvresi] : undefined;
  // İPTAL_EDILDI haric tum mudahaleler: is tamamlanmissa oneri tekrar
  // cikmamali, ama kullanici oneriyi iptal ettiyse tekrar sorulabilir.
  const oneriHalihazirdaVarMi = evreOneri
    ? dosya.hukukiMudahaleler
        .filter((m) => m.durum !== "IPTAL_EDILDI")
        .some(
          (m) =>
            m.mudahaleTuru?.kod === evreOneri.mudahaleTuruKodu ||
            m.baslik.trim().toLowerCase() === evreOneri.baslik.trim().toLowerCase(),
        )
    : false;
  const oneri =
    evreOneri && !oneriHalihazirdaVarMi
      ? {
          baslik: evreOneri.baslik,
          mudahaleTuruId: mudahaleTurleri.find((t) => t.kod === evreOneri.mudahaleTuruKodu)?.id ?? null,
        }
      : null;

  const dosyaDokumu: DokumSatiri[] = [
    ...dosya.masraflar.map((m) => ({
      id: `masraf-${m.id}`,
      tarih: m.tarih,
      kaynak: "masraf" as const,
      tutar: Number(m.tutar),
      dosyaId: id,
      dosyaKonu: dosya.konu,
      aciklama: `${m.tur.etiket} — ${m.aciklama}`,
    })),
    ...dosya.paraTrafigiDagitimlari.map((d) => ({
      id: `dagitim-${d.id}`,
      tarih: d.olusturmaTarihi,
      kaynak: "dagitim" as const,
      tutar: Number(d.tutar),
      dosyaId: id,
      dosyaKonu: dosya.konu,
      aciklama: d.kullanimAmaci.etiket,
    })),
  ].sort((a, b) => b.tarih.getTime() - a.tarih.getTime());

  const genelIcerik = (
    <>
      <div className="glass mb-8 grid grid-cols-2 gap-4 rounded-2xl p-5 text-sm md:grid-cols-4">
        <div>
          <p className="text-white/45">Birim (Mahkeme/İcra Dairesi)</p>
          <p className="text-white">{dosya.birimAdi ?? "—"}</p>
        </div>
        <div>
          <p className="text-white/45">Karşı Taraf(lar)</p>
          <p className="text-white">
            {dosya.karsiTaraflar.length > 0
              ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ")
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-white/45">Dosya Kümesi</p>
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

      <div className="mb-8 flex flex-col gap-4">
        <DosyaEvresiBlok
          davaDosyasiId={id}
          dosyaEvresi={dosya.dosyaEvresi}
          evreDegisiklikTarihi={dosya.evreDegisiklikTarihi}
          sonrakiKontrolTarihi={dosya.sonrakiKontrolTarihi}
          sonrakiKontrolSorusu={dosya.sonrakiKontrolSorusu}
          sonKontrolTarihi={dosya.sonKontrolTarihi}
          sonKontrolSonucu={dosya.sonKontrolSonucu}
        />
        <AvukatSapkasiBlok
          davaDosyasiId={id}
          acikMudahaleler={acikMudahaleler.map((m) => ({
            id: m.id,
            baslik: m.baslik,
            durum: m.durum,
            sonTarih: m.sonTarih,
            mudahaleTuru: m.mudahaleTuru,
            oncelik: m.oncelik,
            sorumluAvukat: m.sorumluAvukat,
          }))}
          oneri={oneri}
          mudahaleTurleri={mudahaleTurleri}
          oncelikler={oncelikler}
          avukatlar={avukatlar}
        />
        <ArtciIslerBlok
          karsiTarafAlacaklari={dosya.karsiTarafAlacaklari.map((a) => ({ ...a, tutar: Number(a.tutar) }))}
          finansHareketleri={dosya.finansHareketleri.map((h) => ({ ...h, tutar: Number(h.tutar) }))}
        />
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

      <h2 className="mb-1 text-lg font-semibold tracking-tight text-white">
        Karşı Taraftan Alacaklarımız
      </h2>
      <p className="mb-3 text-sm text-white/45">
        Müvekkilin cari hesabıyla (Cari Hesap sekmesi) karıştırılmamalı: bu, cebimizden çıkan bir para
        değil — karşı tarafın (borçlunun) dava/icra sonucu bize/müvekkile ayrıca ödemesi gereken bir
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
    </>
  );

  const cariHesapIcerik = (
    <>
      <p className="mb-4 text-sm text-white/45">
        Bu dosyanın cari hesabına yalnızca iki şey işlenir: dosyaya kesilen faturalar (borç) ve bu
        dosyaya istinaden müvekkilden gelen paralar (alacak, aşağıdaki Para Trafiği kayıtlarından
        gelir).
      </p>
      <div className="mb-8">
        <DosyaCariHesapDefteri defter={cariHesapDefteri} />
      </div>

      <h3 className="mb-3 text-base font-semibold tracking-tight text-white">Faturalar</h3>
      <div className="mb-4">
        <FaturaFormu action={dosyaFaturasiEkle.bind(null, id)} />
      </div>
      <div className="mb-8">
        <FaturaListesi
          faturalar={dosya.faturalar.map((f) => ({ ...f, tutar: Number(f.tutar) }))}
          dosyaId={id}
          silmeYetkisiVar={silmeYetkisiVar}
        />
      </div>

      <h3 className="mb-3 text-base font-semibold tracking-tight text-white">Para Trafiği</h3>
      <p className="mb-3 text-sm text-white/45">
        Yeni bir tahsilat kaydı eklemek için ilgili müvekkilin Finans sayfasına gidip &quot;Hangi
        Uyuşmazlık Dosyası/Dosyalarına İstinaden&quot; alanından bu dosyayı seçin.
      </p>
      <div className="mb-8">
        <DosyaParaTrafigiListesi baglantilar={dosya.paraTrafigiKayitlari} />
      </div>

      <details className="group">
        <summary className="mb-4 cursor-pointer text-sm font-medium text-white/50 hover:text-white/75">
          Detaylı (Eski) Görünüm — Cari Kod Bazlı Tasnif/Masraf Sistemi
        </summary>
        <div className="mt-2">
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

          <h4 className="mb-3 text-sm font-semibold tracking-tight text-white">Dosya Bazında Döküm</h4>
          <div className="mb-8">
            <DokumTablosu satirlar={dosyaDokumu} dosyaSutunuGoster={false} />
          </div>

          <h4 className="mb-3 text-sm font-semibold tracking-tight text-white">Masraflar</h4>
          <div className="mb-4">
            <MasrafFormu action={dosyaMasrafiEkle.bind(null, id)} />
          </div>
          <MasrafListesi
            masraflar={dosya.masraflar.map((m) => ({ ...m, tutar: Number(m.tutar) }))}
            dosyaId={id}
            silmeYetkisiVar={silmeYetkisiVar}
          />
        </div>
      </details>
    </>
  );

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            <span className="text-white/45">KP-{String(dosya.kayitNo).padStart(4, "0")}</span>
            {dosya.dosyaNo ? ` · ${dosya.dosyaNo}` : ""}
            {" — "}
            {dosya.konu}
          </h1>
          <p className="mt-1 flex flex-wrap gap-2 text-sm text-white/55">
            <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
              {dosya.durum.etiket}
            </span>
            {dosya.tur && (
              <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/70">
                {dosya.tur.etiket}
              </span>
            )}
            {dosya.hukukiIliskiTuru && (
              <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/70">
                {dosya.hukukiIliskiTuru.etiket}
              </span>
            )}
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${
                cariHesapDefteri.bakiye > 0
                  ? "bg-[#ff7a70]/15 text-[#ff7a70]"
                  : cariHesapDefteri.bakiye < 0
                    ? "bg-[#32d74b]/15 text-[#32d74b]"
                    : "bg-white/[0.06] text-white/60"
              }`}
            >
              Bakiye: {paraFormatlayici.format(cariHesapDefteri.bakiye)}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/kokpit/dava-dosyalari/${id}/duzenle`}>
            <Dugme varyant="ikincil">Düzenle</Dugme>
          </Link>
          {silmeYetkisiVar && (
            <DavaDosyasiSilmeButonu dosyaId={id} sonrasindaYonlendir="/kokpit/dava-dosyalari" />
          )}
        </div>
      </div>

      <DosyaKartiSekmeleri
        sekmeler={[
          { id: "genel", baslik: "Genel", icerik: genelIcerik },
          { id: "cari-hesap", baslik: "Cari Hesap", icerik: cariHesapIcerik },
        ]}
      />
    </div>
  );
}
