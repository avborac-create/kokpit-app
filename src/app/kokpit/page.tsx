import { Suspense } from "react";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { prisma } from "@/core/db/prisma";
import { dovizKurlari, hukukHaberleri, resmiGazeteFihristi } from "@/core/ana-sayfa/veri";
import { AnaSayfaDuzeni, type Duzen } from "./ana-sayfa-duzeni";
import { HaberSekmeleri, type HaberKaynagi } from "./haber-sekmeleri";
import { DogumGunuPaneli, TakvimPaneli } from "./takvim-paneli";

const TR = "tr-TR";
const ZONE = "Europe/Istanbul";
const kurBicimi = new Intl.NumberFormat(TR, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

function selam(saat: number) {
  if (saat < 6) return "İyi geceler";
  if (saat < 12) return "Günaydın";
  if (saat < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default async function KokpitAnaSayfa({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const { ay } = await searchParams;
  const kullanici = await mevcutKullanici();
  const simdi = new Date();
  const saat = Number(new Intl.DateTimeFormat(TR, { hour: "numeric", hour12: false, timeZone: ZONE }).format(simdi));
  const tarih = new Intl.DateTimeFormat(TR, { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: ZONE }).format(simdi);
  const ad = kullanici?.adSoyad?.trim().split(/\s+/)[0] ?? "";
  const duzen = await kayitliDuzen(kullanici?.kullaniciId);

  return (
    <div className="mt-3 flex flex-col gap-4">
      <section className="glass rounded-3xl p-7">
        <p className="text-sm text-white/50">{tarih}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">
          {selam(saat)}
          {ad ? `, ${ad}` : ""}
        </h1>
        <p className="mt-2 text-white/60">Kokpit’e hoş geldiniz. Çalışmaya sol menüden devam edebilirsiniz.</p>
      </section>

      <AnaSayfaDuzeni
        tanimlar={[
          { kod: "takvim", ad: "Büro takvimi" },
          { kod: "haber", ad: "Hukuk gündemi" },
          { kod: "kur", ad: "Döviz kurları" },
          { kod: "ekip", ad: "Ekibimiz" },
        ]}
        baslangic={duzen}
        paneller={{
          takvim: (
            <Suspense fallback={<div className="glass h-[30rem] animate-pulse rounded-3xl" />}>
              <TakvimPaneli ayParam={ay} />
            </Suspense>
          ),
          haber: (
            <Suspense fallback={<div className="glass h-80 animate-pulse rounded-3xl" />}>
              <HaberPaneli />
            </Suspense>
          ),
          kur: (
            <Suspense fallback={<div className="glass h-44 animate-pulse rounded-3xl" />}>
              <KurPaneli />
            </Suspense>
          ),
          ekip: (
            <Suspense fallback={<div className="glass h-44 animate-pulse rounded-3xl" />}>
              <DogumGunuPaneli />
            </Suspense>
          ),
        }}
      />
    </div>
  );
}

async function KurPaneli() {
  const ozet = await dovizKurlari();
  if (!ozet) return null;
  return (
    <section className="glass rounded-3xl p-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Döviz kurları</h2>
        <span className="text-xs text-white/40">TCMB gösterge kuru · {ozet.tarih}</span>
      </div>
      <div className="divide-y divide-white/[0.07]">
        {ozet.kurlar.map((k) => (
          <div key={k.kod} className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="text-white/85">
              <b className="mr-2 font-semibold text-white">{k.kod}</b>
              <span className="text-sm text-white/45">{k.ad}</span>
            </span>
            <span className="text-right tabular-nums text-white">
              {kurBicimi.format(k.satis)}
              <span className="ml-3 text-xs text-white/40">alış {kurBicimi.format(k.alis)}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/35">Tutarlar ₺ karşılığıdır; satış kuru büyük yazılmıştır.</p>
    </section>
  );
}

async function kayitliDuzen(kullaniciId?: string): Promise<Duzen> {
  const bos: Duzen = { sira: [], gizli: [], genis: [] };
  if (!kullaniciId) return bos;
  try {
    const k = await prisma.kullanici.findUnique({ where: { id: kullaniciId }, select: { anaSayfaDuzeni: true } });
    const j = k?.anaSayfaDuzeni ? JSON.parse(k.anaSayfaDuzeni) : null;
    const dizi = (x: unknown) => (Array.isArray(x) ? x.filter((e): e is string => typeof e === "string") : []);
    return j ? { sira: dizi(j.sira), gizli: dizi(j.gizli), genis: dizi(j.genis) } : bos;
  } catch {
    return bos;
  }
}

async function HaberPaneli() {
  const [haberler, gazete] = await Promise.all([hukukHaberleri(), resmiGazeteFihristi()]);
  const saatBicimi = new Intl.DateTimeFormat(TR, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ZONE });
  const kaynaklar: HaberKaynagi[] = [];
  if (haberler)
    kaynaklar.push({
      kod: "haber",
      ad: "Hukuki Haber",
      alt: "hukukihaber.net · son haberler",
      kalemler: haberler.map((h) => ({ baslik: h.baslik, baglanti: h.baglanti, ek: h.tarih ? saatBicimi.format(h.tarih) : undefined })),
    });
  if (gazete)
    kaynaklar.push({
      kod: "gazete",
      ad: "Resmî Gazete",
      alt: `resmigazete.gov.tr · bugünkü fihrist (${gazete.sayi} kalem), yargı kararları önce`,
      kalemler: gazete.kalemler.map((k) => ({ baslik: k.baslik, baglanti: k.baglanti, ek: k.grup })),
    });
  if (kaynaklar.length === 0) return null;
  return <HaberSekmeleri kaynaklar={kaynaklar} />;
}
