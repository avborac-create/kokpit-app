import Link from "next/link";
import { Dugme } from "@/core/ui/button";
import { OnayliButon } from "@/core/ui/onayli-buton";
import { Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { SecenekDuzenleyiciPenceresi } from "@/core/secenek/secenek-duzenleyici-penceresi";
import { MasrafFormu } from "@/modules/dava-dosyasi/components/masraf-formu";
import { MasrafListesi } from "@/modules/dava-dosyasi/components/masraf-listesi";
import { CariDefter } from "@/modules/dava-dosyasi/components/cari-defter";
import { AdliBirimHareketFormu } from "@/modules/dava-dosyasi/components/adli-birim-hareket-formu";
import { KarsiTarafAlacagiFormu } from "@/modules/dava-dosyasi/components/karsi-taraf-alacagi-formu";
import { Defter } from "@/modules/dava-dosyasi/components/ekonomi/defter";
import {
  BorcFormu,
  DosyalarArasiVirmanFormu,
  VirmanFormu,
  type DosyaSecenegi,
} from "@/modules/dava-dosyasi/components/ekonomi/formlar";
import { adliyeDefteri, borcluDefteri } from "@/modules/dava-dosyasi/lib/cari-defter";
import {
  hesapDefteri,
  hesaplariGetir,
  kapsamOzeti,
  muvekkilDosyalari,
  secenekListesiTumDegerlerle,
  type Kapsam,
} from "@/modules/dava-dosyasi/lib/cari-sistem";
import {
  borcEkle,
  dosyalarArasiVirman,
  hesapAdiGuncelle,
  hesapAktifligiDegistir,
  hesapEkle,
  hesapSil,
  dosyaEkonomiDurumuDegistir,
  masrafEkle,
  odemeEkle,
  topluTasnif,
  virmanYap,
} from "@/modules/dava-dosyasi/lib/cari-sistem-actions";
import { adliBirimHareketiEkle, karsiTarafAlacagiEkle } from "@/modules/dava-dosyasi/lib/actions";
import { prisma } from "@/core/db/prisma";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { OdemeFormu } from "@/modules/dava-dosyasi/components/ekonomi/odeme-formu";
import { TopluTasnifFormu } from "@/modules/dava-dosyasi/components/ekonomi/toplu-tasnif-formu";
import { DosyaSecimi } from "@/modules/dava-dosyasi/components/ekonomi/dosya-secimi";
import { AnlasmaSekmesi } from "@/modules/dava-dosyasi/components/ekonomi/anlasma-sekmesi";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const paraYaz = para;

const bakiyeRenk = (b: number) => (b > 0 ? "text-[#ff7a70]" : b < 0 ? "text-[#32d74b]" : "text-white/60");
const Bakiye = ({ b }: { b: number }) => <span className={bakiyeRenk(b)}>{para.format(b)}</span>;

// "Bu muvekkil bize hangi cari turden ne kadar borclu / bizden ne kadar alacakli?"
// sorusunun tek bakista cevabi: her hesap icin tek satirlik durum karti.
function DurumSeridi({
  ozet,
  hrefYaz,
  havuzBakiyesi,
  paraHesapNo,
}: {
  ozet: Awaited<ReturnType<typeof kapsamOzeti>>;
  hrefYaz: (p: { sayfa?: string; alt?: string }) => string;
  havuzBakiyesi?: number;
  paraHesapNo?: number;
}) {
  const gosterilecek = ozet.hesaplar.filter((h) => !h.paraHesabiMi && !h.tutulanHesapMi && h.grup === "MUVEKKIL" && (h.borc !== 0 || h.alacak !== 0 || h.no <= 102 || h.no === 108));
  const tutulanlar = ozet.hesaplar.filter((h) => h.tutulanHesapMi && (h.borc !== 0 || h.alacak !== 0));
  const para = ozet.hesaplar.find((h) => h.paraHesabiMi);
  return (
    <div className="mb-5">
      <div
        className={`mb-3 rounded-2xl border px-5 py-4 ${
          ozet.net > 0
            ? "border-[#ff7a70]/40 bg-[#ff7a70]/[0.07]"
            : ozet.net < 0
              ? "border-[#32d74b]/40 bg-[#32d74b]/[0.07]"
              : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <p className="text-xs text-white/50">GENEL DURUM</p>
        <p className="mt-1 text-xl font-semibold text-white">
          {ozet.net > 0 ? (
            <>
              Müvekkil bize <span className="text-[#ff7a70]">{paraYaz.format(ozet.net)}</span> borçlu
            </>
          ) : ozet.net < 0 ? (
            <>
              Müvekkil bizden <span className="text-[#32d74b]">{paraYaz.format(-ozet.net)}</span> alacaklı
            </>
          ) : (
            "Müvekkil ile büro arasında net bakiye yok"
          )}
        </p>
        <p className="mt-1 text-xs text-white/45">
          Net = hesaplardaki kalan borçlar − para trafiğinde bekleyen para ({paraYaz.format(ozet.digerBorclar)} −{" "}
          {paraYaz.format(ozet.paraBakiyesi)}).
        </p>
      </div>
      {havuzBakiyesi !== undefined && havuzBakiyesi > 0 && (
        <Link
          href={hrefYaz({ alt: String(paraHesapNo ?? 100) })}
          className="mb-3 block rounded-xl border border-[#6db8ff]/40 bg-[#6db8ff]/[0.07] px-4 py-3 text-sm text-white/85 hover:bg-[#6db8ff]/[0.12]"
        >
          Müvekkilin havuzunda dosyaya aktarılmamış <b className="text-[#6db8ff]">{paraYaz.format(havuzBakiyesi)}</b> bekleyen para var.
          Bu dosyaya aktarmak için <u>{paraHesapNo ?? 100} - Para Trafiği</u> sekmesinden virman yapın →
        </Link>
      )}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {gosterilecek.map((h) => (
          <Link
            key={h.hesapId}
            href={hrefYaz({ alt: String(h.no) })}
            className={`rounded-xl border p-3 transition-colors hover:bg-white/[0.05] ${
              h.bakiye > 0 ? "border-[#ff7a70]/30" : h.bakiye < 0 ? "border-[#32d74b]/30" : "border-white/10"
            }`}
          >
            <p className="text-xs text-white/50">
              {h.no} - {h.ad}
            </p>
            <p className={`mt-0.5 text-base font-semibold ${h.bakiye > 0 ? "text-[#ff7a70]" : h.bakiye < 0 ? "text-[#32d74b]" : "text-white/50"}`}>
              {paraYaz.format(Math.abs(h.bakiye))}
            </p>
            <p className="text-[11px] text-white/45">
              {h.bakiye > 0 ? "Kalan: müvekkil bize borçlu" : h.bakiye < 0 ? "Müvekkil bizden alacaklı" : "Kalan borç yok"}
            </p>
            {h.borc > 0 && (
              <div className="mt-2 border-t border-white/10 pt-2 text-[11px] text-white/55">
                <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#32d74b]" style={{ width: `${Math.min(100, Math.max(0, (h.alacak / h.borc) * 100))}%` }} />
                </div>
                <div className="flex justify-between gap-2">
                  <span>{h.masrafHesabiMi ? "Yapılan masraf" : "Borçlandırılan"}</span>
                  <span className="text-white/80">{paraYaz.format(h.borc)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Ödenen</span>
                  <span className="text-[#32d74b]">{paraYaz.format(h.alacak)}</span>
                </div>
              </div>
            )}
          </Link>
        ))}
        {tutulanlar.map((h) => (
          <Link
            key={h.hesapId}
            href={hrefYaz({ alt: String(h.no) })}
            className="rounded-xl border border-[#ffb340]/30 p-3 transition-colors hover:bg-white/[0.05]"
          >
            <p className="text-xs text-white/50">
              {h.no} - {h.ad}
            </p>
            <p className="mt-0.5 text-base font-semibold text-[#ffb340]">{paraYaz.format(h.bakiye)}</p>
            <p className="text-[11px] text-white/45">Adliyede/üçüncü kişide tutulan</p>
          </Link>
        ))}
        {para && (
          <Link
            href={hrefYaz({ alt: String(para.no) })}
            className="rounded-xl border border-[#6db8ff]/30 p-3 transition-colors hover:bg-white/[0.05]"
          >
            <p className="text-xs text-white/50">
              {para.no} - {para.ad}
            </p>
            <p className="mt-0.5 text-base font-semibold text-[#6db8ff]">{paraYaz.format(ozet.paraBakiyesi)}</p>
            <p className="text-[11px] text-white/45">Müvekkilin bizde bekleyen parası</p>
          </Link>
        )}
      </div>
    </div>
  );
}

export type SayfaSekmesi = { anahtar: string; etiket: string; baslik?: string };

// Muvekkil + Dosya Ekonomisi paneli. AYNI bilesen iki duzeyde kullanilir:
//  - kapsam.dosyaId yoksa: MUVEKKIL ANA EKONOMISI (tum dosyalarin toplu dokumu),
//  - kapsam.dosyaId varsa: o dosyanin kendi cari hesaplari.
// Ustte cari hesap sekmeleri (100 Para Trafigi, 101 Akdi Vekalet...), istenirse
// altta Excel sayfa sekmeleri gibi "Genel + her dosya" gezinmesi.
export async function EkonomiPaneli({
  kapsam,
  alt,
  hrefYaz,
  silmeYetkisiVar,
  sayfaSekmeleri,
  aktifSayfa,
}: {
  kapsam: Kapsam;
  alt: string;
  hrefYaz: (p: { sayfa?: string; alt?: string }) => string;
  silmeYetkisiVar: boolean;
  sayfaSekmeleri?: SayfaSekmesi[];
  aktifSayfa?: string;
}) {
  const musteriDuzeyi = !kapsam.dosyaId;
  const [hesaplar, ozet, dosyalar] = await Promise.all([
    hesaplariGetir(silmeYetkisiVar),
    kapsamOzeti(kapsam),
    muvekkilDosyalari(kapsam.musteriId),
  ]);
  // Dosya ekraninda: muvekkilin henuz dosyalara aktarilmamis havuz parasi
  const havuzBakiyesi = kapsam.dosyaId ? (await kapsamOzeti({ musteriId: kapsam.musteriId })).paraBakiyesi : undefined;
  // Ekonomi disi tutulan dosyalar: dosya ekraninda uyari, muvekkil ekraninda sayac
  const dosyaDisiMi = kapsam.dosyaId
    ? ((await prisma.davaDosyasi.findUnique({ where: { id: kapsam.dosyaId }, select: { ekonomiDisi: true } }))?.ekonomiDisi ?? false)
    : false;
  const disindakiSayisi = musteriDuzeyi
    ? await prisma.davaDosyasi.count({ where: { muvekkiller: { some: { musteriId: kapsam.musteriId } }, ekonomiDisi: true } })
    : 0;
  const aktifHesaplar = hesaplar.filter((h) => h.aktifMi);
  const seciliHesap = aktifHesaplar.find((h) => String(h.no) === alt);
  const aktif = seciliHesap
    ? String(seciliHesap.no)
    : alt === "anlasma"
      ? "anlasma"
      : alt === "dosyalar" && musteriDuzeyi
      ? "dosyalar"
      : alt === "yonet" && silmeYetkisiVar
        ? "yonet"
        : ["adliye", "borclu"].includes(alt)
          ? alt
          : "ozet";
  const ozetOf = (hesapId: string) => ozet.hesaplar.find((o) => o.hesapId === hesapId);
  const dosyaSecenekleri: DosyaSecenegi[] = dosyalar.map((d) => ({ id: d.id, etiket: d.etiket, ayrinti: d.ayrinti }));

  type Sekme = { anahtar: string; etiket: string; rozet?: string };
  const hesapSekmesi = (h: (typeof aktifHesaplar)[number]): Sekme => {
    const o = ozetOf(h.id);
    return { anahtar: String(h.no), etiket: `${h.no} - ${h.ad}`, rozet: o && o.bakiye !== 0 ? para.format(Math.abs(o.bakiye)) : undefined };
  };
  // Katlar: genel / muvekkil (100'ler) / borclu (200'ler) / adliye (300'ler)
  const genelKat: Sekme[] = [
    { anahtar: "ozet", etiket: "Özet" },
    { anahtar: "anlasma", etiket: "🤝 Anlaşma" },
    ...(musteriDuzeyi
      ? [{ anahtar: "dosyalar", etiket: "📂 Dosyaları Seç", rozet: disindakiSayisi > 0 ? `${disindakiSayisi} dışında` : undefined }]
      : []),
    ...(silmeYetkisiVar ? [{ anahtar: "yonet", etiket: "⚙ Hesapları Yönet" }] : []),
  ];
  const katlar: { baslik: string; sekmeler: Sekme[] }[] = [
    { baslik: "", sekmeler: genelKat },
    { baslik: "MÜVEKKİL (100)", sekmeler: aktifHesaplar.filter((h) => h.grup === "MUVEKKIL").map(hesapSekmesi) },
    {
      baslik: "BORÇLU (200)",
      sekmeler: [{ anahtar: "borclu", etiket: "200 - Borçlu" }, ...aktifHesaplar.filter((h) => h.grup === "BORCLU").map(hesapSekmesi)],
    },
    {
      baslik: "ADLİYE (300)",
      sekmeler: [{ anahtar: "adliye", etiket: "300 - Adliye (eski hareketler)" }, ...aktifHesaplar.filter((h) => h.grup === "ADLIYE").map(hesapSekmesi)],
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {musteriDuzeyi ? "Müvekkil Ekonomisi — tüm dosyalar" : "Dosya Ekonomisi"}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-white/40">Bir kayıt hem dosya hem müvekkil ekonomisinde görünür; tek yerde girilir.</p>
          {kapsam.dosyaId ? (
            <Link
              href={`/kokpit/finans/musteri-iliskileri/${kapsam.musteriId}/cari-hesap?sayfa=genel&alt=ozet`}
              className="whitespace-nowrap rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--accent)]/30"
            >
              Müvekkil Ekonomisi →
            </Link>
          ) : null}
        </div>
      </div>

      <Link
        href={`/kokpit/finans/musteri-iliskileri/${kapsam.musteriId}/odeme-talebi`}
        className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-white transition-colors hover:bg-[var(--accent)]/30"
      >
        <span>
          <span className="block text-sm font-semibold">📄 Müvekkil Hesap Özeti Oluştur</span>
          <span className="block text-xs text-white/60">
            Müvekkilden ödeme istemek için: ne için ne kadar, banka bilgisi ve masraf dökümüyle A4 belge
          </span>
        </span>
        <span className="shrink-0 text-lg" aria-hidden="true">
          ›
        </span>
      </Link>

      {dosyaDisiMi && kapsam.dosyaId && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/80">
          <span>
            Bu dosya <b>ekonomi dışında</b> tutuluyor: müvekkil toplamlarına ve müvekkil ekranındaki sayfa sekmelerine girmez.
          </span>
          <form action={dosyaEkonomiDurumuDegistir.bind(null, kapsam.dosyaId, false)}>
            <GonderButonu varyant="ikincil" boyut="kompakt" bekleyenMetin="…">
              Ekonomiye Dahil Et
            </GonderButonu>
          </form>
        </div>
      )}
      <DurumSeridi ozet={ozet} hrefYaz={hrefYaz} havuzBakiyesi={havuzBakiyesi} paraHesapNo={aktifHesaplar.find((h) => h.paraHesabiMi)?.no} />

      <div className="mb-5 space-y-2 border-b border-white/[0.08] pb-4">
        {katlar.map((kat, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            {kat.baslik && (
              <span className="mr-1 w-32 shrink-0 text-[11px] font-semibold tracking-wide text-white/35">{kat.baslik}</span>
            )}
            {kat.sekmeler.map((sk) => (
              <Link
                key={sk.anahtar}
                href={hrefYaz({ alt: sk.anahtar })}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  sk.anahtar === aktif
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                    : "border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {sk.etiket}
                {sk.rozet && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">{sk.rozet}</span>}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {aktif === "ozet" && <OzetSekmesi ozet={ozet} kapsam={kapsam} dosyalar={dosyalar} />}
      {seciliHesap && aktif === String(seciliHesap.no) && (
        <HesapSekmesi
          kapsam={kapsam}
          hesap={seciliHesap}
          aktifHesaplar={aktifHesaplar}
          dosyalar={dosyaSecenekleri}
          paraBakiyesi={ozet.paraBakiyesi}
          havuzBakiyesi={havuzBakiyesi}
          ozetHesaplar={ozet.hesaplar}
          silmeYetkisiVar={silmeYetkisiVar}
        />
      )}
      {aktif === "adliye" && kapsam.dosyaId && <AdliyeSekmesi dosyaId={kapsam.dosyaId} silmeYetkisiVar={silmeYetkisiVar} />}
      {aktif === "borclu" && kapsam.dosyaId && <BorcluSekmesi dosyaId={kapsam.dosyaId} silmeYetkisiVar={silmeYetkisiVar} />}
      {(aktif === "adliye" || aktif === "borclu") && !kapsam.dosyaId && (
        <p className="text-sm text-white/55">
          200 - Borçlu ve 300 - Adliye hesapları dosya bazındadır. Aşağıdaki sayfa sekmelerinden bir dosya seçin.
        </p>
      )}
      {aktif === "anlasma" && (
        <AnlasmaSekmesi musteriId={kapsam.musteriId} dosyaId={kapsam.dosyaId} silmeYetkisiVar={silmeYetkisiVar} />
      )}
      {aktif === "dosyalar" && musteriDuzeyi && <DosyaSecimi musteriId={kapsam.musteriId} />}
      {aktif === "yonet" && <HesapYonetimi hesaplar={hesaplar} />}

      {sayfaSekmeleri && sayfaSekmeleri.length > 0 && (
        <div className="mt-6 flex flex-wrap items-end gap-1 border-t border-white/[0.08] pt-3">
          {sayfaSekmeleri.map((s) => (
            <Link
              key={s.anahtar}
              href={hrefYaz({ sayfa: s.anahtar })}
              title={s.baslik}
              className={`rounded-t-lg border border-b-0 px-3.5 py-1.5 text-xs transition-colors ${
                s.anahtar === aktifSayfa
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-white"
                  : "border-white/10 text-white/55 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {s.etiket}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

async function OzetSekmesi({
  ozet,
  kapsam,
  dosyalar,
}: {
  ozet: Awaited<ReturnType<typeof kapsamOzeti>>;
  kapsam: Kapsam;
  dosyalar: { id: string; etiket: string }[];
}) {
  const kirilim = !kapsam.dosyaId
    ? await Promise.all(
        dosyalar.map(async (d) => ({ ...d, ozet: await kapsamOzeti({ musteriId: kapsam.musteriId, dosyaId: d.id }) })),
      )
    : [];
  const digerHesaplar = ozet.hesaplar.filter((h) => !h.paraHesabiMi && !h.tutulanHesapMi);

  return (
    <div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Hesap</th>
              <th className="px-4 py-3 text-right font-medium">Borç</th>
              <th className="px-4 py-3 text-right font-medium">Alacak</th>
              <th className="px-4 py-3 text-right font-medium">Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {ozet.hesaplar.map((h) => (
              <tr key={h.hesapId} className="border-t border-white/[0.06]">
                <td className="px-4 py-3 text-white/85">
                  {h.no} - {h.ad}
                </td>
                <td className="px-4 py-3 text-right text-white/85">{h.borc ? para.format(h.borc) : "—"}</td>
                <td className="px-4 py-3 text-right text-white/85">{h.alacak ? para.format(h.alacak) : "—"}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {h.paraHesabiMi || h.tutulanHesapMi ? <span className="text-[#6db8ff]">{para.format(h.bakiye)}</span> : <Bakiye b={h.bakiye} />}
                </td>
              </tr>
            ))}
            <tr className="border-t border-white/10 font-medium">
              <td className="px-4 py-3 text-white">Net (diğer hesaplar − para trafiği)</td>
              <td colSpan={2} />
              <td className="px-4 py-3 text-right">
                <Bakiye b={ozet.net} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {kirilim.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-white">Dosya Kırılımı (kalan borç / bakiye)</h3>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Dosya</th>
                  {digerHesaplar.map((h) => (
                    <th key={h.hesapId} className="px-4 py-3 text-right font-medium">
                      {h.no} - {h.ad}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Para Trafiği</th>
                  <th className="px-4 py-3 text-right font-medium">Adliyede Tutulan</th>
                  <th className="px-4 py-3 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {kirilim.map((d) => (
                  <tr key={d.id} className="border-t border-white/[0.06]">
                    <td className="whitespace-nowrap px-4 py-3 text-white/85">{d.etiket}</td>
                    {digerHesaplar.map((h) => (
                      <td key={h.hesapId} className="px-4 py-3 text-right">
                        <Bakiye b={d.ozet.hesaplar.find((x) => x.hesapId === h.hesapId)?.bakiye ?? 0} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-[#6db8ff]">{para.format(d.ozet.paraBakiyesi)}</td>
                    <td className="px-4 py-3 text-right text-[#ffb340]">{d.ozet.tutulanToplam ? para.format(d.ozet.tutulanToplam) : "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <Bakiye b={d.ozet.net} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-white/35">
            Dosyaların para trafiği sütunu, müvekkil havuzundan o dosyaya aktarılıp henüz hesaplara dağıtılmamış parayı
            gösterir. Dosyasız (havuzdaki) para yalnızca müvekkil toplamında görünür.
          </p>
        </div>
      )}

      {dosyalar.length > 1 && (
        <div className="mt-8">
          <h3 className="mb-1 text-sm font-semibold text-white">⇄ Dosyalar Arası Virman</h3>
          <p className="mb-2 text-xs text-white/45">
            Bir dosyadaki fazla ödemeyi (ya da adliyede duran tutarı) aynı müvekkilin başka bir dosyasındaki hesaba aktarır.
            Kaynakta borç, hedefte alacak olarak iki satır yazılır; kaynakta aktarılabilir tutarı aşamazsınız.
          </p>
          <DosyalarArasiVirmanFormu
            action={dosyalarArasiVirman.bind(null, kapsam.musteriId)}
            dosyalar={dosyalar}
            sabitKaynakDosyaId={kapsam.dosyaId}
            hesaplar={ozet.hesaplar.map((h) => ({ id: h.hesapId, etiket: `${h.no} - ${h.ad}` }))}
          />
        </div>
      )}
    </div>
  );
}

async function HesapSekmesi({
  kapsam,
  hesap,
  aktifHesaplar,
  dosyalar,
  paraBakiyesi,
  havuzBakiyesi,
  ozetHesaplar,
  silmeYetkisiVar,
}: {
  kapsam: Kapsam;
  hesap: Awaited<ReturnType<typeof hesaplariGetir>>[number];
  aktifHesaplar: Awaited<ReturnType<typeof hesaplariGetir>>;
  dosyalar: DosyaSecenegi[];
  paraBakiyesi: number;
  havuzBakiyesi?: number;
  ozetHesaplar: Awaited<ReturnType<typeof kapsamOzeti>>["hesaplar"];
  silmeYetkisiVar: boolean;
}) {
  // Virman kaynaklari: para trafigi (havuz / dosya) ve baska hesaplardaki fazla odemeler.
  const digerKaynaklar = aktifHesaplar
    .filter((h) => !h.paraHesabiMi && h.id !== hesap.id)
    .map((h) => {
      const bakiye = ozetHesaplar.find((o) => o.hesapId === h.id)?.bakiye ?? 0;
      const tutar = Math.max(0, h.tutulanHesapMi ? bakiye : -bakiye);
      const tur = h.tutulanHesapMi ? "orada duran tutar" : "fazla ödeme";
      return {
        deger: `hesap:${h.id}`,
        etiket: kapsam.dosyaId ? `${h.no} - ${h.ad} — ${tur} ${para.format(tutar)}` : `${h.no} - ${h.ad} — seçilen dosyadaki ${tur}`,
      };
    });
  const kaynaklar = kapsam.dosyaId
    ? [
        { deger: "havuz", etiket: `Para Trafiği — müvekkil havuzu (${para.format(havuzBakiyesi ?? 0)})` },
        { deger: "dosya", etiket: `Para Trafiği — bu dosya (${para.format(paraBakiyesi)})` },
        ...digerKaynaklar,
      ]
    : digerKaynaklar.length > 0
      ? [{ deger: "havuz", etiket: `Para Trafiği — müvekkil havuzu (${para.format(paraBakiyesi)})` }, ...digerKaynaklar]
      : undefined;
  const satirlar = await hesapDefteri(kapsam, hesap);
  // Para Trafigi: odeme yontemleri (Nakit / Banka / ...), yoneticiye yerinde duzenleme penceresi
  const yontemler = hesap.paraHesabiMi
    ? (await secenekleriGetir("odeme_yontemi")).map((y) => ({ id: y.id, etiket: y.etiket }))
    : [];
  const yontemListesi = hesap.paraHesabiMi && silmeYetkisiVar ? await secenekListesiTumDegerlerle("odeme_yontemi") : null;
  const borcludanToplam = hesap.paraHesabiMi
    ? satirlar.filter((x) => x.borcludan && x.alacak > 0).reduce((t, x) => t + x.alacak, 0)
    : 0;
  const yontemToplamlari = new Map<string, number>();
  if (hesap.paraHesabiMi) {
    for (const x of satirlar) {
      if (x.alacak > 0 && !x.turetilmis && x.odemeYontemi) {
        yontemToplamlari.set(x.odemeYontemi, (yontemToplamlari.get(x.odemeYontemi) ?? 0) + x.alacak);
      }
    }
  }
  const musteriDuzeyi = !kapsam.dosyaId;
  const kapsamDosyaId = kapsam.dosyaId ?? "";
  const hedefler = aktifHesaplar.filter((h) => !h.paraHesabiMi).map((h) => ({ id: h.id, etiket: `${h.no} - ${h.ad}` }));
  const adliyeHesaplari = aktifHesaplar
    .filter((h) => h.grup === "ADLIYE")
    .map((h) => ({ id: h.id, etiket: `${h.no} - ${h.ad}` }));

  const turListesi = hesap.masrafHesabiMi && silmeYetkisiVar ? await secenekListesiTumDegerlerle("masraf_turu") : null;
  const karsiTaraflar = hesap.masrafHesabiMi
    ? await prisma.karsiTaraf.findMany({
        where: kapsam.dosyaId
          ? { dosyalar: { some: { dosyaId: kapsam.dosyaId } } }
          : { musteriId: kapsam.musteriId },
        select: { id: true, ad: true },
        orderBy: { ad: "asc" },
      })
    : [];
  const tumMasraflar = hesap.masrafHesabiMi
    ? (
        await prisma.dosyaMasrafi.findMany({
          where: kapsam.dosyaId
            ? { dosyaId: kapsam.dosyaId }
            : { dosya: { muvekkiller: { some: { musteriId: kapsam.musteriId } } } },
          include: { cariKod: true, tur: true },
          orderBy: { tarih: "desc" },
        })
      ).map((m) => ({ ...m, tutar: Number(m.tutar), cariKod: { ...m.cariKod, maktuTutar: null }, tur: { ...m.tur, maktuTutar: null } }))
    : [];

  return (
    <div>
      {borcludanToplam > 0 && (
        <div className="mb-3">
          <span className="rounded-full border border-[#ffb340]/30 bg-[#ffb340]/[0.07] px-3 py-1 text-xs text-white/80">
            Borçludan gelen: <b className="text-[#ffb340]">{para.format(borcludanToplam)}</b>
          </span>
        </div>
      )}
      {yontemToplamlari.size > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {[...yontemToplamlari.entries()].map(([yontem, tutar]) => (
            <span key={yontem} className="rounded-full border border-[#6db8ff]/30 bg-[#6db8ff]/[0.07] px-3 py-1 text-xs text-white/80">
              Alınan ({yontem}): <b className="text-[#6db8ff]">{para.format(tutar)}</b>
            </span>
          ))}
        </div>
      )}
      <Defter
        satirlar={satirlar}
        paraHesabiMi={hesap.paraHesabiMi}
        tutulanHesapMi={hesap.tutulanHesapMi}
        dosyaSutunu={musteriDuzeyi}
        silmeYetkisiVar={silmeYetkisiVar}
        bosMesaj={`${hesap.no} - ${hesap.ad} hesabında henüz hareket yok.`}
      />

      {hesap.paraHesabiMi ? (
        <>
          <h3 className="mb-2 mt-6 text-sm font-semibold text-white">
            + Ödeme Geldi{musteriDuzeyi ? " (dosya seçerseniz o dosyaya da işlenir)" : " (müvekkil ekonomisinde de görünür)"}
          </h3>
          <OdemeFormu
            action={odemeEkle.bind(null, kapsam.musteriId)}
            dosyalar={dosyalar}
            sabitDosyaId={kapsam.dosyaId}
            yontemler={yontemler}
            yontemListesi={yontemListesi ?? undefined}
          />
          <h3 className="mb-2 mt-6 text-sm font-semibold text-white">⇄ Virman: Para Trafiğinden / Hesaplar Arası Aktar</h3>
          <VirmanFormu
            action={virmanYap.bind(null, kapsam.musteriId, kapsamDosyaId)}
            hedefler={hedefler}
            dosyalar={dosyalar}
            sabitDosyaId={kapsam.dosyaId}
            mevcutBakiye={paraBakiyesi}
            kaynaklar={kaynaklar}
          />
          <h3 className="mb-1 mt-6 text-sm font-semibold text-white">⇉ Toplu Tasnif: Bir Parayı Birden Fazla Dosya / Hesaba Böl</h3>
          <p className="mb-2 text-xs text-white/45">
            Örn. borçludan gelen 50.000 TL: 36.000 masraf iadesi (Harcama), 14.000 vekalet ücreti kesintisi (Akdi Vekalet);
            ya da kalanı müvekkile ödeme. Her satıra &quot;neye mahsup edildiğini&quot; yazın.
          </p>
          <TopluTasnifFormu
            action={topluTasnif.bind(null, kapsam.musteriId, kapsamDosyaId)}
            hedefler={hedefler}
            dosyalar={dosyalar}
            sabitDosyaId={kapsam.dosyaId}
            mevcutBakiye={paraBakiyesi}
            kaynaklar={
              kapsam.dosyaId
                ? [
                    { deger: "havuz", etiket: "Müvekkil havuzu", bakiye: havuzBakiyesi ?? 0 },
                    { deger: "dosya", etiket: "Bu dosyanın para trafiği", bakiye: paraBakiyesi },
                  ]
                : undefined
            }
          />
        </>
      ) : (
        <>
          {hesap.no === 103 && adliyeHesaplari.length > 0 && (
            <>
              <h3 className="mb-1 mt-6 text-sm font-semibold text-white">🏛 Adliyeye Aktar (bloke paranın tamamını ya da bir kısmını 300 serisi hesaba)</h3>
              <p className="mb-2 text-xs text-white/45">
                Müvekkilden alınan bloke parayı adli birime yatırdığınızda burada kayda geçirin: harcama olarak yatırılan (geri
                dönmeyen) için 301, teminat olarak yatırılan (sonradan geri alınabilen) için 302 hesabını seçin.
              </p>
              <VirmanFormu
                action={virmanYap.bind(null, kapsam.musteriId, kapsamDosyaId)}
                hedefler={adliyeHesaplari}
                dosyalar={dosyalar}
                sabitDosyaId={kapsam.dosyaId}
                mevcutBakiye={paraBakiyesi}
                kaynaklar={[
                  {
                    deger: `hesap:${hesap.id}`,
                    etiket: kapsam.dosyaId
                      ? `${hesap.no} - ${hesap.ad} — aktarılabilir ${para.format(Math.max(0, -(ozetHesaplar.find((o) => o.hesapId === hesap.id)?.bakiye ?? 0)))}`
                      : `${hesap.no} - ${hesap.ad} — seçilen dosyadaki fazla ödeme`,
                  },
                ]}
              />
            </>
          )}
          {hesap.tutulanHesapMi && (
            <>
              <h3 className="mb-1 mt-6 text-sm font-semibold text-white">↩ Geri Alındı / İade: Bu Hesaptaki Parayı Başka Hesaba Aktar</h3>
              <p className="mb-2 text-xs text-white/45">
                Adliyeden geri gelen teminat gibi tutarları, ilgili hesaba (ör. 103 - Bloke Para) geri aktarın; bu hesaptan Borç olarak düşer.
              </p>
              <VirmanFormu
                action={virmanYap.bind(null, kapsam.musteriId, kapsamDosyaId)}
                hedefler={aktifHesaplar.filter((h) => !h.paraHesabiMi && !h.tutulanHesapMi).map((h) => ({ id: h.id, etiket: `${h.no} - ${h.ad}` }))}
                dosyalar={dosyalar}
                sabitDosyaId={kapsam.dosyaId}
                mevcutBakiye={paraBakiyesi}
                kaynaklar={[
                  {
                    deger: `hesap:${hesap.id}`,
                    etiket: kapsam.dosyaId
                      ? `${hesap.no} - ${hesap.ad} — orada duran ${para.format(Math.max(0, ozetHesaplar.find((o) => o.hesapId === hesap.id)?.bakiye ?? 0))}`
                      : `${hesap.no} - ${hesap.ad} — seçilen dosyadaki tutar`,
                  },
                ]}
              />
            </>
          )}
          {!hesap.tutulanHesapMi && (
            <h3 className="mb-2 mt-6 text-sm font-semibold text-white">{hesap.masrafHesabiMi ? "+ Masraf Ekle" : "+ Borç Ekle"}</h3>
          )}
          {hesap.tutulanHesapMi ? null : hesap.masrafHesabiMi ? (
            <>
              <MasrafFormu
                action={masrafEkle.bind(null, kapsam.musteriId)}
                varsayilanCariKod={hesap.eskiKod ?? undefined}
                dosyaSecimi={{ sabitDosyaId: kapsam.dosyaId, dosyalar }}
                karsiTaraflar={karsiTaraflar}
                turDuzenleyici={
                  turListesi ? (
                    <SecenekDuzenleyiciPenceresi listeId={turListesi.id} baslik="Masraf Türü" degerler={turListesi.degerler} />
                  ) : undefined
                }
              />
              {kapsam.dosyaId && (
                <div className="mt-3">
                  <Link href={`/kokpit/dava-dosyalari/${kapsam.dosyaId}/masraf-aktar`}>
                    <Dugme varyant="ikincil">Excel&apos;den masraf aktar</Dugme>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <BorcFormu
              action={borcEkle.bind(null, kapsam.musteriId)}
              hesapId={hesap.id}
              dosyalar={dosyalar}
              sabitDosyaId={kapsam.dosyaId}
              aciklamaIpucu={hesap.no === 101 ? "ör. dosyanın hizmet bedeli" : hesap.no === 108 ? "ör. dosya giderleri için istenen avans" : undefined}
            />
          )}
          <h3 className="mb-2 mt-6 text-sm font-semibold text-white">⇄ Bu Hesaba Virman (Para Trafiğinden ya da Başka Hesaptan)</h3>
          <VirmanFormu
            action={virmanYap.bind(null, kapsam.musteriId, kapsamDosyaId)}
            hedefler={hedefler}
            sabitHedefId={hesap.id}
            dosyalar={dosyalar}
            sabitDosyaId={kapsam.dosyaId}
            mevcutBakiye={paraBakiyesi}
            kaynaklar={kaynaklar}
          />
        </>
      )}

      {hesap.masrafHesabiMi && tumMasraflar.length > 0 && (
        <details className="mt-6 rounded-2xl border border-white/10 p-4">
          <summary className="cursor-pointer text-sm text-white/70">
            Tüm masraf kayıtları ve yansıtma ayarı (Müvekkil / Büro / Borçlu)
          </summary>
          <div className="mt-4">
            <MasrafListesi masraflar={tumMasraflar} dosyaId={kapsam.dosyaId ?? tumMasraflar[0]?.dosyaId ?? ""} silmeYetkisiVar={silmeYetkisiVar} />
          </div>
        </details>
      )}
    </div>
  );
}

function HesapYonetimi({ hesaplar }: { hesaplar: Awaited<ReturnType<typeof hesaplariGetir>> }) {
  return (
    <div>
      <p className="mb-3 text-sm text-white/55">
        Cari hesap planı: müvekkil ile büro arasındaki hesaplar 100–199, borçlu ile olanlar 200–299, adliye ile olanlar 300–399 aralığındadır. Yeni hesap eklerken kod aralığı hesabın grubunu belirler. &quot;Tutulan&quot; hesaplar, üçüncü kişide/adliyede duran parayı gösterir (ör. 301 harcama, 302 teminat); müvekkilin borcu sayılmaz. Kaydı olan hesap silinemez, pasife alınabilir.</p>
      <div className="glass mb-4 overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Kod</th>
              <th className="px-4 py-3 font-medium">Ad</th>
              <th className="px-4 py-3 font-medium">Grup / Tür</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {hesaplar.map((h) => (
              <tr key={h.id} className={`border-t border-white/[0.06] ${h.aktifMi ? "" : "opacity-45"}`}>
                <td className="px-4 py-3 font-medium text-white">{h.no}</td>
                <td className="px-4 py-3">
                  <form action={hesapAdiGuncelle.bind(null, h.id)} className="flex items-center gap-2">
                    <Girdi name="ad" defaultValue={h.ad} className="!py-1" required />
                    <GonderButonu varyant="ikincil" boyut="kompakt" bekleyenMetin="…">
                      Kaydet
                    </GonderButonu>
                    {h.paraHesabiMi && <span className="text-xs text-white/40">para hesabı</span>}
                  </form>
                </td>
                <td className="px-4 py-3 text-white/60">
                  {h.grup === "ADLIYE" ? "Adliye" : h.grup === "BORCLU" ? "Borçlu" : "Müvekkil"}
                  {h.grup === "ADLIYE" ? "" : h.tutulanHesapMi ? " · tutulan" : h.paraHesabiMi ? " · para" : ""}
                </td>
                <td className="px-4 py-3 text-white/60">{h.aktifMi ? "Aktif" : "Pasif"}</td>
                <td className="px-4 py-3">
                  {!h.paraHesabiMi && (
                    <div className="flex items-center justify-end gap-2">
                      <form action={hesapAktifligiDegistir.bind(null, h.id, !h.aktifMi)}>
                        <GonderButonu varyant="ikincil" boyut="kompakt" bekleyenMetin="…">
                          {h.aktifMi ? "Pasife Al" : "Aktif Et"}
                        </GonderButonu>
                      </form>
                      <OnayliButon sifreIste eylem={hesapSil.bind(null, h.id)} mesaj={`${h.no} - ${h.ad} hesabı silinsin mi?`}>
                        Sil
                      </OnayliButon>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={hesapEkle} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-white/70" htmlFor="yeni-kod">
            Yeni Hesap Kodu
          </label>
          <Girdi id="yeni-kod" name="no" type="number" min={1} placeholder="108 / 201 / 303" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-white/70" htmlFor="yeni-ad">
            Hesap Adı
          </label>
          <Girdi id="yeni-ad" name="ad" placeholder="ör. Bilirkişi" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-white/70" htmlFor="yeni-tur">
            Hesap Türü
          </label>
          <Secim id="yeni-tur" name="tur" defaultValue="">
            <option value="">Otomatik (300 serisi tutulan, diğerleri normal)</option>
            <option value="normal">Normal (müvekkilin borcu)</option>
            <option value="tutulan">Tutulan (üçüncü kişide duran para)</option>
          </Secim>
        </div>
        <div className="flex items-end">
          <GonderButonu>+ Hesap Ekle</GonderButonu>
        </div>
      </form>
    </div>
  );
}

async function AdliyeSekmesi({ dosyaId, silmeYetkisiVar }: { dosyaId: string; silmeYetkisiVar: boolean }) {
  const satirlar = await adliyeDefteri(dosyaId);
  return (
    <div>
      <p className="mb-3 text-sm text-white/55">Büro ile mahkeme/icra dairesi arasındaki ödeme ve iadeler.</p>
      <CariDefter
        satirlar={satirlar}
        dosyaId={dosyaId}
        silmeYetkisiVar={silmeYetkisiVar}
        bosMesaj="Bu dosyada adliye ile işlenmiş bir hareket yok."
        bakiyeYorumu={(b) =>
          b > 0
            ? `Adliyede büronun ${para.format(b)} tutarında ödenmiş/bekleyen bakiyesi var.`
            : b < 0
              ? `Büro adliyeden ${para.format(-b)} fazla tahsil etmiş.`
              : "Mutabık — adliye ile bakiye yok."
        }
      />
      <h3 className="mb-2 mt-6 text-sm font-semibold text-white">Adliye Hareketi Ekle</h3>
      <AdliBirimHareketFormu action={adliBirimHareketiEkle.bind(null, dosyaId)} />
    </div>
  );
}

async function BorcluSekmesi({ dosyaId, silmeYetkisiVar }: { dosyaId: string; silmeYetkisiVar: boolean }) {
  const satirlar = await borcluDefteri(dosyaId);
  return (
    <div>
      <p className="mb-3 text-sm text-white/55">Karşı taraftan (borçludan) beklenen ve tahsil edilen tutarlar.</p>
      <CariDefter
        satirlar={satirlar}
        dosyaId={dosyaId}
        silmeYetkisiVar={silmeYetkisiVar}
        bosMesaj="Bu dosyada borçludan beklenen bir alacak yok."
        bakiyeYorumu={(b) =>
          b > 0
            ? `Borçludan tahsil edilecek ${para.format(b)} bakiye var.`
            : b < 0
              ? `Borçludan ${para.format(-b)} fazla tahsil edilmiş.`
              : "Mutabık — borçludan beklenen bakiye yok."
        }
      />
      <h3 className="mb-2 mt-6 text-sm font-semibold text-white">Borçlu Alacağı Ekle</h3>
      <KarsiTarafAlacagiFormu action={karsiTarafAlacagiEkle.bind(null, dosyaId)} />
    </div>
  );
}
