import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { kayitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { EvrakPaneli, type EvrakKaydi } from "@/modules/cmk-dosyalari/components/evrak-paneli";

const tarihSaat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

type Satir = { anahtar: string; hedef: "cmk" | "dava"; id: string; baslik: string; alt: string; tarih: Date };

// Duruşma Dosyaları: duruşma tarihi yaklaşan (ya da son 7 günde geçen) dosyalar;
// seçilen dosyanın evrakları solda klasör ağacı, sağda önizleme olarak açılır.
export default async function DurusmaDosyalariSayfasi({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  if (!(await modulErisimiVarMi("avukat"))) redirect("/kokpit");
  const { d } = await searchParams;
  const kullanici = await mevcutKullanici();
  const baslangic = new Date();
  baslangic.setDate(baslangic.getDate() - 7);

  const [davalar, cmkler] = await Promise.all([
    prisma.davaDosyasi.findMany({
      where: { durusmaTarihi: { gte: baslangic } },
      select: { id: true, kayitNo: true, dosyaNo: true, birimAdi: true, konu: true, durusmaTarihi: true },
    }),
    prisma.cMKDosyasi.findMany({
      where: { durusmaTarihi: { gte: baslangic } },
      select: { id: true, adSoyad: true, dosyaNo: true, birim: true, suc: true, durusmaTarihi: true },
    }),
  ]);

  const satirlar: Satir[] = [
    ...davalar.map((x) => ({
      anahtar: `dava:${x.id}`,
      hedef: "dava" as const,
      id: x.id,
      baslik: `${kayitNoGoster(x.kayitNo)} · ${x.dosyaNo ?? "Esas no yok"}`,
      alt: [x.birimAdi, x.konu].filter(Boolean).join(" — "),
      tarih: x.durusmaTarihi!,
    })),
    ...cmkler.map((x) => ({
      anahtar: `cmk:${x.id}`,
      hedef: "cmk" as const,
      id: x.id,
      baslik: `CMK · ${x.dosyaNo}`,
      alt: [x.birim, x.suc].filter(Boolean).join(" — "),
      tarih: x.durusmaTarihi!,
    })),
  ].sort((a, b) => a.tarih.getTime() - b.tarih.getTime());

  const secili = satirlar.find((s) => s.anahtar === d) ?? satirlar[0] ?? null;

  let kayitlar: EvrakKaydi[] = [];
  if (secili) {
    const evraklar = await prisma.cMKEvrak.findMany({
      // Başka avukatların "avukata özel" evrakları hiç çekilmez.
      where: {
        ...(secili.hedef === "dava" ? { davaDosyasiId: secili.id } : { cmkDosyasiId: secili.id }),
        OR: [{ ozelKullaniciId: null }, { ozelKullaniciId: kullanici?.kullaniciId ?? "-" }],
      },
      select: { id: true, ad: true, klasor: true, evrakTarihi: true, mimeTipi: true, boyutBayt: true, onizlemeTuru: true, ozelKullaniciId: true },
    });
    kayitlar = evraklar.map(({ ozelKullaniciId, ...e }) => ({
      ...e,
      ozel: ozelKullaniciId !== null,
      evrakTarihi: e.evrakTarihi ? e.evrakTarihi.toISOString().slice(0, 10) : null,
      onizlemeTuru: e.onizlemeTuru as EvrakKaydi["onizlemeTuru"],
    }));
  }

  return (
    <div className="pt-3">
      <Link href="/kokpit/avukat" className="text-sm text-white/50 hover:text-white">← Avukat</Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold tracking-tight text-white">Duruşma Dosyaları</h1>
      <p className="mb-4 text-sm text-white/55">Duruşması yaklaşan dosyaların evrakları; ana evrak ve ekleri klasörler halinde, önizlemeli.</p>

      {satirlar.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-center text-white/40">Duruşma tarihi girilmiş yaklaşan dosya yok.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2">
            {satirlar.map((s) => {
              const aktif = s.anahtar === secili?.anahtar;
              return (
                <Link
                  key={s.anahtar}
                  href={`/kokpit/avukat/durusma-dosyalari?d=${encodeURIComponent(s.anahtar)}`}
                  className={`glass block rounded-2xl border-l-4 px-4 py-3 transition-colors hover:bg-white/[0.06] ${aktif ? "bg-white/[0.06]" : ""}`}
                  style={{ borderLeftColor: aktif ? "#e5373d" : "transparent" }}
                >
                  <p className="text-sm font-medium text-white">
                    {tarihSaat.format(s.tarih)} <span className="ml-2 text-[#6db8ff]">{s.baslik}</span>
                  </p>
                  <p className="text-xs text-white/55">{s.alt}</p>
                </Link>
              );
            })}
          </div>
          {secili && (
            <div>
              {/* Aşağı kaydırınca hangi dosyanın evrakları içinde olunduğu hep görünsün. */}
              <div className="sticky top-0 z-30 -mx-3 mb-3 border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--background-2)_95%,transparent)] px-3 py-2 backdrop-blur-md md:-mx-6 md:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#e5373d]">Açık dosya</p>
                <p className="text-sm font-medium text-white">
                  {secili.baslik} <span className="text-white/50">· {tarihSaat.format(secili.tarih)}</span>
                </p>
                <p className="truncate text-xs text-white/55">{secili.alt}</p>
              </div>
              <EvrakPaneli key={secili.anahtar} dosyaId={secili.id} evraklar={kayitlar} hedef={secili.hedef} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
