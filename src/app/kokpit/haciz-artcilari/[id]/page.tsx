import Link from "next/link";
import { notFound } from "next/navigation";
import { hacizRaporuGetir } from "@/modules/haciz-raporu/lib/queries";
import {
  HACIZ_ISLEMI_DURUMU_ETIKETLERI,
  TEMINAT_MUVAFAKAT_ETIKETLERI,
  BELGE_DOSYA_ADLARI,
} from "@/modules/haciz-raporu/lib/sabitler";
import { HacizRaporuSilmeButonu } from "@/modules/haciz-raporu/components/haciz-raporu-silme-butonu";
import { Dugme } from "@/core/ui/button";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { hacizAvukatiMi } from "@/core/auth/yetki";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export default async function HacizRaporuDetaySayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rapor, kullanici] = await Promise.all([hacizRaporuGetir(id), mevcutKullanici()]);
  if (!rapor) notFound();

  const silmeYetkisiVar = Boolean(kullanici && hacizAvukatiMi(kullanici.rol));

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Haciz Raporu — {tarihFormatlayici.format(rapor.hacizTarihi)}
          </h1>
          <p className="mt-1 text-sm text-white/55">
            {rapor.davaDosyasi.dosyaNo ? `${rapor.davaDosyasi.dosyaNo} — ` : ""}
            {rapor.davaDosyasi.konu}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/kokpit/haciz-artcilari/${id}/indir`}>
            <Dugme>İndir (ZIP)</Dugme>
          </Link>
          {silmeYetkisiVar && <HacizRaporuSilmeButonu raporId={id} />}
        </div>
      </div>

      <div className="glass mb-6 grid grid-cols-2 gap-4 rounded-2xl p-5 text-sm md:grid-cols-4">
        <div>
          <p className="text-white/45">Avukat</p>
          <p className="text-white">{rapor.avukat.adSoyad}</p>
        </div>
        <div>
          <p className="text-white/45">Müvekkil(ler)</p>
          <p className="text-white">
            {rapor.davaDosyasi.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—"}
          </p>
        </div>
        <div>
          <p className="text-white/45">Tahsilat</p>
          <p className="text-white">{paraFormatlayici.format(Number(rapor.tahsilatMiktari))}</p>
        </div>
        <div>
          <p className="text-white/45">Tahsilat Kanalı</p>
          <p className="text-white">{rapor.tahsilatKanali?.etiket ?? "—"}</p>
        </div>
      </div>

      <div className="glass mb-6 rounded-2xl p-5 text-sm">
        <h2 className="mb-3 font-medium text-white/70">İşlem Bilgileri</h2>
        <p className="mb-1 text-white/85">
          <span className="text-white/45">İşlem Yapılan Borçlular: </span>
          {rapor.islemYapilanBorclular}
        </p>
        <p className="mb-3 text-white/85">
          <span className="text-white/45">İrtibat Numaraları: </span>
          {rapor.irtibatNumaralari.length > 0 ? rapor.irtibatNumaralari.join(", ") : "—"}
        </p>
        <div className="grid grid-cols-3 gap-4">
          <p>
            <span className="text-white/45">Muhafaza: </span>
            {HACIZ_ISLEMI_DURUMU_ETIKETLERI[rapor.muhafazaDurumu]}
          </p>
          <p>
            <span className="text-white/45">İstihkak: </span>
            {HACIZ_ISLEMI_DURUMU_ETIKETLERI[rapor.istihkakDurumu]}
          </p>
          <p>
            <span className="text-white/45">Kıymet Takdiri: </span>
            {HACIZ_ISLEMI_DURUMU_ETIKETLERI[rapor.kiymetTakdiriDurumu]}
          </p>
        </div>
        <p className="mt-3 text-white/85">
          <span className="text-white/45">Teminat İadesine Muvafakat: </span>
          {TEMINAT_MUVAFAKAT_ETIKETLERI[rapor.teminatIadesineMuvafakat]}
        </p>
        <p className="mt-1 text-white/85">
          <span className="text-white/45">Protokol: </span>
          {rapor.protokolYapildiMi ? "Yapıldı" : "Protokol Yapılmadı"}
        </p>
        {rapor.avukatGorusu && (
          <p className="mt-3 whitespace-pre-wrap text-white/85">
            <span className="text-white/45">Avukat Görüşü: </span>
            {rapor.avukatGorusu}
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-5 text-sm">
        <h2 className="mb-3 font-medium text-white/70">Yüklenen Belgeler</h2>
        {rapor.belgeler.length === 0 ? (
          <p className="text-white/40">Hiç belge yüklenmemiş.</p>
        ) : (
          <ul className="space-y-1">
            {rapor.belgeler.map((belge) => (
              <li key={belge.id} className="text-white/70">
                {belge.tur === "FOTOGRAF" ? belge.adOnerisi : BELGE_DOSYA_ADLARI[belge.tur]}
                <span className="text-white/35"> ({Math.round(belge.boyutBayt / 1024)} KB)</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
