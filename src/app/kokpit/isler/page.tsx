import Link from "next/link";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { IsListesi } from "./is-listesi";
import { IsDetayi } from "./[id]/is-detayi";
import { isDetayiYukle } from "./detay-veri";
import { donemBasi } from "./hafta";
import { YanPanel } from "./yan-panel";

export default async function IslerSayfasi({ searchParams }: { searchParams: Promise<{ kimin?: string; kisi?: string; is?: string }> }) {
  const { kimin, kisi, is: seciliId } = await searchParams;
  const k = await mevcutKullanici();
  const [isler, kisiler, detay, yargiTurleri] = await Promise.all([
    prisma.is.findMany({
      orderBy: { guncellemeTarihi: "desc" },
      take: 400,
      include: { _count: { select: { yorumlar: true } }, maddeler: { select: { tamam: true } }, yardimlar: true, operasyonKayitlari: { where: { tarih: { gte: donemBasi("YIL") } }, select: { tarih: true } } },
    }),
    prisma.kullanici.findMany({ where: { aktifMi: true }, select: { id: true, adSoyad: true }, orderBy: { adSoyad: "asc" } }),
    seciliId ? isDetayiYukle(seciliId, k?.kullaniciId ?? "") : Promise.resolve(null),
    prisma.gorevYargiTuru.findMany({ orderBy: [{ sira: "asc" }, { ad: "asc" }], select: { id: true, ad: true } }),
  ]);
  const ad = new Map(kisiler.map((x) => [x.id, x.adSoyad]));
  const bugun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  // Soldaki panelde secili kisi ("buro" ya da kisi id'si); yoksa kullanicinin kendisi.
  const secili = kisi && (kisi === "buro" || kisiler.some((x) => x.id === kisi)) ? kisi : kimin === "buro" ? "buro" : (k?.kullaniciId ?? "buro");
  const kapatHref = `/kokpit/isler?kisi=${secili}`;

  return (
    <div className={`max-w-7xl pt-3 ${detay ? "xl:pr-[var(--yan-panel-w,500px)]" : ""}`}>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Görevler</h1>
      <p className="mb-5 mt-1 text-sm text-white/55">Sizden beklenen her şey burada. Görünümü (liste ya da kanban) kendiniz seçebilirsiniz; bir göreve tıklayınca sağda ayrıntısı açılır.</p>
      <IsListesi
        benimId={k?.kullaniciId ?? ""}
        secili={secili}
        kisiler={kisiler}
        yargiTurleri={yargiTurleri}
        bugun={bugun}
        seciliId={detay ? seciliId : undefined}
        isler={isler.map((i) => ({
          id: i.id,
          baslik: i.baslik,
          durum: i.durum,
          sorumluId: i.sorumluId,
          sorumluAd: i.sorumluId ? (ad.get(i.sorumluId) ?? "—") : "Atanmadı",
          atayanAd: i.olusturanId ? (ad.get(i.olusturanId) ?? "—") : "—",
          vade: i.vade ? i.vade.toISOString().slice(0, 10) : "",
          yorumSayisi: i._count.yorumlar,
          maddeToplam: i.maddeler.length,
          maddeTamam: i.maddeler.filter((m) => m.tamam).length,
          tur: i.tur,
          hedef: i.haftalikHedef ?? 0,
          periyot: i.periyot,
          zamanBaskisi: i.zamanBaskisi ?? "",
          yargiTuruId: i.yargiTuruId ?? "",
          yapilan: i.operasyonKayitlari.filter((o) => o.tarih >= donemBasi(i.periyot)).length,
          yardimBenim: i.yardimlar.some((y) => y.yardimciId === (k?.kullaniciId ?? "")),
          yardimIsteyen: ad.get(i.yardimlar.find((y) => y.yardimciId === (k?.kullaniciId ?? ""))?.isteyenId ?? "") ?? "",
          destekMi: i.yardimlar.find((y) => y.yardimciId === (k?.kullaniciId ?? ""))?.isteyenId === i.olusturanId,
          tarih: i.guncellemeTarihi.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" }),
        }))}
      />
      {detay && (
        <>
          <Link href={kapatHref} aria-label="Paneli kapat" className="fixed inset-0 z-40 bg-black/50 xl:hidden" />
          <YanPanel>
            <div className="mb-3 flex items-center justify-between">
              <Link href={kapatHref} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/75 hover:bg-white/10">
                ✕ Kapat
              </Link>
              <Link href={`/kokpit/isler/${detay.is.id}`} className="text-xs text-white/45 hover:text-white">
                Tam sayfada aç ↗
              </Link>
            </div>
            <IsDetayi key={detay.is.id} benimId={k?.kullaniciId ?? ""} kisiler={detay.kisiler} yargiTurleri={yargiTurleri} is={detay.is} kapatHref={kapatHref} />
          </YanPanel>
        </>
      )}
    </div>
  );
}
