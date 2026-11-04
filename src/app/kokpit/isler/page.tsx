import Link from "next/link";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { IsListesi } from "./is-listesi";
import { IsDetayi } from "./[id]/is-detayi";
import { isDetayiYukle } from "./detay-veri";
import { donemBasi } from "./hafta";
import { YanPanel } from "./yan-panel";
import { OdakKutusu } from "./odak-kutusu";
import { ekonomiDuzenleyebilirMi } from "@/core/auth/finans-yetki";
import { sistemYoneticisiMi } from "@/core/auth/yetki";

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
  const odaklar = await prisma.isOdagi.findMany({
    where: { kullaniciId: k?.kullaniciId ?? "-", is: { durum: { not: "TAMAMLANDI" } } },
    orderBy: { tarih: "asc" },
    include: { is: { select: { id: true, baslik: true, durum: true, tur: true, vade: true, sorumluId: true, maddeler: { select: { tamam: true } } } } },
  });
  const odakIdleri = new Set(odaklar.map((o) => o.isId));
  // Serbest meslek makbuzu (SMM) kesme uyarilari yalniz gorevin atandigi finans yetkilisine gorunur.
  const hepsiniGorur = await ekonomiDuzenleyebilirMi();
  const smmTum = await prisma.is.findMany({
    where: { kaynak: { startsWith: "smm:" }, durum: { not: "TAMAMLANDI" } },
    orderBy: { olusturmaTarihi: "asc" },
    select: { id: true, baslik: true, kaynak: true, sorumluId: true },
  });
  const smmIsleri = smmTum.filter((i) => i.sorumluId === k?.kullaniciId);
  // Yonetici icin "Delegasyon": baskasina devredilen makbuz isleri; gorev sayisina eklenmez, onay kutusu yoktur.
  const delegasyonlar = k && sistemYoneticisiMi(k.rol) ? smmTum.filter((i) => i.sorumluId !== k.kullaniciId) : [];
  const smmUyarilari = smmIsleri.map((i) => ({ id: i.id, baslik: i.baslik.replace(/^SMM kesilecek:\s*/, ""), dosyaId: (i.kaynak ?? "").split(":")[1] ?? "" }));
  const bugun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  // Eksi bakiye hatirlatmalari: ertelenenler (vade ileri bir tarihte) tarih gelene kadar listede gorunmez.
  const eksiIsleri = await prisma.is.findMany({
    where: { kaynak: { startsWith: "eksi:" }, durum: { not: "TAMAMLANDI" }, ...(hepsiniGorur ? {} : { sorumluId: k?.kullaniciId ?? "-" }) },
    orderBy: { olusturmaTarihi: "asc" },
    select: { id: true, baslik: true, kaynak: true, vade: true },
  });
  const eksiUyarilari = eksiIsleri
    .filter((i) => !i.vade || i.vade.toISOString().slice(0, 10) <= bugun)
    .map((i) => ({ id: i.id, baslik: i.baslik.replace(/^Müvekkilden bakiye istenecek:\s*/, ""), dosyaId: (i.kaynak ?? "").split(":")[1] ?? "" }));
  const eksiErtelenen = eksiIsleri.length - eksiUyarilari.length;
  // Soldaki panelde secili kisi ("buro" ya da kisi id'si); yoksa kullanicinin kendisi.
  const secili = kisi && (kisi === "buro" || kisiler.some((x) => x.id === kisi)) ? kisi : kimin === "buro" ? "buro" : (k?.kullaniciId ?? "buro");
  const kapatHref = `/kokpit/isler?kisi=${secili}`;

  return (
    <div className={`max-w-7xl pt-3 ${detay ? "xl:pr-[var(--yan-panel-w,500px)]" : ""}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Görevler</h1>
        {k && sistemYoneticisiMi(k.rol) && (
          <Link href="/kokpit/isler/yonetim" className="ml-auto rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/15 px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent)]/25">
            Görev Yönetimi (yönetici)
          </Link>
        )}
      </div>
      <p className="mb-5 mt-1 text-sm text-white/55">Sizden beklenen her şey burada. Görünümü (liste ya da kanban) kendiniz seçebilirsiniz; bir göreve tıklayınca sağda ayrıntısı açılır.</p>
      <OdakKutusu
        bugun={bugun}
        kartlar={odaklar.map((o) => ({ id: o.is.id, baslik: o.is.baslik, durum: o.is.durum, tur: o.is.tur, vade: o.is.vade ? o.is.vade.toISOString().slice(0, 10) : "", maddeToplam: o.is.maddeler.length, maddeTamam: o.is.maddeler.filter((m) => m.tamam).length, sorumluAd: o.is.sorumluId ? (ad.get(o.is.sorumluId) ?? "—") : "Atanmadı" }))}
      />
      {delegasyonlar.length > 0 && (
        <section aria-label="Delegasyon" className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          <p className="font-semibold text-white/85">Delegasyon <span className="ml-1 rounded-full bg-white/10 px-2 text-xs font-normal">{delegasyonlar.length}</span></p>
          <p className="mt-0.5 text-xs text-white/50">
            {ad.get(delegasyonlar[0].sorumluId ?? "") ?? "Finans yetkilisi"} adına devredildi; serbest meslek makbuzu kesilmesi bekleniyor. Bu bir göreviniz değildir.
          </p>
          <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-white/60">
            {delegasyonlar.map((i) => (
              <li key={i.id}>• {i.baslik.replace(/^SMM kesilecek:s*/, "")}</li>
            ))}
          </ul>
        </section>
      )}
      <IsListesi
        odakIdleri={[...odakIdleri]}
        benimId={k?.kullaniciId ?? ""}
        secili={secili}
        kisiler={kisiler}
        yargiTurleri={yargiTurleri}
        bugun={bugun}
        smmUyarilari={smmUyarilari}
        eksiUyarilari={eksiUyarilari}
        eksiErtelenen={eksiErtelenen}
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
          dosyaId: i.dosyaId ?? "",
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
              {detay.is.dosyaId && (
                <Link href={`/kokpit/dava-dosyalari/${detay.is.dosyaId}?sekme=gorevler`} className="text-xs font-semibold text-[#8fd8ff] hover:underline">
                  📁 Dosyaya git
                </Link>
              )}
              <Link href={`/kokpit/isler/${detay.is.id}`} className="text-xs text-white/45 hover:text-white">
                Tam sayfada aç ↗
              </Link>
            </div>
            <IsDetayi key={detay.is.id} odakta={odakIdleri.has(detay.is.id)} benimId={k?.kullaniciId ?? ""} kisiler={detay.kisiler} yargiTurleri={yargiTurleri} is={detay.is} kapatHref={kapatHref} />
          </YanPanel>
        </>
      )}
    </div>
  );
}
