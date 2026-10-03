import Link from "next/link";
import { notFound } from "next/navigation";
import {
  davaDosyasiGetir,
  dosyaCariHesapOzeti,
  netAvansBakiyesi,
  aktarimHedefAdaylari,
  dosyaAvansAktarimlari,
  anaDosyaAdaylariniGetir,
} from "@/modules/dava-dosyasi/lib/queries";
import {
  dosyaMasrafiEkle,
  karsiTarafAlacagiEkle,
  adliBirimHareketiEkle,
  avansAktarimiEkle,
  dosyaAlanlariniGuncelle,
} from "@/modules/dava-dosyasi/lib/actions";
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
import { AvansAktarimFormu } from "@/modules/dava-dosyasi/components/avans-aktarim-formu";
import { AvansAktarimListesi } from "@/modules/dava-dosyasi/components/avans-aktarim-listesi";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { DavaDosyasiSekmeleri } from "@/modules/dava-dosyasi/components/dava-dosyasi-sekmeleri";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { AnaDosyaSecici } from "@/modules/dava-dosyasi/components/ana-dosya-secici";
import { kokpitNoGoster, kayitNoGoster, buroNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { Dugme } from "@/core/ui/button";
import { DuzenlenebilirKart, type KartAlani } from "@/core/ui/duzenlenebilir-kart";
import { etiketleriGetir } from "@/core/arayuz-etiketi/queries";
import { FormKarti } from "@/core/ui/form-karti";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

// FormKarti icinde salt-okunur bir alan/deger cifti - Dava Dosyasi
// formundaki Etiket+Girdi ikilisinin goruntuleme-modu karsiligi, ayni
// kart yapisi iki ekranda da tutarli kalsin diye.
function Bilgi({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 text-sm last:mb-0">
      <p className="text-white/45">{baslik}</p>
      <div className="text-white">{children}</div>
    </div>
  );
}

// Dosya Ekonomisi sekmesindeki 3 cari hesap iliskisini (Müvekkil-Büro,
// Büro-Adli Birim, Borçlu-Büro) birbirinden GORSEL OLARAK NET AYIRMAK
// icin - kullanici geri bildirimi: bunlar art arda akan basliklar degil,
// ayri kartlar olarak durmali.
function CariHesapBolumu({
  baslik,
  children,
}: {
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">{baslik}</h2>
      {children}
    </div>
  );
}

// Birden fazla kisi/kurum varsa alt alta, sira numarali; tek ise duz metin;
// hic yoksa "—". Taraflar kartinda kullanilir.
function SiraliListe({ children }: { children: React.ReactNode[] }) {
  if (children.length === 0) return <>—</>;
  if (children.length === 1) return <>{children[0]}</>;
  return (
    <ol className="list-decimal space-y-0.5 pl-5">
      {children.map((c, i) => (
        <li key={i}>{c}</li>
      ))}
    </ol>
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
  const [dosya, kullanici, cariHesapOzeti, aktarimHedefleri, aktarimlar, cariKodlar, anaDosyaAdaylari, etiketler, dosyaTurleri, yargiKollari, uyusmazlikTurleri, davaTurleri] = await Promise.all([
    davaDosyasiGetir(id),
    mevcutKullanici(),
    dosyaCariHesapOzeti(id),
    aktarimHedefAdaylari(id),
    dosyaAvansAktarimlari(id),
    secenekleriGetir("cari_kod"),
    anaDosyaAdaylariniGetir(id),
    etiketleriGetir(),
    secenekleriGetir("dosya_turu"),
    secenekleriGetir("yargi_kolu"),
    secenekleriGetir("hukuki_iliski_turu"),
    secenekleriGetir("dava_turu"),
  ]);
  if (!dosya) notFound();
  const avansBakiyesi = netAvansBakiyesi(cariHesapOzeti);
  const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));
  // Baslik/etiket degisikligi tum kullanicilari etkiledigi icin yalniz yonetici.
  const etiketDuzenleyebilir = silmeYetkisiVar;
  const davaMi = dosya.tur?.kod === "dava_dosyasi";
  const bosSecenekli = (liste: { id: string; etiket: string }[], bosEtiket: string) => [
    { value: "", label: bosEtiket },
    ...liste.map((o) => ({ value: o.id, label: o.etiket })),
  ];
  const dosyaBilgileriAlanlari: KartAlani[] = [
    {
      anahtar: "turId",
      varsayilanEtiket: "Tür",
      tip: "secim",
      deger: dosya.turId ?? "",
      gosterim: dosya.tur?.etiket ?? "—",
      secenekler: dosyaTurleri.map((o) => ({ value: o.id, label: o.etiket })),
    },
    ...(davaMi
      ? [
          {
            anahtar: "yargiKoluId",
            varsayilanEtiket: "Yargı Kolu",
            tip: "secim" as const,
            deger: dosya.yargiKoluId ?? "",
            gosterim: dosya.yargiKolu?.etiket ?? "—",
            secenekler: bosSecenekli(yargiKollari, "Seçiniz…"),
          },
        ]
      : []),
    {
      anahtar: "muvekkilSifati",
      varsayilanEtiket: "Müvekkil Sıfatı",
      tip: "secim",
      deger: dosya.muvekkilSifati,
      gosterim: dosya.muvekkilSifati === "BORCLU" ? "Borçlu" : "Alacaklı",
      secenekler: [
        { value: "ALACAKLI", label: "Alacaklı" },
        { value: "BORCLU", label: "Borçlu" },
      ],
    },
    {
      anahtar: "hukukiIliskiTuruId",
      varsayilanEtiket: "Uyuşmazlık Türü",
      tip: "secim",
      deger: dosya.hukukiIliskiTuruId ?? "",
      gosterim: dosya.hukukiIliskiTuru?.etiket ?? "—",
      secenekler: bosSecenekli(uyusmazlikTurleri, "—"),
    },
    {
      anahtar: "davaTuruId",
      varsayilanEtiket: "Dava Türü",
      tip: "secim",
      deger: dosya.davaTuruId ?? "",
      gosterim: dosya.davaTuru?.etiket ?? "—",
      secenekler: davaTurleri.map((o) => ({ value: o.id, label: o.etiket })),
    },
    {
      anahtar: "birimAdi",
      varsayilanEtiket: "Birim (Mahkeme/İcra Dairesi)",
      tip: "metin",
      deger: dosya.birimAdi ?? "",
      gosterim: dosya.birimAdi ?? "—",
    },
    {
      anahtar: "buroNo",
      varsayilanEtiket: "Objekt Büro No (BN)",
      tip: "metin",
      deger: dosya.buroNo ?? "",
      gosterim: buroNoGoster(dosya.buroNo),
    },
    {
      anahtar: "dosyaNo",
      varsayilanEtiket: "Dosya Numarası",
      tip: "metin",
      deger: dosya.dosyaNo ?? "",
      gosterim: dosya.dosyaNo ?? "—",
    },
  ];
  const talepAlanlari: KartAlani[] = [
    {
      anahtar: "talepSonucu",
      varsayilanEtiket: "Talep Sonucu",
      tip: "cokSatir",
      deger: dosya.talepSonucu ?? "",
      gosterim: dosya.talepSonucu ? (
        <ol className="list-decimal space-y-0.5 pl-4">
          {dosya.talepSonucu.split("\n").map((madde, i) => (
            <li key={i}>{madde}</li>
          ))}
        </ol>
      ) : (
        "—"
      ),
    },
    {
      anahtar: "durusmaTarihi",
      varsayilanEtiket: "Duruşma Tarihi",
      tip: "tarih",
      deger: dosya.durusmaTarihi ? dosya.durusmaTarihi.toISOString().slice(0, 10) : "",
      gosterim: dosya.durusmaTarihi ? tarihFormatlayici.format(dosya.durusmaTarihi) : "—",
    },
  ];
  const taraflarAlanlari: KartAlani[] = [
    {
      anahtar: "muvekkiller",
      varsayilanEtiket: "Müvekkil(ler)",
      tip: "salt",
      gosterim: (
        <SiraliListe>
          {dosya.muvekkiller.map((m) => (
            <Link
              key={m.musteriId}
              href={`/kokpit/musteriler/${m.musteriId}`}
              className="hover:text-[#6db8ff] hover:underline"
            >
              {m.musteri.adSoyadUnvan}
            </Link>
          ))}
        </SiraliListe>
      ),
    },
    {
      anahtar: "karsiTaraflar",
      varsayilanEtiket: "Karşı Taraf(lar)",
      tip: "salt",
      gosterim: (
        <SiraliListe>{dosya.karsiTaraflar.map((kt) => <span key={kt.karsiTarafId}>{kt.karsiTaraf.ad}</span>)}</SiraliListe>
      ),
    },
  ];
  const agacAlanlari: KartAlani[] = [
    ...(dosya.anaDosya
      ? [
          {
            anahtar: "anaDosya",
            varsayilanEtiket: "Ana dosya",
            tip: "salt" as const,
            gosterim: (
              <>
                <Link
                  href={`/kokpit/dava-dosyalari/${dosya.anaDosya.id}`}
                  className="hover:text-[#6db8ff] hover:underline"
                >
                  {kayitNoGoster(dosya.anaDosya.kayitNo)}
                  {dosya.anaDosya.buroNo ? ` · BN-${dosya.anaDosya.buroNo}` : ""}
                  {dosya.anaDosya.dosyaNo ? ` · ${dosya.anaDosya.dosyaNo}` : ""} — {dosya.anaDosya.konu}
                </Link>
                <span className="ml-2 text-xs text-white/45">(eski numarası {kayitNoGoster(dosya.kayitNo)})</span>
              </>
            ),
          },
        ]
      : []),
    ...(dosya.altDosyalar.length > 0
      ? [
          {
            anahtar: "altDosyalar",
            varsayilanEtiket: "Alt dosyalar",
            tip: "salt" as const,
            gosterim: (
              <span className="mt-1 flex flex-col gap-1.5">
                {dosya.altDosyalar.map((alt) => (
                  <Link
                    key={alt.id}
                    href={`/kokpit/dava-dosyalari/${alt.id}`}
                    className="glass rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/[0.06] hover:text-[#6db8ff]"
                  >
                    <span className="text-white/55">└ {kokpitNoGoster({ ...alt, anaDosya: dosya })}</span>
                    {alt.dosyaNo ? ` · ${alt.dosyaNo}` : ""} — {alt.konu}
                    <span className="ml-2 text-xs text-white/45">
                      {alt.tur?.etiket ? `${alt.tur.etiket} · ` : ""}
                      {alt.durum.etiket}
                    </span>
                  </Link>
                ))}
              </span>
            ),
          },
        ]
      : []),
  ];

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
            <span className="text-white/45" title={dosya.anaDosya ? `Eski numarası: ${kayitNoGoster(dosya.kayitNo)}` : undefined}>
              {kokpitNoGoster(dosya)}
            </span>
            {dosya.buroNo && (
              <span title="OBJEKT BÜRO NO"> · {buroNoGoster(dosya.buroNo)}</span>
            )}
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
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                avansBakiyesi < 0
                  ? "bg-[#ff7a70]/15 text-[#ff7a70]"
                  : avansBakiyesi > 0
                    ? "bg-[#32d74b]/15 text-[#32d74b]"
                    : "bg-white/[0.06] text-white/60"
              }`}
            >
              Müvekkil Bakiye Avans: {paraFormatlayici.format(avansBakiyesi)}
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

      <DavaDosyasiSekmeleri dosyaId={id} aktif={aktifSekme} />

      {aktifSekme === "genel" ? (
        <>
          <div className="mb-8 max-w-2xl">
            <DuzenlenebilirKart
              etiketOnEki="dosya-detay.taraflar"
              varsayilanBaslik="Taraflar"
              etiketler={etiketler}
              alanlar={taraflarAlanlari}
              etiketDuzenleyebilir={etiketDuzenleyebilir}
            />

            <DuzenlenebilirKart
              etiketOnEki="dosya-detay.dosya-bilgileri"
              varsayilanBaslik="Dosya Bilgileri"
              etiketler={etiketler}
              alanlar={dosyaBilgileriAlanlari}
              etiketDuzenleyebilir={etiketDuzenleyebilir}
              onKaydet={dosyaAlanlariniGuncelle.bind(null, id)}
            />

            <DuzenlenebilirKart
              etiketOnEki="dosya-detay.talep-durusma"
              varsayilanBaslik="Talep ve Duruşma"
              etiketler={etiketler}
              alanlar={talepAlanlari}
              etiketDuzenleyebilir={etiketDuzenleyebilir}
              onKaydet={dosyaAlanlariniGuncelle.bind(null, id)}
            />
          </div>

          <div className="mb-8 max-w-2xl">
            <DuzenlenebilirKart
              etiketOnEki="dosya-detay.dosya-agaci"
              varsayilanBaslik="Dosya Ağacı"
              etiketler={etiketler}
              alanlar={agacAlanlari}
              etiketDuzenleyebilir={etiketDuzenleyebilir}
            >
              <AnaDosyaSecici
                dosyaId={id}
                mevcutAnaDosyaId={dosya.anaDosyaId}
                adaylar={anaDosyaAdaylari}
                altDosyasiVar={dosya.altDosyalar.length > 0}
              />
            </DuzenlenebilirKart>
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
          <CariHesapBolumu baslik="Müvekkil-Büro Cari Hesabı">
            <div className="mb-8">
              <CariHesapOzeti ozet={cariHesapOzeti} />
            </div>

            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">
              Dosya Bazında Döküm
            </h3>
            <div className="mb-8">
              <DokumTablosu satirlar={dosyaDokumu} dosyaSutunuGoster={false} />
            </div>

            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">Para Trafiği</h3>
            <div className="mb-8">
              <DosyaParaTrafigiListesi baglantilar={dosya.paraTrafigiKayitlari} />
            </div>

            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">Avans Aktarımı</h3>
            <div className="mb-4">
              <AvansAktarimFormu
                action={avansAktarimiEkle.bind(null, id)}
                hedefler={aktarimHedefleri.map((h) => ({ ...h }))}
                cariKodlar={cariKodlar}
                kaynakBakiye={avansBakiyesi}
              />
            </div>
            <div className="mb-8">
              <AvansAktarimListesi
                aktarimlar={aktarimlar.map((a) => ({
                  id: a.id,
                  tarih: a.tarih,
                  tutar: Number(a.tutar),
                  aciklama: a.aciklama,
                  cariKodEtiketi: a.cariKod.etiket,
                  kaynakDosya: a.kaynakDosya,
                  hedefDosya: a.hedefDosya,
                }))}
                dosyaId={id}
                silmeYetkisiVar={silmeYetkisiVar}
              />
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

          <CariHesapBolumu baslik="Büro-Adli Birim Cari Hesabı">
            <div className="mb-4">
              <AdliBirimHareketFormu action={adliBirimHareketiEkle.bind(null, id)} />
            </div>
            <AdliBirimHareketListesi
              hareketler={dosya.adliBirimHareketleri.map((h) => ({ ...h, tutar: Number(h.tutar) }))}
              dosyaId={id}
            />
          </CariHesapBolumu>

          <CariHesapBolumu baslik="Borçlu-Büro Cari Hesabı">
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
