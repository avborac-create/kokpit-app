import Link from "next/link";
import { prisma } from "@/core/db/prisma";
import { Dugme } from "@/core/ui/button";
import { SecenekDuzenleyiciPenceresi } from "@/core/secenek/secenek-duzenleyici-penceresi";
import { CariDefter } from "@/modules/dava-dosyasi/components/cari-defter";
import { MasrafFormu } from "@/modules/dava-dosyasi/components/masraf-formu";
import { MasrafListesi } from "@/modules/dava-dosyasi/components/masraf-listesi";
import { AdliBirimHareketFormu } from "@/modules/dava-dosyasi/components/adli-birim-hareket-formu";
import { KarsiTarafAlacagiFormu } from "@/modules/dava-dosyasi/components/karsi-taraf-alacagi-formu";
import { DagitimFormu } from "@/modules/dava-dosyasi/components/ekonomi/dagitim-formu";
import { ParaGirisiFormu, TahakkukFormu } from "@/modules/dava-dosyasi/components/ekonomi/ekonomi-formlari";
import { adliyeDefteri, borcluDefteri } from "@/modules/dava-dosyasi/lib/cari-defter";
import {
  HARCAMA_KODU,
  ekonomiHesapla,
  havuzDefteri,
  kodDefteri,
  secenekListesiTumDegerlerle,
  type DosyaEkonomisi,
} from "@/modules/dava-dosyasi/lib/dosya-ekonomisi";
import {
  paraGirisiEkle,
  paraDagit,
  cariTahakkukEkle,
} from "@/modules/dava-dosyasi/lib/dosya-ekonomisi-actions";
import {
  dosyaMasrafiEkle,
  adliBirimHareketiEkle,
  karsiTarafAlacagiEkle,
} from "@/modules/dava-dosyasi/lib/actions";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarih = new Intl.DateTimeFormat("tr-TR");

// Cari kod sekmesi etiketi: masraf hesabi kullanicinin dilinde "Harcamalar".
const SEKME_ETIKETI: Record<string, string> = { [HARCAMA_KODU]: "Harcamalar" };

const bakiyeRenk = (b: number) => (b > 0 ? "text-[#ff7a70]" : b < 0 ? "text-[#32d74b]" : "text-white/60");

function BakiyeMetni({ bakiye }: { bakiye: number }) {
  return (
    <span className={bakiyeRenk(bakiye)}>
      {para.format(Math.abs(bakiye))}
      {bakiye > 0 ? " (B)" : bakiye < 0 ? " (A)" : ""}
    </span>
  );
}

function OzetKarti({ baslik, children, vurgu }: { baslik: string; children: React.ReactNode; vurgu?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${vurgu ? "border-[#6db8ff]/40 bg-[#6db8ff]/[0.06]" : "border-white/10 bg-white/[0.02]"}`}>
      <p className="text-xs text-white/45">{baslik}</p>
      <p className="mt-1 text-lg font-semibold text-white">{children}</p>
    </div>
  );
}

export type EkonomiAgacDosyasi = { id: string; no: string; konu: string };

export async function EkonomiPaneli({
  dosyaId,
  alt,
  silmeYetkisiVar,
  agacDosyalari,
}: {
  dosyaId: string;
  alt: string;
  silmeYetkisiVar: boolean;
  agacDosyalari: EkonomiAgacDosyasi[];
}) {
  const ekonomi = await ekonomiHesapla([dosyaId]);
  const kodSekmesi = ekonomi.kodlar.find((k) => k.kod === alt);
  const aktif = kodSekmesi ? alt : ["ozet", "havuz", "adliye", "borclu"].includes(alt) ? alt : "ozet";
  const href = (a: string) => `/kokpit/dava-dosyalari/${dosyaId}?sekme=ekonomi&alt=${a}`;

  const sekmeler: { anahtar: string; etiket: string; rozet?: string }[] = [
    { anahtar: "ozet", etiket: "Özet" },
    {
      anahtar: "havuz",
      etiket: "101 Havuz",
      rozet: ekonomi.havuzKalan > 0 ? para.format(ekonomi.havuzKalan) : undefined,
    },
    ...ekonomi.kodlar.map((k) => ({
      anahtar: k.kod,
      etiket: `${k.hesapNo} ${SEKME_ETIKETI[k.kod] ?? k.etiket}`,
      rozet: k.bakiye !== 0 ? para.format(Math.abs(k.bakiye)) : undefined,
    })),
    { anahtar: "adliye", etiket: "Adliye" },
    { anahtar: "borclu", etiket: "Borçlu" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">Dosya Ekonomisi</h2>

      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-white/[0.08] pb-3">
        {sekmeler.map((s) => {
          const secili = s.anahtar === aktif;
          return (
            <Link
              key={s.anahtar}
              href={href(s.anahtar)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                secili
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                  : "border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {s.etiket}
              {s.rozet && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">{s.rozet}</span>
              )}
            </Link>
          );
        })}
      </div>

      {aktif === "ozet" && <OzetSekmesi ekonomi={ekonomi} dosyaId={dosyaId} agacDosyalari={agacDosyalari} />}
      {aktif === "havuz" && <HavuzSekmesi ekonomi={ekonomi} dosyaId={dosyaId} silmeYetkisiVar={silmeYetkisiVar} />}
      {kodSekmesi && aktif === kodSekmesi.kod && (
        <KodSekmesi ekonomi={ekonomi} kodId={kodSekmesi.kodId} dosyaId={dosyaId} silmeYetkisiVar={silmeYetkisiVar} />
      )}
      {aktif === "adliye" && <AdliyeSekmesi dosyaId={dosyaId} silmeYetkisiVar={silmeYetkisiVar} />}
      {aktif === "borclu" && <BorcluSekmesi dosyaId={dosyaId} silmeYetkisiVar={silmeYetkisiVar} />}
    </div>
  );
}

async function OzetSekmesi({
  ekonomi,
  dosyaId,
  agacDosyalari,
}: {
  ekonomi: DosyaEkonomisi;
  dosyaId: string;
  agacDosyalari: EkonomiAgacDosyasi[];
}) {
  const agac =
    agacDosyalari.length > 0
      ? await Promise.all(agacDosyalari.map(async (d) => ({ ...d, ekonomi: await ekonomiHesapla([d.id]) })))
      : [];
  const agacToplam = agac.reduce((t, d) => t + d.ekonomi.net, 0);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <OzetKarti baslik="Toplam Borç (müvekkilin ödemesi gereken)">{para.format(ekonomi.toplamBorc)}</OzetKarti>
        <OzetKarti baslik="Koda Dağıtılmış (Alacak)">{para.format(ekonomi.toplamAlacak)}</OzetKarti>
        <OzetKarti baslik="Havuzda Bekleyen Para">{para.format(ekonomi.havuzKalan)}</OzetKarti>
        <OzetKarti baslik={ekonomi.net > 0 ? "Müvekkilin Bize Borcu" : ekonomi.net < 0 ? "Müvekkil Lehine Fazla" : "Net Durum"} vurgu>
          <span className={bakiyeRenk(ekonomi.net)}>{para.format(Math.abs(ekonomi.net))}</span>
        </OzetKarti>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Cari Kod</th>
              <th className="px-4 py-3 text-right font-medium">Borç</th>
              <th className="px-4 py-3 text-right font-medium">Alacak</th>
              <th className="px-4 py-3 text-right font-medium">Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {ekonomi.kodlar.map((k) => (
              <tr key={k.kodId} className="border-t border-white/[0.06]">
                <td className="px-4 py-3">
                  <Link
                    href={`/kokpit/dava-dosyalari/${dosyaId}?sekme=ekonomi&alt=${k.kod}`}
                    className="text-white/85 hover:text-[#6db8ff] hover:underline"
                  >
                    {SEKME_ETIKETI[k.kod] ?? k.etiket}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-white/85">{k.borc ? para.format(k.borc) : "—"}</td>
                <td className="px-4 py-3 text-right text-white/85">{k.alacak ? para.format(k.alacak) : "—"}</td>
                <td className="px-4 py-3 text-right font-medium">
                  <BakiyeMetni bakiye={k.bakiye} />
                </td>
              </tr>
            ))}
            <tr className="border-t border-white/[0.06]">
              <td className="px-4 py-3 text-white/85">
                <Link
                  href={`/kokpit/dava-dosyalari/${dosyaId}?sekme=ekonomi&alt=havuz`}
                  className="hover:text-[#6db8ff] hover:underline"
                >
                  Havuz (dağıtım bekleyen)
                </Link>
              </td>
              <td className="px-4 py-3 text-right text-white/40">—</td>
              <td className="px-4 py-3 text-right text-white/85">{ekonomi.havuzKalan ? para.format(ekonomi.havuzKalan) : "—"}</td>
              <td className="px-4 py-3 text-right text-white/40">—</td>
            </tr>
            <tr className="border-t border-white/10 font-medium">
              <td className="px-4 py-3 text-white">Toplam</td>
              <td className="px-4 py-3 text-right text-white">{para.format(ekonomi.toplamBorc)}</td>
              <td className="px-4 py-3 text-right text-white">{para.format(ekonomi.toplamAlacak + ekonomi.havuzKalan)}</td>
              <td className="px-4 py-3 text-right">
                <BakiyeMetni bakiye={ekonomi.net} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-white/35">
        (B) = müvekkil büroya borçlu, (A) = müvekkilin fazla ödemesi / bekleyen parası. Bakiye = Borç − Alacak.
      </p>

      {agac.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-white">Ana Dosya + Alt Dosyalar</h3>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Dosya</th>
                  <th className="px-4 py-3 font-medium">Konu</th>
                  <th className="px-4 py-3 text-right font-medium">Net Durum</th>
                </tr>
              </thead>
              <tbody>
                {agac.map((d) => (
                  <tr key={d.id} className="border-t border-white/[0.06]">
                    <td className="px-4 py-3 font-medium text-white">
                      {d.id === dosyaId ? (
                        d.no
                      ) : (
                        <Link href={`/kokpit/dava-dosyalari/${d.id}?sekme=ekonomi`} className="hover:text-[#6db8ff] hover:underline">
                          {d.no}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">{d.konu}</td>
                    <td className="px-4 py-3 text-right">
                      <BakiyeMetni bakiye={d.ekonomi.net} />
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-white/10 font-medium">
                  <td className="px-4 py-3 text-white" colSpan={2}>
                    Toplam
                  </td>
                  <td className="px-4 py-3 text-right">
                    <BakiyeMetni bakiye={agacToplam} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

async function HavuzSekmesi({
  ekonomi,
  dosyaId,
  silmeYetkisiVar,
}: {
  ekonomi: DosyaEkonomisi;
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  const satirlar = await havuzDefteri(dosyaId, ekonomi.kodlar);
  const toplamGelen = ekonomi.havuz.reduce((t, h) => t + h.tutar, 0);
  return (
    <div>
      <p className="mb-3 text-sm text-white/55">
        101 · Havuz: müvekkilden gelen para önce buraya (Alacak) girer; henüz hiçbir cari koda ait değildir. Hesaplara
        yaptığınız virman burada Borç, hedef hesapta Alacak olarak görünür.
      </p>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OzetKarti baslik="Toplam Gelen (Alacak)">{para.format(toplamGelen)}</OzetKarti>
        <OzetKarti baslik="Hesaplara Virman (Borç)">{para.format(toplamGelen - ekonomi.havuzKalan)}</OzetKarti>
        <OzetKarti baslik="Havuz Bakiyesi (dağıtım bekleyen)" vurgu>
          {para.format(ekonomi.havuzKalan)}
        </OzetKarti>
      </div>

      <CariDefter
        satirlar={satirlar}
        dosyaId={dosyaId}
        silmeYetkisiVar={silmeYetkisiVar}
        tersBakiye
        bosMesaj="Bu dosya için henüz para girişi yok."
        bakiyeYorumu={(b) =>
          b > 0 ? `Havuzda dağıtım bekleyen ${para.format(b)} var.` : "Havuzdaki paranın tamamı dağıtıldı."
        }
      />

      <h3 className="mb-2 mt-6 text-sm font-semibold text-white">+ Para Geldi (cari kod sorulmaz)</h3>
      <ParaGirisiFormu action={paraGirisiEkle.bind(null, dosyaId)} />

      <h3 className="mb-2 mt-6 text-sm font-semibold text-white">⇄ Virman: Havuzdan Hesaba Aktar</h3>
      <DagitimFormu
        action={paraDagit.bind(null, dosyaId)}
        girisler={ekonomi.havuz.map((h) => ({
          id: h.id,
          kalan: h.kalan,
          etiket: `${tarih.format(h.tarih)} · ${para.format(h.tutar)} (kalan ${para.format(h.kalan)})`,
        }))}
        cariKodlar={ekonomi.kodlar.map((k) => ({
          id: k.kodId,
          etiket: `${k.hesapNo} ${SEKME_ETIKETI[k.kod] ?? k.etiket}`,
        }))}
      />
    </div>
  );
}

async function KodSekmesi({
  ekonomi,
  kodId,
  dosyaId,
  silmeYetkisiVar,
}: {
  ekonomi: DosyaEkonomisi;
  kodId: string;
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  const kod = ekonomi.kodlar.find((k) => k.kodId === kodId)!;
  const harcamaMi = kod.kod === HARCAMA_KODU;
  const etiket = SEKME_ETIKETI[kod.kod] ?? kod.etiket;
  const satirlar = await kodDefteri(dosyaId, kodId, kod.kod);

  // Masraf turu acilir menusunu yonetici bu ekrandan ayrilmadan duzenleyebilir.
  const turListesi = harcamaMi && silmeYetkisiVar ? await secenekListesiTumDegerlerle("masraf_turu") : null;
  const tumMasraflar = harcamaMi
    ? (
        await prisma.dosyaMasrafi.findMany({
          where: { dosyaId },
          include: { cariKod: true, tur: true },
          orderBy: { tarih: "desc" },
        })
      ).map((m) => ({
        ...m,
        tutar: Number(m.tutar),
        cariKod: { ...m.cariKod, maktuTutar: null },
        tur: { ...m.tur, maktuTutar: null },
      }))
    : [];

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OzetKarti baslik={`${etiket} — Borç`}>{para.format(kod.borc)}</OzetKarti>
        <OzetKarti baslik={`${etiket} — Alacak (ödenen)`}>{para.format(kod.alacak)}</OzetKarti>
        <OzetKarti baslik="Bakiye" vurgu>
          <BakiyeMetni bakiye={kod.bakiye} />
        </OzetKarti>
      </div>

      <CariDefter
        satirlar={satirlar}
        dosyaId={dosyaId}
        silmeYetkisiVar={silmeYetkisiVar}
        bosMesaj={`${etiket} hesabında henüz hareket yok.`}
        bakiyeYorumu={(b) =>
          b > 0
            ? `Müvekkilin bu hesapta ${para.format(b)} borcu var.`
            : b < 0
              ? `Müvekkil bu hesaba ${para.format(-b)} fazla ödemiş.`
              : "Mutabık — bu hesapta bakiye yok."
        }
      />

      <h3 className="mb-2 mt-6 text-sm font-semibold text-white">
        {harcamaMi ? "Masraf Ekle" : "Borç Ekle"}
      </h3>
      {harcamaMi ? (
        <>
          <MasrafFormu
            action={dosyaMasrafiEkle.bind(null, dosyaId)}
            varsayilanCariKod={HARCAMA_KODU}
            turDuzenleyici={
              turListesi ? (
                <SecenekDuzenleyiciPenceresi listeId={turListesi.id} baslik="Masraf Türü" degerler={turListesi.degerler} />
              ) : undefined
            }
          />
          <div className="mt-3">
            <Link href={`/kokpit/dava-dosyalari/${dosyaId}/masraf-aktar`}>
              <Dugme varyant="ikincil">Excel&apos;den masraf aktar</Dugme>
            </Link>
          </div>
        </>
      ) : (
        <TahakkukFormu
          action={cariTahakkukEkle.bind(null, dosyaId)}
          cariKodId={kodId}
          dayanakIpucu={kod.kod === "akdi_vekalet_hesabi" ? "ör. dosyanın hizmet bedeli" : undefined}
        />
      )}

      <h3 className="mb-2 mt-6 text-sm font-semibold text-white">Havuzdan Bu Hesaba Aktar (Alacak)</h3>
      <DagitimFormu
        action={paraDagit.bind(null, dosyaId)}
        varsayilanKodId={kodId}
        girisler={ekonomi.havuz.map((h) => ({
          id: h.id,
          kalan: h.kalan,
          etiket: `${tarih.format(h.tarih)} · ${para.format(h.tutar)} (kalan ${para.format(h.kalan)})`,
        }))}
        cariKodlar={ekonomi.kodlar.map((k) => ({ id: k.kodId, etiket: SEKME_ETIKETI[k.kod] ?? k.etiket }))}
      />

      {harcamaMi && tumMasraflar.length > 0 && (
        <details className="mt-6 rounded-2xl border border-white/10 p-4">
          <summary className="cursor-pointer text-sm text-white/70">
            Tüm masraf kayıtları ve yansıtma ayarı (Müvekkil / Büro / Borçlu)
          </summary>
          <div className="mt-4">
            <MasrafListesi masraflar={tumMasraflar} dosyaId={dosyaId} silmeYetkisiVar={silmeYetkisiVar} />
          </div>
        </details>
      )}
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
