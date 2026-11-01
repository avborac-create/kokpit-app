import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { IsListesi } from "./is-listesi";

export default async function IslerSayfasi({ searchParams }: { searchParams: Promise<{ kimin?: string }> }) {
  const { kimin } = await searchParams;
  const k = await mevcutKullanici();
  const [isler, kisiler] = await Promise.all([
    prisma.is.findMany({
      orderBy: { guncellemeTarihi: "desc" },
      take: 400,
      include: { _count: { select: { yorumlar: true } }, maddeler: { select: { tamam: true } }, yardimlar: true },
    }),
    prisma.kullanici.findMany({ where: { aktifMi: true }, select: { id: true, adSoyad: true }, orderBy: { adSoyad: "asc" } }),
  ]);
  const ad = new Map(kisiler.map((x) => [x.id, x.adSoyad]));

  return (
    <div className="mx-auto max-w-3xl pt-3">
      <h1 className="text-2xl font-semibold tracking-tight text-white">İşler</h1>
      <p className="mb-5 mt-1 text-sm text-white/55">Her konu bir iştir: durumu, kontrol listesi ve yorumları vardır. Biri yazınca ya da durumu değiştirince ilgililere bildirim gider.</p>
      <IsListesi
        benimId={k?.kullaniciId ?? ""}
        tumBuro={kimin === "buro"}
        kisiler={kisiler}
        isler={isler.map((i) => ({
          id: i.id,
          baslik: i.baslik,
          durum: i.durum,
          sorumluId: i.sorumluId,
          sorumluAd: i.sorumluId ? (ad.get(i.sorumluId) ?? "—") : "Atanmadı",
          yorumSayisi: i._count.yorumlar,
          maddeToplam: i.maddeler.length,
          maddeTamam: i.maddeler.filter((m) => m.tamam).length,
          yardimBenim: i.yardimlar.some((y) => y.yardimciId === (k?.kullaniciId ?? "")),
          yardimIsteyen: ad.get(i.yardimlar.find((y) => y.yardimciId === (k?.kullaniciId ?? ""))?.isteyenId ?? "") ?? "",
          destekMi: i.yardimlar.find((y) => y.yardimciId === (k?.kullaniciId ?? ""))?.isteyenId === i.olusturanId,
          tarih: i.guncellemeTarihi.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" }),
        }))}
      />
    </div>
  );
}
