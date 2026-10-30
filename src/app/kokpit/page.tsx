import { Suspense } from "react";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { dovizKurlari, hukukHaberleri } from "@/core/ana-sayfa/veri";
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

      {/* Paneller ikili satırlar halinde, her satırda eşit yükseklikte. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        <Suspense fallback={<div className="glass h-[32rem] animate-pulse rounded-3xl" />}>
          <TakvimPaneli ayParam={ay} />
        </Suspense>
        <Suspense fallback={<div className="glass h-[32rem] animate-pulse rounded-3xl" />}>
          <HaberPaneli />
        </Suspense>
        <Suspense fallback={<div className="glass h-44 animate-pulse rounded-3xl" />}>
          <KurPaneli />
        </Suspense>
        <Suspense fallback={<div className="glass h-44 animate-pulse rounded-3xl" />}>
          <DogumGunuPaneli />
        </Suspense>
      </div>
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

async function HaberPaneli() {
  const haberler = await hukukHaberleri();
  if (!haberler) return null;
  const saatBicimi = new Intl.DateTimeFormat(TR, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ZONE });
  const liste = (
    <ul className="flex flex-col">
      {haberler.map((h) => (
        <li key={h.baglanti} className="border-b border-white/[0.07] py-3">
          <a href={h.baglanti} target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-[#6db8ff]">
            <span className="text-[15px] font-medium leading-snug">{h.baslik}</span>
            {h.tarih && <span className="mt-0.5 block text-xs text-white/40">{saatBicimi.format(h.tarih)}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="glass flex min-w-0 flex-col rounded-3xl p-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Hukuk gündemi</h2>
        <span className="text-xs text-white/40">hukukihaber.net</span>
      </div>
      {/* Asagidan yukari kayan akis; uzerine gelince durur. Hareket azaltma ayarinda normal kaydirmali liste. */}
      <div className="haber-akisi relative h-[26rem] flex-1 overflow-hidden motion-reduce:overflow-y-auto">
        <div className="haber-akisi-ic">
          {liste}
          <div aria-hidden="true" className="motion-reduce:hidden">
            {liste}
          </div>
        </div>
      </div>
    </section>
  );
}
