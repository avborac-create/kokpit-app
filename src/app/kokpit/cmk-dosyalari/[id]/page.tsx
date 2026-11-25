import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { cmkDosyasiGetir } from "@/modules/cmk-dosyalari/lib/queries";
import { DOSYA_DURUMU_ETIKETLERI } from "@/modules/cmk-dosyalari/lib/sabitler";
import { MuvekkilBilgileri } from "@/modules/cmk-dosyalari/components/muvekkil-bilgileri";
import { EvrakPaneli, type EvrakKaydi } from "@/modules/cmk-dosyalari/components/evrak-paneli";

/** Not satirlarini "ETIKET: metin" diye ayirir; etiketsiz satirlar duz metin kalir. */
function notSatirlari(notlar: string) {
  return notlar
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^([A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9 /.\-]{1,30}?(?: \([^)]{1,25}\))?):\s+(.*)$/);
      return m ? { etiket: m[1], metin: m[2] } : { etiket: "", metin: s };
    });
}

function DosyaOzeti({ notlar }: { notlar: string }) {
  const satirlar = notSatirlari(notlar);
  return (
    <details className="glass mb-4 rounded-2xl text-sm text-white/75">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white/90 hover:bg-white/5">
        <span className="font-medium">Dosya özeti</span>
        <span className="text-xs text-white/45">{satirlar.length} başlık · açmak/kapatmak için tıklayın</span>
      </summary>
      <dl className="max-h-[50vh] space-y-2 overflow-y-auto px-4 pb-4 pt-1">
        {satirlar.map((s, i) => (
          <div key={i} className="grid gap-x-3 border-t border-white/10 pt-2 sm:grid-cols-[11rem_1fr]">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#6db8ff]">{s.etiket}</dt>
            <dd className="leading-relaxed">{s.metin}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export default async function CMKDosyasiSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dosya = await cmkDosyasiGetir(id);
  if (!dosya) notFound();

  const kullanici = await mevcutKullanici();
  const evraklar = await prisma.cMKEvrak.findMany({
    // Baska avukatlarin "avukata ozel" evraklari hic cekilmez.
    where: { cmkDosyasiId: id, OR: [{ ozelKullaniciId: null }, { ozelKullaniciId: kullanici?.kullaniciId ?? "-" }] },
    select: { id: true, ad: true, klasor: true, evrakTarihi: true, mimeTipi: true, boyutBayt: true, onizlemeTuru: true, ozelKullaniciId: true },
  });
  const nufusKisileri = await prisma.cMKNufusKisisi.findMany({ where: { cmkDosyasiId: id }, orderBy: [{ sira: "asc" }, { createdAt: "asc" }] });
  const kayitlar: EvrakKaydi[] = evraklar.map(({ ozelKullaniciId, ...e }) => ({
    ...e,
    ozel: ozelKullaniciId !== null,
    evrakTarihi: e.evrakTarihi ? e.evrakTarihi.toISOString().slice(0, 10) : null,
    onizlemeTuru: e.onizlemeTuru as EvrakKaydi["onizlemeTuru"],
  }));

  return (
    <div className="pt-3">
      <Link href="/kokpit/cmk-dosyalari" className="text-sm text-[#6db8ff] hover:underline">
        ‹ CMK Dosyaları
      </Link>
      <div className="mb-5 mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{dosya.adSoyad}</h1>
          <p className="mt-1 text-sm text-white/55">
            {dosya.birim} · {dosya.dosyaNo} — {dosya.suc}
          </p>
          {dosya.tckn && <p className="mt-1 text-sm text-white/55">TCKN: <span className="select-all font-mono text-white/80">{dosya.tckn}</span></p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
            {DOSYA_DURUMU_ETIKETLERI[dosya.dosyaDurumu]}
          </span>
          <Link href={`/kokpit/cmk-dosyalari/${id}/duzenle`} className="text-sm text-[#6db8ff] hover:underline">
            Dosya bilgilerini düzenle
          </Link>
        </div>
      </div>
      <MuvekkilBilgileri dosyaId={id} kisiler={nufusKisileri} nufusNotu={dosya.nufusNotu} />
      {dosya.notlar && <DosyaOzeti notlar={dosya.notlar} />}
      <EvrakPaneli dosyaId={id} evraklar={kayitlar} />
    </div>
  );
}
