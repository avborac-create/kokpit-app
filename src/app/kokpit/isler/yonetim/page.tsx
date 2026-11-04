import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { sistemYoneticisiMi } from "@/core/auth/yetki";
import { durumBilgisi, turBilgisi } from "../durum";

// Yonetici gorunumu: butun kisilere atanmis tum gorevler (acik, biten, silinen/iptal) tek yerde.
type Sekme = "acik" | "biten" | "silinen" | "hepsi";
const SEKMELER: { k: Sekme; ad: string }[] = [
  { k: "acik", ad: "Devam edenler" },
  { k: "biten", ad: "Tamamlananlar" },
  { k: "silinen", ad: "İptal / silinenler" },
  { k: "hepsi", ad: "Hepsi" },
];

type Satir = {
  id: string;
  baslik: string;
  sorumluId: string | null;
  atayanId: string | null;
  durum: string;
  durumAd: string;
  renk: string;
  tur: string;
  vade: Date | null;
  olusturma: Date;
  son: Date;
  silindi: boolean;
};

const tarihYaz = (d: Date | null) => (d ? d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" }) : "—");

export default async function GorevYonetimSayfasi({ searchParams }: { searchParams: Promise<{ sekme?: string; kisi?: string }> }) {
  const oturum = await mevcutKullanici();
  if (!oturum || !sistemYoneticisiMi(oturum.rol)) notFound();
  const { sekme: s, kisi } = await searchParams;
  const sekme: Sekme = SEKMELER.some((x) => x.k === s) ? (s as Sekme) : "acik";

  const [isler, kullanicilar, silmeKayitlari] = await Promise.all([
    prisma.is.findMany({
      orderBy: { guncellemeTarihi: "desc" },
      select: { id: true, baslik: true, durum: true, tur: true, vade: true, sorumluId: true, olusturanId: true, olusturmaTarihi: true, guncellemeTarihi: true, tamamlanmaTarihi: true },
    }),
    prisma.kullanici.findMany({ select: { id: true, adSoyad: true, aktifMi: true }, orderBy: { adSoyad: "asc" } }),
    prisma.islemGunlugu.findMany({ where: { ozet: "Görev silindi" }, orderBy: { olusturmaTarihi: "desc" }, take: 500, select: { kullaniciId: true, veri: true, olusturmaTarihi: true, durum: true } }),
  ]);
  const ad = new Map(kullanicilar.map((k) => [k.id, k.adSoyad]));
  const kimAd = (id: string | null) => (id ? (ad.get(id) ?? "—") : "Atanmadı");

  const mevcutlar: Satir[] = isler.map((i) => {
    const d = durumBilgisi(i.durum);
    return { id: i.id, baslik: i.baslik, sorumluId: i.sorumluId, atayanId: i.olusturanId, durum: i.durum, durumAd: d.ad, renk: d.renk, tur: i.tur, vade: i.vade, olusturma: i.olusturmaTarihi, son: i.tamamlanmaTarihi ?? i.guncellemeTarihi, silindi: false };
  });

  // Silinen (iptal edilen) gorevler islem gunlugunden okunur; geri alinanlar zaten mevcut listede.
  const silinenler: Satir[] = [];
  for (const g of silmeKayitlari) {
    if (g.durum === "GERI_ALINDI") continue;
    const agac = (g.veri as { tur?: string; agac?: Record<string, unknown> } | null)?.agac;
    if (!agac || typeof agac.id !== "string") continue;
    silinenler.push({
      id: agac.id,
      baslik: String(agac.baslik ?? "—"),
      sorumluId: (agac.sorumluId as string | null) ?? null,
      atayanId: (agac.olusturanId as string | null) ?? null,
      durum: "SILINDI",
      durumAd: "İptal / silindi",
      renk: "#ef4444",
      tur: String(agac.tur ?? "PARCA"),
      vade: typeof agac.vade === "string" ? new Date(agac.vade) : null,
      olusturma: typeof agac.olusturmaTarihi === "string" ? new Date(agac.olusturmaTarihi) : g.olusturmaTarihi,
      son: g.olusturmaTarihi,
      silindi: true,
    });
  }

  const hepsi = [...mevcutlar, ...silinenler];
  const kisiyeGore = (x: Satir) => !kisi || (kisi === "yok" ? !x.sorumluId : x.sorumluId === kisi);
  const sekmeyeGore = (x: Satir) => (sekme === "hepsi" ? true : sekme === "silinen" ? x.silindi : sekme === "biten" ? !x.silindi && x.durum === "TAMAMLANDI" : !x.silindi && x.durum !== "TAMAMLANDI");
  const liste = hepsi.filter((x) => kisiyeGore(x) && sekmeyeGore(x)).sort((a, b) => b.son.getTime() - a.son.getTime());

  // Kisi bazli ozet (sol panel): devam eden / biten / silinen sayilari.
  const ozet = (id: string | null) => {
    const k = hepsi.filter((x) => x.sorumluId === id);
    return { acik: k.filter((x) => !x.silindi && x.durum !== "TAMAMLANDI").length, biten: k.filter((x) => !x.silindi && x.durum === "TAMAMLANDI").length, silinen: k.filter((x) => x.silindi).length };
  };
  const atanmamis = ozet(null);
  const bugun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const href = (yeniSekme: Sekme, yeniKisi?: string) => `/kokpit/isler/yonetim?sekme=${yeniSekme}${yeniKisi ? `&kisi=${yeniKisi}` : ""}`;
  const dugme = (aktif: boolean) => `rounded-full px-3.5 py-1 text-sm ${aktif ? "bg-[var(--accent)] font-semibold text-white" : "text-white/65 hover:bg-white/10"}`;
  const kisiOgesi = (aktif: boolean) => `flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${aktif ? "bg-[var(--accent)]/20 font-semibold text-white" : "text-white/70 hover:bg-white/10"}`;

  return (
    <div className="max-w-7xl pt-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Görev Yönetimi</h1>
        <Link href="/kokpit/isler" className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/75 hover:bg-white/10">
          ← Görevler
        </Link>
      </div>
      <p className="mb-5 mt-1 text-sm text-white/55">Yönetici görünümü: büroda herkese atanmış devam eden, tamamlanan ve iptal edilen/silinen tüm görevler. Silinen görevler, işlem günlüğündeki kayıtlardan okunur.</p>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <nav aria-label="Kişiler" className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-2 md:sticky md:top-3 md:w-72 md:shrink-0">
          <Link href={href(sekme)} className={kisiOgesi(!kisi)}>
            <span className="min-w-0 flex-1 truncate">Tüm büro</span>
            <span className="text-xs text-white/50">{hepsi.filter((x) => !x.silindi && x.durum !== "TAMAMLANDI").length} açık</span>
          </Link>
          {kullanicilar.map((c) => {
            const o = ozet(c.id);
            if (!c.aktifMi && o.acik + o.biten + o.silinen === 0) return null;
            return (
              <Link key={c.id} href={href(sekme, c.id)} className={kisiOgesi(kisi === c.id)}>
                <span className="min-w-0 flex-1 truncate">{c.adSoyad}{c.aktifMi ? "" : " (pasif)"}</span>
                <span className="whitespace-nowrap text-xs text-white/50" title="devam eden · tamamlanan · iptal/silinen">
                  {o.acik} · {o.biten} · {o.silinen}
                </span>
              </Link>
            );
          })}
          {atanmamis.acik + atanmamis.biten + atanmamis.silinen > 0 && (
            <Link href={href(sekme, "yok")} className={kisiOgesi(kisi === "yok")}>
              <span className="min-w-0 flex-1 truncate">Atanmamış</span>
              <span className="whitespace-nowrap text-xs text-white/50">
                {atanmamis.acik} · {atanmamis.biten} · {atanmamis.silinen}
              </span>
            </Link>
          )}
          <p className="px-3 pb-1 pt-2 text-[11px] text-white/35">Sayılar: devam eden · tamamlanan · iptal/silinen</p>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-full border border-white/15 p-1" role="tablist" aria-label="Durum">
              {SEKMELER.map((x) => (
                <Link key={x.k} href={href(x.k, kisi)} role="tab" aria-selected={sekme === x.k} className={dugme(sekme === x.k)}>
                  {x.ad}
                </Link>
              ))}
            </div>
            <span className="ml-auto text-sm text-white/50">{liste.length} görev</span>
          </div>

          <ul className="flex flex-col gap-2">
            {liste.length === 0 && <li className="px-1 py-6 text-center text-sm text-white/45">Bu filtrede görev yok.</li>}
            {liste.map((x) => {
              const t = turBilgisi(x.tur);
              const icerik = (
                <>
                  <div className="flex items-start gap-2">
                    <span className={`min-w-0 flex-1 text-[15px] font-medium ${x.silindi ? "text-white/60 line-through" : "text-white"}`}>{x.baslik}</span>
                    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: x.renk + "26", color: x.renk }}>
                      {x.durumAd}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/50">
                    <span>👤 {kimAd(x.sorumluId)}</span>
                    <span>atayan: {kimAd(x.atayanId)}</span>
                    <span style={{ color: t.renk }}>{t.kisa}</span>
                    {x.vade && <span style={{ color: !x.silindi && x.durum !== "TAMAMLANDI" && x.vade.toISOString().slice(0, 10) < bugun ? "#ff7a70" : undefined }}>📅 vade {tarihYaz(x.vade)}</span>}
                    <span>açılış {tarihYaz(x.olusturma)}</span>
                    <span className="ml-auto">{x.silindi ? "iptal" : x.durum === "TAMAMLANDI" ? "kapanış" : "son işlem"} {tarihYaz(x.son)}</span>
                  </div>
                </>
              );
              return (
                <li key={`${x.silindi ? "s" : "m"}-${x.id}`} className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07]">
                  {x.silindi ? (
                    <div className="flex flex-col gap-1.5 px-4 py-3">{icerik}</div>
                  ) : (
                    <Link href={`/kokpit/isler/${x.id}`} className="flex flex-col gap-1.5 px-4 py-3">
                      {icerik}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
