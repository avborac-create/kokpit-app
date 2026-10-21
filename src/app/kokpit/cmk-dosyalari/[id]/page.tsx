import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { cmkDosyasiGetir } from "@/modules/cmk-dosyalari/lib/queries";
import { DOSYA_DURUMU_ETIKETLERI } from "@/modules/cmk-dosyalari/lib/sabitler";
import { EvrakPaneli, type EvrakKaydi } from "@/modules/cmk-dosyalari/components/evrak-paneli";

export default async function CMKDosyasiSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dosya = await cmkDosyasiGetir(id);
  if (!dosya) notFound();

  const evraklar = await prisma.cMKEvrak.findMany({
    where: { cmkDosyasiId: id },
    select: { id: true, ad: true, klasor: true, evrakTarihi: true, mimeTipi: true, boyutBayt: true, onizlemeTuru: true },
  });
  const kayitlar: EvrakKaydi[] = evraklar.map((e) => ({
    ...e,
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
      {dosya.notlar && <p className="glass mb-4 whitespace-pre-line rounded-2xl p-4 text-sm text-white/70">{dosya.notlar}</p>}
      <h2 className="mb-2 text-sm font-semibold text-white">Dosya Evrakları</h2>
      <EvrakPaneli dosyaId={id} evraklar={kayitlar} />
    </div>
  );
}
