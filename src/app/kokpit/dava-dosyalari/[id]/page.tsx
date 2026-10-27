import Link from "next/link";
import { notFound } from "next/navigation";
import { davaDosyasiGetir, anaDosyaAdaylariniGetir } from "@/modules/dava-dosyasi/lib/queries";
import { dosyaAlanlariniGuncelle } from "@/modules/dava-dosyasi/lib/actions";
import { DavaDosyasiSilmeButonu } from "@/modules/dava-dosyasi/components/dava-dosyasi-silme-butonu";
import { EkonomiPaneli } from "@/modules/dava-dosyasi/components/ekonomi/ekonomi-paneli";
import { kapsamOzeti } from "@/modules/dava-dosyasi/lib/cari-sistem";
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
import { DosyaBirlikteUyarisi } from "@/core/birlikte/dosya-birlikte-uyarisi";

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
  searchParams: Promise<{ sekme?: string; alt?: string }>;
}) {
  const { id } = await params;
  const { sekme, alt } = await searchParams;
  const aktifSekme = sekme === "ekonomi" ? "ekonomi" : "genel";
  const [dosya, kullanici, anaDosyaAdaylari, etiketler, dosyaTurleri, yargiKollari, uyusmazlikTurleri, davaTurleri, muvekkilSifatlari] = await Promise.all([
    davaDosyasiGetir(id),
    mevcutKullanici(),
    anaDosyaAdaylariniGetir(id),
    etiketleriGetir(),
    secenekleriGetir("dosya_turu"),
    secenekleriGetir("yargi_kolu"),
    secenekleriGetir("hukuki_iliski_turu"),
    secenekleriGetir("dava_turu"),
    secenekleriGetir("muvekkil_sifati"),
  ]);
  if (!dosya) notFound();

  // Ana dosyaysa: kendisi + alt dosyalari (Dosya Ekonomisi > Ozet sekmesinde
  // her birinin net durumu ve toplami gosterilir).
  const agacDosyalari =
    dosya.altDosyalar.length > 0
      ? [
          { id, no: kokpitNoGoster(dosya), konu: dosya.konu },
          ...dosya.altDosyalar.map((a) => ({
            id: a.id,
            no: kokpitNoGoster({ ...a, anaDosya: dosya }),
            konu: a.konu,
          })),
        ]
      : [];
  const agacIdleri = agacDosyalari.map((d) => d.id);
  const musteriId = dosya.muvekkiller[0]?.musteriId ?? null;
  const dosyaEkonomisi = musteriId
    ? await kapsamOzeti({ musteriId, dosyaId: id })
    : { paraBakiyesi: 0, digerBorclar: 0, net: 0, hesaplar: [] };
  const agacNet =
    musteriId && agacIdleri.length > 0
      ? (await Promise.all(agacIdleri.map((i) => kapsamOzeti({ musteriId, dosyaId: i })))).reduce((t, o) => t + o.net, 0)
      : null;
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
      anahtar: "muvekkilSifatiId",
      varsayilanEtiket: "Müvekkil Sıfatı",
      tip: "secim",
      deger: dosya.muvekkilSifatiId ?? "",
      gosterim: dosya.muvekkilSifatiDegeri?.etiket ?? { ALACAKLI: "Alacaklı", BORCLU: "Borçlu", DIGER: "3. kişi" }[dosya.muvekkilSifati],
      secenekler: muvekkilSifatlari.map((o) => ({ value: o.id, label: o.etiket })),
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
      varsayilanEtiket: "Tür",
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
      anahtar: "davaKonusu",
      varsayilanEtiket: "Davanın / Takibin Konusu",
      tip: "metin",
      deger: dosya.davaKonusu ?? "",
      gosterim: dosya.davaKonusu ?? "—",
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
            {dosya.birimAdi || dosya.dosyaNo
              ? ` · ${[dosya.birimAdi, dosya.dosyaNo].filter(Boolean).join(" ")}`
              : ""}
            {" — "}
            {dosya.davaKonusu || dosya.konu}
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
                dosyaEkonomisi.net > 0
                  ? "bg-[#ff7a70]/15 text-[#ff7a70]"
                  : dosyaEkonomisi.net < 0
                    ? "bg-[#32d74b]/15 text-[#32d74b]"
                    : "bg-white/[0.06] text-white/60"
              }`}
            >
              {dosyaEkonomisi.net > 0
                ? `Müvekkil Borcu: ${paraFormatlayici.format(dosyaEkonomisi.net)}`
                : dosyaEkonomisi.net < 0
                  ? `Müvekkil Lehine Fazla: ${paraFormatlayici.format(-dosyaEkonomisi.net)}`
                  : "Bakiye yok"}
            </span>
            {dosyaEkonomisi.paraBakiyesi > 0 && (
              <span className="whitespace-nowrap rounded-full bg-[#6db8ff]/15 px-2.5 py-0.5 text-xs font-medium text-[#6db8ff]">
                Para trafiğinde bekleyen: {paraFormatlayici.format(dosyaEkonomisi.paraBakiyesi)}
              </span>
            )}
            {agacNet !== null && (
              <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-white/70">
                Alt dosyalar dahil net: {paraFormatlayici.format(agacNet)}
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

      <DosyaBirlikteUyarisi dosyaId={id} />

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
        musteriId ? (
          <EkonomiPaneli
            kapsam={{ musteriId, dosyaId: id }}
            alt={alt ?? "ozet"}
            hrefYaz={({ alt: a }) => `/kokpit/dava-dosyalari/${id}?sekme=ekonomi&alt=${a ?? "ozet"}`}
            silmeYetkisiVar={silmeYetkisiVar}
          />
        ) : (
          <p className="text-sm text-white/55">Ekonomi için dosyaya bir müvekkil bağlanmalıdır.</p>
        )
      )}
    </div>
  );
}