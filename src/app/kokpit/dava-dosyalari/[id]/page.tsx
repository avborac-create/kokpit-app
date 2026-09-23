import Link from "next/link";
import { notFound } from "next/navigation";
import { davaDosyasiGetir, dosyaCariHesapOzeti } from "@/modules/dava-dosyasi/lib/queries";
import { dosyaMasrafiEkle, karsiTarafAlacagiEkle, adliBirimHareketiEkle } from "@/modules/dava-dosyasi/lib/actions";
import { DavaDosyasiSilmeButonu } from "@/modules/dava-dosyasi/components/dava-dosyasi-silme-butonu";
import { DosyaParaTrafigiListesi } from "@/modules/dava-dosyasi/components/dosya-para-trafigi-listesi";
import { MasrafFormu } from "@/modules/dava-dosyasi/components/masraf-formu";
import { MasrafListesi } from "@/modules/dava-dosyasi/components/masraf-listesi";
import { CariHesapOzeti } from "@/modules/dava-dosyasi/components/cari-hesap-ozeti";
import { DokumTablosu } from "@/modules/dava-dosyasi/components/dokum-tablosu";
import type { DokumSatiri } from "@/modules/dava-dosyasi/lib/queries";
import { KarsiTarafAlacagiFormu } from "@/modules/dava-dosyasi/components/karsi-taraf-alacagi-formu";
import { KarsiTarafAlacagiListesi } from "@/modules/dava-dosyasi/components/karsi-taraf-alacagi-listesi";
import { ArtciIslerBlok } from "@/modules/dava-dosyasi/components/artci-isler-blok";
import { AdliBirimHareketFormu } from "@/modules/dava-dosyasi/components/adli-birim-hareket-formu";
import { AdliBirimHareketListesi } from "@/modules/dava-dosyasi/components/adli-birim-hareket-listesi";
import { DavaDosyasiSekmeleri } from "@/modules/dava-dosyasi/components/dava-dosyasi-sekmeleri";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { Dugme } from "@/core/ui/button";
import { FormKarti } from "@/core/ui/form-karti";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

// FormKarti icinde salt-okunur bir alan/deger cifti - Dava Dosyasi
// formundaki Etiket+Girdi ikilisinin goruntuleme-modu karsiligi, ayni
// kart yapisi iki ekranda da tutarli kalsin diye.
function Bilgi({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 text-sm last:mb-0">
      <p className="text-white/45">{baslik}</p>
      <p className="text-white">{children}</p>
    </div>
  );
}

// Dosya Ekonomisi sekmesindeki 3 cari hesap iliskisini (Müvekkil-Büro,
// Büro-Adli Birim, Borçlu-Büro) birbirinden GORSEL OLARAK NET AYIRMAK
// icin - kullanici geri bildirimi: bunlar art arda akan basliklar degil,
// ayri kartlar olarak durmali.
function CariHesapBolumu({
  baslik,
  aciklama,
  children,
}: {
  baslik: string;
  aciklama?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-white">{baslik}</h2>
      {aciklama && <p className="mb-4 text-sm text-white/45">{aciklama}</p>}
      {children}
    </div>
  );
}

export default async function DavaDosyasiDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sekme?: string }>;
}) {
  const { id } = await params;
  const { sekme } = await searchParams;
  const aktifSekme = sekme === "ekonomi" ? "ekonomi" : "genel";
  const [dosya, kullanici, cariHesapOzeti] = await Promise.all([
    davaDosyasiGetir(id),
    mevcutKullanici(),
    dosyaCariHesapOzeti(id),
  ]);
  if (!dosya) notFound();

  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));

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
            {(dosya.icraAltTuru ?? dosya.yargiKolu) && (
              <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/70">
                {(dosya.icraAltTuru ?? dosya.yargiKolu)!.etiket}
              </span>
            )}
            {dosya.hukukiIliskiTuru && (
              <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/70">
                {dosya.hukukiIliskiTuru.etiket}
              </span>
            )}
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

      <DavaDosyasiSekmeleri dosyaId={id} aktif={aktifSekme} />

      {aktifSekme === "genel" ? (
        <>
          <div className="mb-8 max-w-2xl">
            <FormKarti baslik="Taraflar">
              <Bilgi baslik="Müvekkil(ler)">
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
              </Bilgi>
              <Bilgi baslik="Karşı Taraf(lar)">
                {dosya.karsiTaraflar.length > 0
                  ? dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ")
                  : "—"}
              </Bilgi>
            </FormKarti>

            <FormKarti baslik="Dosya Bilgileri">
              <Bilgi baslik="Uyuşmazlık Türü">{dosya.hukukiIliskiTuru?.etiket ?? "—"}</Bilgi>
              <Bilgi baslik="Dava Türü">{dosya.davaTuru?.etiket ?? "—"}</Bilgi>
              <Bilgi baslik="Birim (Mahkeme/İcra Dairesi)">{dosya.birimAdi ?? "—"}</Bilgi>
              <Bilgi baslik="Dosya Numarası">{dosya.dosyaNo ?? "—"}</Bilgi>
            </FormKarti>

            <FormKarti baslik="Talep ve Duruşma">
              <Bilgi baslik="Talep Sonucu">
                {dosya.talepSonucu ? (
                  <ol className="list-decimal space-y-0.5 pl-4">
                    {dosya.talepSonucu.split("\n").map((madde, i) => (
                      <li key={i}>{madde}</li>
                    ))}
                  </ol>
                ) : (
                  "—"
                )}
              </Bilgi>
              <Bilgi baslik="Duruşma Tarihi">
                {dosya.durusmaTarihi ? tarihFormatlayici.format(dosya.durusmaTarihi) : "—"}
              </Bilgi>
            </FormKarti>
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
        </>
      ) : (
        <>
          <CariHesapBolumu
            baslik="Müvekkil-Büro Cari Hesabı"
            aciklama={
              dosya.uyusmazlikGrubu && (
                <>
                  Bu sadece bu dosyanın kırılımıdır. Müvekkilden gelen bir avans genelde tüm{" "}
                  <Link
                    href={`/kokpit/dava-dosyalari/gruplar/${dosya.uyusmazlikGrubu.id}`}
                    className="text-[#6db8ff] hover:underline"
                  >
                    {dosya.uyusmazlikGrubu.ad}
                  </Link>{" "}
                  grubuna aittir — asıl Borç/Alacak durumunu grup sayfasından takip edin.
                </>
              )
            }
          >
            <div className="mb-8">
              <CariHesapOzeti ozet={cariHesapOzeti} />
            </div>

            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">
              Dosya Bazında Döküm
            </h3>
            <p className="mb-3 text-sm text-white/45">
              Bu dosyaya işlenen masraflar ve müvekkilden gelen paranın bu dosyaya ayrılan dağıtım
              kalemleri, tek bir kronolojik listede.
            </p>
            <div className="mb-8">
              <DokumTablosu satirlar={dosyaDokumu} dosyaSutunuGoster={false} />
            </div>

            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">Para Trafiği</h3>
            <p className="mb-3 text-sm text-white/45">
              Yeni bir kayıt eklemek için ilgili müvekkilin Finans sayfasına gidip &quot;Hangi
              Uyuşmazlık Dosyası/Dosyalarına İstinaden&quot; alanından bu dosyayı seçin.
            </p>
            <div className="mb-8">
              <DosyaParaTrafigiListesi baglantilar={dosya.paraTrafigiKayitlari} />
            </div>

            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">Masraflar</h3>
            <div className="mb-4">
              <MasrafFormu action={dosyaMasrafiEkle.bind(null, id)} />
            </div>
            <MasrafListesi
              masraflar={dosya.masraflar.map((m) => ({ ...m, tutar: Number(m.tutar) }))}
              dosyaId={id}
              silmeYetkisiVar={silmeYetkisiVar}
            />
          </CariHesapBolumu>

          <CariHesapBolumu
            baslik="Büro-Adli Birim Cari Hesabı"
            aciklama="Büronun mahkeme/icra dairesine yaptığı ödemeler (harç, tebligat gideri vb. — borç) ve oradan büroya gelen tutarlar (iade, aktarılan tahsilat vb. — alacak)."
          >
            <div className="mb-4">
              <AdliBirimHareketFormu action={adliBirimHareketiEkle.bind(null, id)} />
            </div>
            <AdliBirimHareketListesi
              hareketler={dosya.adliBirimHareketleri.map((h) => ({ ...h, tutar: Number(h.tutar) }))}
              dosyaId={id}
            />
          </CariHesapBolumu>

          <CariHesapBolumu
            baslik="Borçlu-Büro Cari Hesabı"
            aciklama="Müvekkilin cari hesabıyla (yukarısı) karıştırılmamalı: bu, cebimizden çıkan bir para değil — karşı tarafın (borçlunun) dava/icra sonucu bize/müvekkile ayrıca ödemesi gereken bir alacak (ör. icra vekalet ücreti)."
          >
            <div className="mb-4">
              <KarsiTarafAlacagiFormu action={karsiTarafAlacagiEkle.bind(null, id)} />
            </div>
            <div className="mb-6">
              <KarsiTarafAlacagiListesi
                alacaklar={dosya.karsiTarafAlacaklari.map((a) => ({ ...a, tutar: Number(a.tutar) }))}
                dosyaId={id}
                silmeYetkisiVar={silmeYetkisiVar}
              />
            </div>
            <ArtciIslerBlok
              karsiTarafAlacaklari={dosya.karsiTarafAlacaklari.map((a) => ({ ...a, tutar: Number(a.tutar) }))}
              finansHareketleri={dosya.finansHareketleri.map((h) => ({ ...h, tutar: Number(h.tutar) }))}
            />
          </CariHesapBolumu>
        </>
      )}
    </div>
  );
}
