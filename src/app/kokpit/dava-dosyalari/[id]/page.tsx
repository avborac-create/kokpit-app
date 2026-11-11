import Link from "next/link";
import { dosyaDurumSinifi } from "@/modules/dava-dosyasi/lib/durum-rengi";
import { KunyeSeridi } from "@/core/ui/kunye-seridi";
import { MobilSabitBaslik } from "@/core/ui/mobil-sabit-baslik";
import { notFound } from "next/navigation";
import { davaDosyasiGetir, anaDosyaAdaylariniGetir, vekilAdaylariniGetir, calisilanAvukatlariGetir } from "@/modules/dava-dosyasi/lib/queries";
import { dosyaAlanlariniGuncelle } from "@/modules/dava-dosyasi/lib/actions";
import { DavaDosyasiSilmeButonu } from "@/modules/dava-dosyasi/components/dava-dosyasi-silme-butonu";
import { EkonomiPaneli } from "@/modules/dava-dosyasi/components/ekonomi/ekonomi-paneli";
import { kapsamOzeti } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { DavaDosyasiSekmeleri } from "@/modules/dava-dosyasi/components/dava-dosyasi-sekmeleri";
import { BakiyeUyariOzeti } from "@/modules/dava-dosyasi/components/bakiye-uyari-ozeti";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { ekonomiDuzenleyebilirMi } from "@/core/auth/finans-yetki";
import { davaDegeriToplamlari, toplamlariYaz, degerEtiketleri, ekstralariAyikla } from "@/modules/dava-dosyasi/lib/dava-degeri";
import { TalepKalemleriPaneli } from "@/modules/dava-dosyasi/components/talep-kalemleri-paneli";
import { VekilPaneli } from "@/modules/dava-dosyasi/components/vekil-paneli";
import { prisma } from "@/core/db/prisma";
import { DosyaGorevleri, type DosyaGorevi } from "@/app/kokpit/isler/dosya-gorevleri";
import { durumBilgisi } from "@/app/kokpit/isler/durum";
import { YOL_ADLARI } from "@/modules/dava-dosyasi/lib/hesap-ozeti-yollari";
import { IhtarGonderimPaneli } from "@/modules/ihtar/components/ihtar-gonderim-paneli";
import { EvrakPaneli, type EvrakKaydi } from "@/modules/cmk-dosyalari/components/evrak-paneli";
import { DosyaBaglayici } from "@/modules/dava-dosyasi/components/dosya-baglayici";
import { kokpitNoGoster, kayitNoGoster, buroNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { Dugme } from "@/core/ui/button";
import { DuzenlenebilirKart, type KartAlani } from "@/core/ui/duzenlenebilir-kart";
import type { DurumTuruKaydi } from "@/modules/dava-dosyasi/lib/actions";
import { DosyaDurumBandi } from "@/modules/dava-dosyasi/components/dosya-durum-bandi";
import { adliBirimleriListele } from "@/modules/dava-dosyasi/lib/adli-birim";
import { etiketleriGetir } from "@/core/arayuz-etiketi/queries";
import { FormKarti } from "@/core/ui/form-karti";
import { DosyaBirlikteUyarisi } from "@/core/birlikte/dosya-birlikte-uyarisi";
import { TebligatPaneli, type TebligatKaydi } from "@/modules/tebligat/components/tebligat-paneli";
import { MasrafFormu } from "@/modules/dava-dosyasi/components/masraf-formu";
import { MasrafPaneliKabugu, MasrafPaneliDugmesi } from "@/modules/dava-dosyasi/components/masraf-paneli-kabugu";
import { masrafEkle } from "@/modules/dava-dosyasi/lib/cari-sistem-actions";

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
// Sıra numarası: yanındaki tutar/ad ile karışmasın diye yuvarlak rozet.
function SiraRozeti({ no }: { no: number }) {
  return (
    <span
      aria-label={`${no}. sıra`}
      className="mr-1.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-1 align-middle text-[11px] font-bold leading-none text-[#8fb4e8]"
    >
      {no}
    </span>
  );
}

function NumaraliAdlar({ adlar }: { adlar: string[] }) {
  if (adlar.length === 0) return <>—</>;
  if (adlar.length === 1) return <>{adlar[0]}</>;
  return (
    <>
      {adlar.map((ad, i) => (
        <span key={i} className="mr-3 inline-block">
          <SiraRozeti no={i + 1} />{ad}
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
          {muvekkiller.length > 1 && <SiraRozeti no={i + 1} />}
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
    <ol className="m-0 list-none space-y-1 p-0">
      {children.map((c, i) => (
        <li key={i} className="flex items-start gap-2">
          <SiraRozeti no={i + 1} />
          <span className="min-w-0 break-words">{c}</span>
        </li>
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
  const aktifSekme = sekme === "ekonomi" || sekme === "evrak" || sekme === "gorevler" || sekme === "tebligat" ? sekme : "genel";
  const dosyaGorevleri: DosyaGorevi[] = [];
  let gorevKisileri: { id: string; adSoyad: string }[] = [];
  if (aktifSekme === "gorevler") {
    const [isler, kisiler] = await Promise.all([
      prisma.is.findMany({ where: { dosyaId: id }, orderBy: { olusturmaTarihi: "desc" }, select: { id: true, baslik: true, durum: true, sorumluId: true, vade: true } }),
      prisma.kullanici.findMany({ where: { aktifMi: true }, select: { id: true, adSoyad: true }, orderBy: { adSoyad: "asc" } }),
    ]);
    gorevKisileri = kisiler;
    const adlar = new Map(kisiler.map((x) => [x.id, x.adSoyad]));
    for (const i of isler) {
      const d = durumBilgisi(i.durum);
      dosyaGorevleri.push({ id: i.id, baslik: i.baslik, durumAd: d.ad, renk: d.renk, kapali: i.durum === "TAMAMLANDI", sorumluAd: i.sorumluId ? (adlar.get(i.sorumluId) ?? "—") : "Atanmadı", vade: i.vade ? i.vade.toISOString().slice(0, 10) : "" });
    }
  }
  let tebligatKayitlari: TebligatKaydi[] = [];
  if (aktifSekme === "tebligat") {
    const t = await prisma.dosyaTebligati.findMany({ where: { dosyaId: id }, orderBy: [{ sonTarih: { sort: "asc", nulls: "last" } }, { olusturmaTarihi: "desc" }] });
    const gun = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
    tebligatKayitlari = t.map((x) => ({ id: x.id, yon: x.yon, baslik: x.baslik, muhatap: x.muhatap, yol: x.yol, barkod: x.barkod, gonderimTarihi: gun(x.gonderimTarihi), tebligTarihi: gun(x.tebligTarihi), durum: x.durum, sureGun: x.sureGun, sonTarih: gun(x.sonTarih), gorevId: x.gorevId, not: x.not }));
  }
  const [dosya, kullanici, anaDosyaAdaylari, etiketler, dosyaTurleri, yargiKollari, durumKodlari, uyusmazlikTurleri, hukukDallari, muvekkilSifatlari, davaTurleri, vekilAdaylari, calisilanAvukatlar, birimKatalogu] = await Promise.all([
    davaDosyasiGetir(id),
    mevcutKullanici(),
    anaDosyaAdaylariniGetir(id),
    etiketleriGetir(),
    secenekleriGetir("dosya_turu"),
    secenekleriGetir("yargi_kolu"),
    secenekleriGetir("dosya_durum_kodu"),
    secenekleriGetir("hukuki_iliski_turu"),
    secenekleriGetir("hukuk_dali"),
    secenekleriGetir("muvekkil_sifati"),
    secenekleriGetir("dava_turu"),
    vekilAdaylariniGetir(),
    calisilanAvukatlariGetir(),
    adliBirimleriListele(),
  ]);
  if (!dosya) notFound();
  const istenenOzet = dosya.muvekkiller.length > 0
    ? await prisma.hesapOzetiKaydi.findFirst({
        where: { musteriId: { in: dosya.muvekkiller.map((m) => m.musteriId) }, sonuc: "GONDERILDI" },
        orderBy: { sonucTarihi: "desc" },
        select: { toplam: true, sonucTarihi: true, yol: true },
      })
    : null;
  const ihtarGonderimi = dosya.tur?.kod === "ihtar_dosyasi" ? await prisma.ihtarGonderimi.findUnique({ where: { dosyaId: id } }) : null;

  // Dosya Evrakları sekmesi: baska avukatların "avukata özel" evrakları hiç çekilmez.
  let evrakKayitlari: EvrakKaydi[] = [];
  if (aktifSekme === "evrak") {
    const evraklar = await prisma.cMKEvrak.findMany({
      where: { davaDosyasiId: id, OR: [{ ozelKullaniciId: null }, { ozelKullaniciId: kullanici?.kullaniciId ?? "-" }] },
      select: { id: true, ad: true, klasor: true, evrakTarihi: true, mimeTipi: true, boyutBayt: true, onizlemeTuru: true, ozelKullaniciId: true },
    });
    evrakKayitlari = evraklar.map(({ ozelKullaniciId, ...e }) => ({
      ...e,
      ozel: ozelKullaniciId !== null,
      evrakTarihi: e.evrakTarihi ? e.evrakTarihi.toISOString().slice(0, 10) : null,
      onizlemeTuru: e.onizlemeTuru as EvrakKaydi["onizlemeTuru"],
    }));
  }

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
  // Dosya basligindaki bakiye uyarilari: bakiyesi olan her cari hesap kendi adiyla. Isaret muvekkil
  // acisindan: ARTI = muvekkil adina dosyada duran para (kullanilabilir/iade), EKSI = muvekkilden
  // istenecek tutar. Para hesabinda bakiye = alacak - borc (zaten artisi muvekkil lehine); digerlerinde
  // bakiye = borc - alacak oldugundan isaret ters cevrilir. Adliyede tutulan hesaplar uyari disi.
  const bakiyeEtiketleri = dosyaEkonomisi.hesaplar
    .filter((h) => !h.tutulanHesapMi)
    .map((h) => {
      const tutar = Math.round((h.paraHesabiMi ? h.bakiye : -h.bakiye) * 100) / 100;
      return { hesapId: h.hesapId, ad: h.ad, tutar, artiMi: tutar > 0, karsiTarafMi: h.grup === "BORCLU", karsiParaMi: h.grup === "BORCLU" && h.paraHesabiMi };
    })
    .filter((e) => e.tutar !== 0);

  const silmeYetkisiVar = Boolean(kullanici && silebilirMi(kullanici.rol));
  // Ekonomi panelinde kayit degistirme/silme: yonetici + finans yetkilisi.
  const ekonomiYetkisiVar = await ekonomiDuzenleyebilirMi();
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
      // Dava dosyasinda "Borçlu" secilemez (mevcut deger bozulmasin diye secili ise listede kalir).
      secenekler: muvekkilSifatlari
        .filter((o) => !(dosya.tur?.kod !== "icra_dosyasi" && o.kod === "borclu" && o.id !== dosya.muvekkilSifatiId))
        .map((o) => ({ value: o.id, label: o.etiket })),
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
      tip: "secim",
      deger: dosya.birimAdi ?? "",
      gosterim: dosya.birimAdi ?? "—",
      secenekler: [
        { value: "", label: "Seçiniz…" },
        ...[...(dosya.birimAdi && !birimKatalogu.includes(dosya.birimAdi) ? [dosya.birimAdi] : []), ...birimKatalogu].map((b) => ({ value: b, label: b })),
      ],
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
  const muvekkilDavali = (dosya.muvekkilSifatiDegeri?.etiket ?? "").toLocaleLowerCase("tr-TR").includes("davalı");
  const konuSecenegi = uyusmazlikTurleri.find((t) => t.id === dosya.hukukiIliskiTuruId);
  const turSecenegi = davaTurleri.find((t) => t.id === dosya.davaTuruId);
  const hukukDali = hukukDallari.find((d) => d.id === (konuSecenegi?.ustId ?? turSecenegi?.ustId));
  const talepMaddeleri = (dosya.talepSonucu ?? "").split("\n").filter(Boolean);
  const talepEkstralari = ekstralariAyikla(dosya.talepKalemleri);
  const davaDegeri = toplamlariYaz(davaDegeriToplamlari(talepMaddeleri, talepEkstralari));
  const icraMi = dosya.tur?.kod === "icra_dosyasi";
  const dEtiket = degerEtiketleri(icraMi);
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
      varsayilanEtiket: dEtiket.baslik,
      tip: "cokSatir",
      deger: dosya.talepSonucu ?? "",
      gosterim: dosya.talepSonucu ? (
        <>
        <ol className="m-0 list-none space-y-1 p-0">
          {dosya.talepSonucu.split("\n").map((madde, i) => (
            <li key={i} className="flex items-start gap-2">
              <SiraRozeti no={i + 1} />
              <span className="min-w-0 break-words">{madde}</span>
            </li>
          ))}
        </ol>
        {davaDegeri && (
          <p className="mt-1.5 text-sm">
            <span className="text-white/50">{dEtiket.toplam}: </span>
            <span className="font-semibold text-white">{davaDegeri}</span>
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
                    className="glass block rounded-xl px-3 py-2 text-white/85 hover:bg-white/[0.06] hover:text-[#6db8ff]"
                  >
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-xs font-bold tracking-wide text-[#8fb4e8]">
                        {kokpitNoGoster({ ...alt, anaDosya: dosya })}
                      </span>
                      {alt.birimAdi && <span className="text-sm font-semibold text-white">{alt.birimAdi}</span>}
                      <span className={alt.birimAdi ? "rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-sm font-semibold text-[#8fb4e8]" : "text-sm font-semibold text-white"}>{alt.dosyaNo ?? "—"}</span>
                      <span className="ml-auto rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-white/70">{alt.durum.etiket}</span>
                    </span>
                    <span className="block text-xs text-white/45">
                      {[alt.tur?.etiket, alt.konu].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                ))}
              </span>
            ),
          },
        ]
      : []),
  ];

  // Soldaki Masraf Girişi paneli: dosyanın müvekkili varsa, Harcama (masraf) hesabının varsayılan cari koduyla.
  const masrafHesabi = musteriId
    ? await prisma.cariHesap.findFirst({ where: { masrafHesabiMi: true, aktifMi: true }, orderBy: { no: "asc" }, select: { eskiKod: true } })
    : null;
  const masrafPaneli = musteriId ? (
    <MasrafFormu
      kompakt
      idOnEki="panel-"
      action={masrafEkle.bind(null, musteriId)}
      varsayilanCariKod={masrafHesabi?.eskiKod ?? undefined}
      dosyaSecimi={{ sabitDosyaId: id }}
      karsiTaraflar={dosya.karsiTaraflar.map((kt) => ({ id: kt.karsiTarafId, ad: kt.karsiTaraf.ad }))}
    />
  ) : null;

  const sayfa = (
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
      <KunyeSeridi id="dosya-kunye" className="mb-2 md:!static md:mb-3 md:!py-1.5 md:!shadow-none md:!backdrop-blur-none">
        <div className="relative flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <div className="min-w-[min(100%,22rem)] flex-1">
            <div className="md:flex md:flex-wrap md:items-center md:gap-x-3 md:gap-y-1">
            <div className="flex flex-wrap items-center gap-1.5 max-md:pr-28">
              <span className="hidden rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-2 py-0 text-[10px] font-semibold uppercase tracking-widest text-[#8fb4e8] md:inline">
                Dosya Kartı
              </span>
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
              <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${dosyaDurumSinifi(dosya.durum.kod)}`}>
                {dosya.durum.etiket}
              </span>
            </div>

            <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lg font-semibold tracking-tight text-white sm:text-xl md:mt-0">
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
            </div>
            {/* Davacı solda, davalı sağda: müvekkil davalıysa karşı taraf kutusu öne (sola), müvekkil kutusu arkaya (sağa) geçer. */}
            <div className="mt-1.5 grid grid-cols-1 items-stretch gap-1.5 text-sm md:mt-1 md:flex md:flex-wrap md:gap-1.5 [&_.tikon]:!h-6 [&_.tikon]:!w-6 [&_.tikon]:!text-xs [&_.tsatir]:!px-2.5 [&_.tsatir]:!py-1 md:[&_.tikon]:!hidden md:[&_.tsatir]:!px-2 md:[&_.tsatir]:!py-0.5 md:[&_.tsatir_.etiket-ust]:!mr-1.5 md:[&_.tsatir_.etiket-ust]:!inline">
              <div className={`tsatir tsatir-muv ${muvekkilDavali ? "order-2" : "order-1"}`}>
                <span className="tikon" aria-hidden>👤</span>
                <div className="min-w-0 flex-1">
                  <span className="muv-etiket etiket-ust block text-[11px] font-semibold uppercase tracking-wider sm:text-xs">
                    Müvekkil{dosya.muvekkilSifatiDegeri && !(dosya.muvekkilSifati === "BORCLU" && dosya.tur?.kod !== "icra_dosyasi") ? ` · ${dosya.muvekkilSifatiDegeri.etiket}` : ""}
                  </span>
                  <span className="break-words text-sm font-medium text-white sm:text-base">
                    <MuvekkilAdlari muvekkiller={dosya.muvekkiller.map((m) => ({ id: m.musteriId, ad: m.musteri.adSoyadUnvan }))} />
                  </span>
                </div>
              </div>
              <div className={`tsatir tsatir-karsi ${muvekkilDavali ? "order-1" : "order-2"}`}>
                <span className="tikon tikon-karsi" aria-hidden>⚖</span>
                <div className="min-w-0 flex-1">
                  <span className="karsi-etiket etiket-ust block text-[11px] font-semibold uppercase tracking-wider sm:text-xs">Karşı Taraf</span>
                  <span className="break-words text-sm font-medium text-white sm:text-base">
                    <NumaraliAdlar adlar={dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad)} />
                  </span>
                </div>
              </div>
              {(dosya.birimAdi || dosya.dosyaNo) && (
                <div className="tsatir tsatir-konu order-3">
                  <span className="tikon tikon-konu" aria-hidden>§</span>
                  <div className="min-w-0 flex-1">
                    <span className="konu-etiket etiket-ust block text-[11px] font-semibold uppercase tracking-wider sm:text-xs">Konu</span>
                    <span className="break-words text-sm font-medium text-white sm:text-base">
                      {dosya.hukukiIliskiTuru?.etiket ?? (dosya.davaKonusu || dosya.konu)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex max-w-full flex-col items-end gap-2 max-md:contents">
            {/* Masaüstünde Düzenle/Sil sekme çubuğunun sağında (aşağıda); bu kopya yalnız telefonda. */}
            <div className="flex gap-2 max-md:absolute max-md:right-0 max-md:top-0 md:hidden">
              <Link href={`/kokpit/dava-dosyalari/${id}/duzenle`}>
                <Dugme varyant="ikincil" className="!px-3 !py-1 !text-xs md:!px-4 md:!py-2 md:!text-sm">Düzenle</Dugme>
              </Link>
              {silmeYetkisiVar && (
                <DavaDosyasiSilmeButonu dosyaId={id} sonrasindaYonlendir="/kokpit/dava-dosyalari" boyut="kompakt" />
              )}
            </div>
            <div className="max-md:basis-full">
            <BakiyeUyariOzeti
              ton={bakiyeEtiketleri.some((e) => !e.artiMi) ? "eksik" : bakiyeEtiketleri.length > 0 ? "arti" : "notr"}
              ozet={(() => {
                const eksikler = bakiyeEtiketleri.filter((e) => !e.artiMi);
                const artilar = bakiyeEtiketleri.filter((e) => e.artiMi);
                const parcalar: string[] = [];
                if (eksikler.length > 0) {
                  parcalar.push(`${eksikler.length} eksi bakiye · ${paraFormatlayici.format(eksikler.reduce((t, e) => t + Math.abs(e.tutar), 0))}`);
                }
                if (artilar.length > 0) parcalar.push(`${artilar.length} artı bakiye`);
                if (istenenOzet && eksikler.some((e) => !e.karsiTarafMi)) parcalar.push("istendi");
                if (parcalar.length === 0 && agacNet !== null) parcalar.push(`Alt dosyalar dahil net: ${paraFormatlayici.format(agacNet)}`);
                return parcalar.join(" · ") || "Bakiye ayrıntısı";
              })()}
            >
              {([true, false] as const).map((arti) => {
                const grup = bakiyeEtiketleri.filter((e) => e.artiMi === arti);
                if (grup.length === 0) return null;
                return (
                  <div
                    key={String(arti)}
                    className={`w-full rounded-xl border px-3 py-1.5 md:w-auto md:min-w-[15rem] ${arti ? "border-[#32d74b]/25 bg-[#32d74b]/10" : "border-[#ff7a70]/25 bg-[#ff7a70]/10"}`}
                  >
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${arti ? "text-[#32d74b]" : "text-[#ff7a70]"}`}>
                      {arti ? "Artı bakiye veren hesaplar" : "Eksi bakiye veren hesaplar"}
                    </p>
                    <ul className="m-0 list-none space-y-0.5 p-0">
                      {grup.map((e) => (
                        <li
                          key={e.hesapId}
                          title={e.karsiParaMi ? "Karşı taraftan gelen ve henüz bir hesaba aktarılmamış para." : e.karsiTarafMi ? (e.artiMi ? "Karşı tarafın bu hesapta fazla ödediği tutar." : "Karşı taraftan (borçludan) tahsil edilmesi gereken tutar.") : e.artiMi ? "Müvekkil adına dosyada duran para: dosya için kullanılabilir, başka hesaba virman yapılabilir ya da müvekkile iade edilir." : "Müvekkilden istenmesi gereken tutar."}
                          className={`flex items-baseline justify-between gap-4 text-sm ${arti ? "text-[#32d74b]" : "text-[#ff7a70]"}`}
                        >
                          <span className="min-w-0 truncate">
                            {e.ad}
                            {(e.karsiParaMi || e.karsiTarafMi) && <span className="ml-1 text-[11px] opacity-70">(karşı taraf)</span>}
                          </span>
                          <b className="shrink-0 tabular-nums">{paraFormatlayici.format(Math.abs(e.tutar))}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {istenenOzet && bakiyeEtiketleri.some((e) => !e.artiMi && !e.karsiTarafMi) && (
                <span className="rounded-full bg-[#ffd60a]/15 px-2.5 py-0.5 text-xs font-medium text-[#ffd60a]">
                  Müvekkilden istendi: {istenenOzet.sonucTarihi ? tarihFormatlayici.format(istenenOzet.sonucTarihi) : ""} · {YOL_ADLARI[istenenOzet.yol ?? ""] ?? "yol belirtilmedi"} · {paraFormatlayici.format(istenenOzet.toplam)}
                </span>
              )}
              {agacNet !== null && (
                <span className="whitespace-nowrap rounded-full bg-white/[0.08] px-2.5 py-0.5 text-xs font-medium text-white/90">
                  Alt dosyalar dahil net: {paraFormatlayici.format(agacNet)}
                </span>
              )}
            </BakiyeUyariOzeti>
            </div>
          </div>
        </div>
      </KunyeSeridi>

      <DosyaBirlikteUyarisi dosyaId={id} />

      <DavaDosyasiSekmeleri dosyaId={id} aktif={aktifSekme} ek={masrafPaneli ? <MasrafPaneliDugmesi /> : undefined}
        eylemler={
          <>
            <Link href={`/kokpit/dava-dosyalari/${id}/duzenle`}>
              <Dugme varyant="ikincil" className="!px-3 !py-1 !text-xs">Düzenle</Dugme>
            </Link>
            {silmeYetkisiVar && (
              <DavaDosyasiSilmeButonu dosyaId={id} sonrasindaYonlendir="/kokpit/dava-dosyalari" boyut="kompakt" />
            )}
          </>
        }
        kimlik={`${kokpitNoGoster(dosya)}${dosya.birimAdi ? ` · ${dosya.birimAdi}` : ""}${dosya.dosyaNo ? ` · ${dosya.dosyaNo}` : ""}`}
        taraflar={`Müvekkil ${dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—"} · Karşı Taraf ${dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ") || "—"} · Konu ${dosya.hukukiIliskiTuru?.etiket ?? (dosya.davaKonusu || dosya.konu)}`}
      />

      {aktifSekme === "evrak" ? (
        <EvrakPaneli dosyaId={id} evraklar={evrakKayitlari} hedef="dava" />
      ) : aktifSekme === "tebligat" ? (
        <TebligatPaneli dosyaId={id} tebligatlar={tebligatKayitlari} karsiTaraflar={dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad)} />
      ) : aktifSekme === "gorevler" ? (
        <div className="glass max-w-3xl rounded-2xl p-5">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">Dosya Görevleri</h2>
          </div>
          <p className="mb-4 text-sm text-white/55">
            Bu dosyayla ilgili her türlü iş buradan yazılır ve kişilere atanır. Burada açılan görev, ana sayfadaki Görevler ekranında da (atanan kişide) görünür.
          </p>
          <DosyaGorevleri dosyaId={id} benimId={kullanici?.kullaniciId ?? ""} kisiler={gorevKisileri} gorevler={dosyaGorevleri} />
          {dosya.hukukiMudahaleler.length > 0 && (
            <>
            <h3 className="mb-2 mt-6 text-sm font-semibold text-white/70">Avukat Şapkası işleri</h3>
            <ul className="flex flex-col gap-2">
              {dosya.hukukiMudahaleler.map((g) => (
                <li key={g.id} className="alan-hucre flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-white">{g.baslik}</p>
                    <p className="text-xs text-white/50">
                      {[g.mudahaleTuru?.etiket, g.sorumluAvukat?.adSoyad, g.sonTarih ? `Son tarih: ${tarihFormatlayici.format(g.sonTarih)}` : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[#8fb4e8]">
                    {({ BEKLEMEDE: "Beklemede", DEVAM_EDIYOR: "Devam ediyor", TAMAMLANDI: "Tamamlandı", IPTAL_EDILDI: "İptal" } as Record<string, string>)[g.durum]}
                  </span>
                </li>
              ))}
            </ul>
            </>
          )}
        </div>
      ) : aktifSekme === "genel" ? (
        <div className="genel-sade">
          <div style={{ "--kart-renk": "#4da3ff" } as React.CSSProperties}>
          <DosyaDurumBandi
            dosyaId={id}
            secenekler={durumKodlari.map((d) => ({ id: d.id, etiket: d.etiket, kod: d.kod }))}
            seciliId={dosya.durumKoduId}
            gidisSayisi={dosya.durumGidisSayisi}
            digerAdi={dosya.durumDiger}
            turGecmisi={Array.isArray(dosya.durumTurGecmisi) ? (dosya.durumTurGecmisi as unknown as DurumTuruKaydi[]) : []}
          />
          </div>
          {/* Müvekkil/karşı taraf başlıkta zaten var; burada tekrarlanmaz. Yalnız özet göstergeler. */}
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { etiket: dEtiket.kpi, deger: davaDegeri || "—", alt: davaDegeri ? dEtiket.kpiAlt : dEtiket.kpiBos, renk: "#4da3ff" },
              { etiket: "Sorumlu avukat", deger: dosya.sorumluAvukat?.adSoyad ?? "Atanmadı", alt: dosya.sorumluAvukat ? "dosyayı yürüten" : "atama bekliyor", renk: "#b48cff" },
              { etiket: "Alt dosyalar", deger: String(dosya.altDosyalar.length), alt: dosya.altDosyalar.length > 0 ? "bağlı takip/dosya" : "alt dosya yok", renk: "#f2b04c" },
            ].map((k) => (
              <div key={k.etiket} className="glass min-w-0 px-4 py-2.5" style={{ "--kart-renk": k.renk } as React.CSSProperties} title={k.alt}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">{k.etiket}</p>
                <p className="line-clamp-2 break-words text-lg font-semibold leading-snug text-white" title={k.deger}>{k.deger}</p>
              </div>
            ))}
          </div>
          <div className="gri-esit grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="contents">
            <div className="min-w-0 lg:order-1" style={{ "--kart-renk": "#4da3ff" } as React.CSSProperties}>
            <DuzenlenebilirKart
              duz
              etiketOnEki="dosya-detay.kunye"
              varsayilanBaslik="Künye"
              etiketler={etiketler}
              alanlar={kunyeAlanlari}
              etiketDuzenleyebilir={etiketDuzenleyebilir}
              onKaydet={dosyaAlanlariniGuncelle.bind(null, id)}
            />
            </div>

            <div className="min-w-0 lg:order-3" style={{ "--kart-renk": "#f2b04c" } as React.CSSProperties}>
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
          </div>

          <div className="contents">
          {talepMaddeleri.length > 0 && (
            <div className="min-w-0 lg:order-5" style={{ "--kart-renk": "#32d74b" } as React.CSSProperties}>
              <FormKarti baslik={dEtiket.kalemKarti}>
                <TalepKalemleriPaneli icraMi={icraMi} dosyaId={id} maddeler={talepMaddeleri} baslangic={talepEkstralari} />
              </FormKarti>
            </div>
          )}

          {dosya.tur?.kod === "ihtar_dosyasi" && (
            <div className="min-w-0 lg:order-6">
              <FormKarti baslik="İhtar Gönderim Bilgileri">
                <IhtarGonderimPaneli
                  dosyaId={id}
                  veri={
                    ihtarGonderimi
                      ? {
                          ...ihtarGonderimi,
                          gonderimTarihi: ihtarGonderimi.gonderimTarihi?.toISOString().slice(0, 10) ?? null,
                          tebligTarihi: ihtarGonderimi.tebligTarihi?.toISOString().slice(0, 10) ?? null,
                        }
                      : null
                  }
                  karsiTaraflar={dosya.karsiTaraflar.map((kt) => kt.karsiTaraf.ad)}
                />
              </FormKarti>
            </div>
          )}

          <div className="min-w-0 lg:order-2" style={{ "--kart-renk": "#b48cff" } as React.CSSProperties}>
            <FormKarti baslik="Vekil Bilgileri">
              <VekilPaneli
                dosyaId={id}
                avukatlar={
                  dosya.sorumluAvukat && !vekilAdaylari.some((a) => a.id === dosya.sorumluAvukat!.id)
                    ? [...vekilAdaylari, { id: dosya.sorumluAvukat.id, adSoyad: dosya.sorumluAvukat.adSoyad }]
                    : vekilAdaylari
                }
                sorumluAvukatId={dosya.sorumluAvukatId}
                uyapVekilIdleri={dosya.uyapVekilleri.flatMap((v) => (v.kullaniciId ? [v.kullaniciId] : []))}
                disAvukatlar={calisilanAvukatlar}
                disVekilIdleri={dosya.uyapVekilleri.flatMap((v) => (v.calisilanAvukatId ? [v.calisilanAvukatId] : []))}
              />
            </FormKarti>
          </div>

          <div className="min-w-0 lg:order-4" style={{ "--kart-renk": "#2ec4b6" } as React.CSSProperties}>
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
          </div>
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
        </div>
      ) : (
        musteriId ? (
          <EkonomiPaneli
            kapsam={{ musteriId, dosyaId: id }}
            alt={alt ?? "ozet"}
            hrefYaz={({ alt: a }) => `/kokpit/dava-dosyalari/${id}?sekme=ekonomi&alt=${a ?? "ozet"}`}
            silmeYetkisiVar={ekonomiYetkisiVar}
          />
        ) : (
          <p className="text-sm text-white/55">Ekonomi için dosyaya bir müvekkil bağlanmalıdır.</p>
        )
      )}
    </div>
  );

  return masrafPaneli ? <MasrafPaneliKabugu panel={masrafPaneli}>{sayfa}</MasrafPaneliKabugu> : sayfa;
}