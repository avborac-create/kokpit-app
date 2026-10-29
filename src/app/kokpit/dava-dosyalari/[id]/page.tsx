import Link from "next/link";
import { KunyeSeridi } from "@/core/ui/kunye-seridi";
import { MobilSabitBaslik } from "@/core/ui/mobil-sabit-baslik";
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
import { davaDegeriHesapla, davaDegeriYaz } from "@/modules/dava-dosyasi/lib/dava-degeri";
import { DosyaBaglayici } from "@/modules/dava-dosyasi/components/dosya-baglayici";
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
// Tek taraf ise duz ad, birden fazlaysa "1. A  2. B" numarali satirlar.
function NumaraliAdlar({ adlar }: { adlar: string[] }) {
  if (adlar.length === 0) return <>—</>;
  if (adlar.length === 1) return <>{adlar[0]}</>;
  return (
    <>
      {adlar.map((ad, i) => (
        <span key={i} className="mr-3 inline-block">
          <span className="text-white/45">{i + 1}.</span> {ad}
        </span>
      ))}
    </>
  );
}

function MuvekkilAdlari({ muvekkiller }: { muvekkiller: { id: string; ad: string }[] }) {
  if (muvekkiller.length === 0) return <>—</>;
  return (
    <>
      {muvekkiller.map((m, i) => (
        <span key={m.id} className="mr-3 inline-block">
          {muvekkiller.length > 1 && <span className="text-white/45">{i + 1}. </span>}
          <Link href={`/kokpit/musteriler/${m.id}`} className="hover:text-[#6db8ff] hover:underline">
            {m.ad}
          </Link>
        </span>
      ))}
    </>
  );
}

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
  const [dosya, kullanici, anaDosyaAdaylari, etiketler, dosyaTurleri, yargiKollari, uyusmazlikTurleri, hukukDallari, muvekkilSifatlari, davaTurleri] = await Promise.all([
    davaDosyasiGetir(id),
    mevcutKullanici(),
    anaDosyaAdaylariniGetir(id),
    etiketleriGetir(),
    secenekleriGetir("dosya_turu"),
    secenekleriGetir("yargi_kolu"),
    secenekleriGetir("hukuki_iliski_turu"),
    secenekleriGetir("hukuk_dali"),
    secenekleriGetir("muvekkil_sifati"),
    secenekleriGetir("dava_turu"),
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
  const taraflarAlanlari: KartAlani[] = [
    {
      anahtar: "muvekkiller",
      varsayilanEtiket: "Müvekkil",
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
      varsayilanEtiket: "Karşı Taraf",
      tip: "salt",
      gosterim: (
        <SiraliListe>{dosya.karsiTaraflar.map((kt) => <span key={kt.karsiTarafId}>{kt.karsiTaraf.ad}</span>)}</SiraliListe>
      ),
    },
    {
      anahtar: "muvekkilSifatiId",
      varsayilanEtiket: "Müvekkil Sıfatı",
      tip: "secim",
      deger: dosya.muvekkilSifatiId ?? "",
      gosterim: dosya.muvekkilSifatiDegeri?.etiket ?? { ALACAKLI: "Alacaklı", BORCLU: "Borçlu", DIGER: "3. kişi" }[dosya.muvekkilSifati],
      secenekler: muvekkilSifatlari.map((o) => ({ value: o.id, label: o.etiket })),
    },
  ];
  const kunyeAlanlari: KartAlani[] = [
    taraflarAlanlari[2],
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
      anahtar: "birimAdi",
      varsayilanEtiket: "Birim",
      tip: "metin",
      deger: dosya.birimAdi ?? "",
      gosterim: dosya.birimAdi ?? "—",
    },
    {
      anahtar: "dosyaNo",
      varsayilanEtiket: "Dosya Numarası",
      tip: "metin",
      deger: dosya.dosyaNo ?? "",
      gosterim: dosya.dosyaNo ?? "—",
    },
    {
      anahtar: "buroNo",
      varsayilanEtiket: "Objekt Büro No (BN)",
      tip: "metin",
      deger: dosya.buroNo ?? "",
      gosterim: buroNoGoster(dosya.buroNo),
    },
  ];
  const konuSecenegi = uyusmazlikTurleri.find((t) => t.id === dosya.hukukiIliskiTuruId);
  const turSecenegi = davaTurleri.find((t) => t.id === dosya.davaTuruId);
  const hukukDali = hukukDallari.find((d) => d.id === (konuSecenegi?.ustId ?? turSecenegi?.ustId));
  const davaDegeri = davaDegeriHesapla((dosya.talepSonucu ?? "").split("\n").filter(Boolean));
  const icerikAlanlari: KartAlani[] = [
    {
      anahtar: "hukukDali",
      varsayilanEtiket: "Hukuk Dalı",
      tip: "salt",
      gosterim: hukukDali?.etiket ?? "—",
    },
    {
      anahtar: "davaTuruId",
      varsayilanEtiket: "Dava Türü",
      tip: "secim",
      deger: dosya.davaTuruId ?? "",
      gosterim: dosya.davaTuru?.etiket ?? "—",
      secenekler: [
        { value: "", label: "—" },
        ...davaTurleri.map((o) => {
          const dal = hukukDallari.find((d) => d.id === o.ustId);
          return { value: o.id, label: dal ? `${dal.etiket} › ${o.etiket}` : o.etiket };
        }),
      ],
    },
    {
      anahtar: "hukukiIliskiTuruId",
      varsayilanEtiket: "Dava Konusu",
      tip: "secim",
      deger: dosya.hukukiIliskiTuruId ?? "",
      gosterim: dosya.hukukiIliskiTuru?.etiket ?? "—",
      secenekler: [
        { value: "", label: "—" },
        ...uyusmazlikTurleri.map((o) => {
          const dal = hukukDallari.find((d) => d.id === o.ustId);
          return { value: o.id, label: dal ? `${dal.etiket} › ${o.etiket}` : o.etiket };
        }),
      ],
    },
    {
      anahtar: "talepSonucu",
      varsayilanEtiket: "Dava Değeri (Netice ve Talep)",
      tip: "cokSatir",
      deger: dosya.talepSonucu ?? "",
      gosterim: dosya.talepSonucu ? (
        <>
        <ol className="list-decimal space-y-0.5 pl-4">
          {dosya.talepSonucu.split("\n").map((madde, i) => (
            <li key={i}>{madde}</li>
          ))}
        </ol>
        {davaDegeri > 0 && (
          <p className="mt-1.5 text-sm">
            <span className="text-white/50">Toplam dava değeri: </span>
            <span className="font-semibold text-white">{davaDegeriYaz(davaDegeri)}</span>
          </p>
        )}
        </>
      ) : (
        "—"
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
    <div className="pt-2 md:pt-3">
      <MobilSabitBaslik hedefId="dosya-kunye">
        <p className="truncate">
          {kokpitNoGoster(dosya)}
          {dosya.birimAdi ? ` · ${dosya.birimAdi}` : ""}
          {dosya.dosyaNo ? ` · ${dosya.dosyaNo}` : ""}
        </p>
        <p className="truncate text-xs font-normal text-white/70">
          {dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—"}
          {" ↔ "}
          {dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ") || "—"}
        </p>
      </MobilSabitBaslik>
      <KunyeSeridi id="dosya-kunye" className="mb-4 md:mb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="rounded-md bg-white/[0.08] px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-white"
                title={dosya.anaDosya ? `Eski numarası: ${kayitNoGoster(dosya.kayitNo)}` : "Kokpit No"}
              >
                {kokpitNoGoster(dosya)}
              </span>
              {dosya.buroNo && (
                <span
                  className="rounded-md bg-white/[0.08] px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-white"
                  title="Objekt Büro No"
                >
                  {buroNoGoster(dosya.buroNo)}
                </span>
              )}
              <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[#8fb4e8]">
                {dosya.durum.etiket}
              </span>
            </div>

            <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lg font-semibold tracking-tight text-white sm:text-2xl">
              {dosya.birimAdi || dosya.dosyaNo ? (
                <>
                  {dosya.birimAdi && <span>{dosya.birimAdi}</span>}
                  {dosya.dosyaNo && (
                    <span className="rounded-lg bg-[var(--accent-soft)] px-2 py-0 text-lg text-[#8fb4e8] sm:px-2.5 sm:text-xl">
                      {dosya.dosyaNo}
                    </span>
                  )}
                </>
              ) : (
                <span>{dosya.hukukiIliskiTuru?.etiket ?? (dosya.davaKonusu || dosya.konu)}</span>
              )}
            </h1>
            {(dosya.birimAdi || dosya.dosyaNo) && (
              <p className="mt-0.5 truncate text-sm text-white/80">{dosya.hukukiIliskiTuru?.etiket ?? (dosya.davaKonusu || dosya.konu)}</p>
            )}

            <div className="mt-2 grid grid-cols-1 items-stretch gap-1.5 text-sm md:flex md:flex-wrap md:gap-2">
              <div className="min-w-0 rounded-xl border border-white/15 bg-white/[0.06] px-2.5 py-1 sm:px-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#8fb4e8] sm:text-xs">
                  Müvekkil{dosya.muvekkilSifatiDegeri ? ` · ${dosya.muvekkilSifatiDegeri.etiket}` : ""}
                </span>
                <span className="break-words text-sm font-medium text-white sm:text-base">
                  <MuvekkilAdlari muvekkiller={dosya.muvekkiller.map((m) => ({ id: m.musteriId, ad: m.musteri.adSoyadUnvan }))} />
                </span>
              </div>
              <div className="min-w-0 rounded-xl border border-white/15 bg-white/[0.06] px-2.5 py-1 sm:px-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#8fb4e8] sm:text-xs">Karşı Taraf</span>
                <span className="break-words text-sm font-medium text-white sm:text-base">
                  <NumaraliAdlar adlar={dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad)} />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Link href={`/kokpit/dava-dosyalari/${id}/duzenle`}>
                <Dugme varyant="ikincil" className="!px-3 !py-1 !text-xs md:!px-4 md:!py-2 md:!text-sm">Düzenle</Dugme>
              </Link>
              {silmeYetkisiVar && (
                <DavaDosyasiSilmeButonu dosyaId={id} sonrasindaYonlendir="/kokpit/dava-dosyalari" boyut="kompakt" />
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {dosyaEkonomisi.net !== 0 && <span
                className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  dosyaEkonomisi.net > 0
                    ? "bg-[#ff7a70]/15 text-[#ff7a70]"
                    : dosyaEkonomisi.net < 0
                      ? "bg-[#32d74b]/15 text-[#32d74b]"
                      : "bg-white/[0.08] text-white/80"
                }`}
              >
                {dosyaEkonomisi.net > 0
                  ? `Müvekkil Borcu: ${paraFormatlayici.format(dosyaEkonomisi.net)}`
                  : dosyaEkonomisi.net < 0
                    ? `Müvekkil Lehine Fazla: ${paraFormatlayici.format(-dosyaEkonomisi.net)}`
                    : ""}
              </span>}
              {dosyaEkonomisi.paraBakiyesi > 0 && (
                <span className="whitespace-nowrap rounded-full bg-[#6db8ff]/15 px-2.5 py-0.5 text-xs font-medium text-[#8fb4e8]">
                  Para trafiğinde bekleyen: {paraFormatlayici.format(dosyaEkonomisi.paraBakiyesi)}
                </span>
              )}
              {agacNet !== null && (
                <span className="whitespace-nowrap rounded-full bg-white/[0.08] px-2.5 py-0.5 text-xs font-medium text-white/90">
                  Alt dosyalar dahil net: {paraFormatlayici.format(agacNet)}
                </span>
              )}
            </div>
          </div>
        </div>
      </KunyeSeridi>

      <DosyaBirlikteUyarisi dosyaId={id} />

      <DavaDosyasiSekmeleri dosyaId={id} aktif={aktifSekme} />

      {aktifSekme === "genel" ? (
        <>
          <div className="glass mb-6 max-w-5xl divide-y divide-white/10 rounded-2xl px-5 py-3">
            <DuzenlenebilirKart
              duz
              etiketOnEki="dosya-detay.kunye"
              varsayilanBaslik="Künye"
              etiketler={etiketler}
              alanlar={kunyeAlanlari}
              etiketDuzenleyebilir={etiketDuzenleyebilir}
              onKaydet={dosyaAlanlariniGuncelle.bind(null, id)}
            />

            <DuzenlenebilirKart
              duz
              etiketOnEki="dosya-detay.icerik"
              varsayilanBaslik="İçerik"
              etiketler={etiketler}
              alanlar={icerikAlanlari}
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
              <DosyaBaglayici
                dosyaId={id}
                mevcutAnaDosyaId={dosya.anaDosyaId}
                bagliOlduguDosya={
                  dosya.bagliOlduguDosya
                    ? {
                        id: dosya.bagliOlduguDosya.id,
                        etiket: [dosya.bagliOlduguDosya.dosyaNo, dosya.bagliOlduguDosya.konu]
                          .filter(Boolean)
                          .join(" · "),
                      }
                    : null
                }
                adaylar={anaDosyaAdaylari}
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