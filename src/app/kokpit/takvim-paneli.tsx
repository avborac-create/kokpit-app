import { prisma } from "@/core/db/prisma";
import { TakvimIstemci, type TakvimOgeVeri } from "./takvim-istemci";

const ZONE = "Europe/Istanbul";
const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const saatBicimi = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: ZONE });

// Istanbul saatine gore bugun (yil, ay 0-11, gun).
export function bugunIstanbul() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const al = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { yil: al("year"), ay: al("month") - 1, gun: al("day") };
}

function gunuIstanbul(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, day: "2-digit" }).formatToParts(d);
  return Number(p.find((x) => x.type === "day")?.value);
}

function ayAnahtari(yil: number, ay: number) {
  return `${yil}-${String(ay + 1).padStart(2, "0")}`;
}

// Ana sayfadaki takvim: secili ayin duruşmaları (dosya kayıtları + elle girilenler), görev/toplantı/not
// ve ekip uyelerinin doğum günleri. Etkilesim istemci bileşeninde (takvim-istemci).
export async function TakvimPaneli({ ayParam }: { ayParam?: string }) {
  const bugun = bugunIstanbul();
  const eslesme = /^(\d{4})-(\d{2})$/.exec(ayParam ?? "");
  const yil = eslesme ? Number(eslesme[1]) : bugun.yil;
  const ay = eslesme && Number(eslesme[2]) >= 1 && Number(eslesme[2]) <= 12 ? Number(eslesme[2]) - 1 : bugun.ay;

  // Istanbul (UTC+3) gun sinirlari
  const bas = new Date(Date.UTC(yil, ay, 1, -3));
  const son = new Date(Date.UTC(yil, ay + 1, 1, -3));

  const [davalar, cmkler, ekip, kayitlar] = await Promise.all([
    prisma.davaDosyasi.findMany({
      where: { durusmaTarihi: { gte: bas, lt: son } },
      select: { id: true, durusmaTarihi: true, birimAdi: true, dosyaNo: true, konu: true },
    }),
    prisma.cMKDosyasi.findMany({
      where: { durusmaTarihi: { gte: bas, lt: son } },
      select: { id: true, durusmaTarihi: true, birim: true, dosyaNo: true },
    }),
    prisma.kullanici.findMany({
      where: { aktifMi: true, dogumTarihi: { not: null } },
      select: { id: true, adSoyad: true, dogumTarihi: true },
    }),
    prisma.takvimOgesi.findMany({
      where: { tarih: { gte: new Date(Date.UTC(yil, ay, 1)), lt: new Date(Date.UTC(yil, ay + 1, 1)) } },
      orderBy: [{ sira: "asc" }, { olusturmaTarihi: "asc" }],
    }),
  ]);

  const ogeler: TakvimOgeVeri[] = [];
  // Ayni dosya + ayni gun icin elle duruşma girilmisse dosya kaydindaki turetilmis satir gizlenir.
  const girilmis = new Set(
    kayitlar
      .filter((k) => k.tur === "DURUSMA")
      .map((k) => `${k.davaDosyasiId ? "d" + k.davaDosyasiId : k.cmkDosyasiId ? "c" + k.cmkDosyasiId : ""}|${k.tarih.getUTCDate()}`),
  );
  for (const k of kayitlar) {
    ogeler.push({
      key: `o-${k.id}`,
      kaynak: "oge",
      id: k.id,
      gun: k.tarih.getUTCDate(),
      saat: k.saat,
      baslik: k.baslik,
      tur: k.tur,
      tamam: k.tamamlandiMi,
    });
  }
  for (const d of davalar) {
    if (!d.durusmaTarihi) continue;
    const gun = gunuIstanbul(d.durusmaTarihi);
    if (girilmis.has(`d${d.id}|${gun}`)) continue;
    ogeler.push({
      key: `d-${d.id}`,
      kaynak: "dava",
      id: d.id,
      gun,
      saat: saatBicimi.format(d.durusmaTarihi),
      baslik: "Duruşma · " + [d.birimAdi ?? d.konu, d.dosyaNo].filter(Boolean).join(" · "),
      tur: "DURUSMA",
      tamam: false,
    });
  }
  for (const d of cmkler) {
    if (!d.durusmaTarihi) continue;
    const gun = gunuIstanbul(d.durusmaTarihi);
    if (girilmis.has(`c${d.id}|${gun}`)) continue;
    ogeler.push({
      key: `c-${d.id}`,
      kaynak: "cmk",
      id: d.id,
      gun,
      saat: saatBicimi.format(d.durusmaTarihi),
      baslik: "Duruşma · " + ["CMK", d.birim, d.dosyaNo].filter(Boolean).join(" · "),
      tur: "DURUSMA",
      tamam: false,
    });
  }
  for (const k of ekip) {
    if (!k.dogumTarihi || k.dogumTarihi.getUTCMonth() !== ay) continue;
    ogeler.push({
      key: `b-${k.id}`,
      kaynak: "dogum",
      id: k.id,
      gun: k.dogumTarihi.getUTCDate(),
      saat: null,
      baslik: `${k.adSoyad} · doğum günü`,
      tur: "DOGUM",
      tamam: false,
    });
  }
  // Dosya kaynakli duruşmalar saate gore, elle girilenler kendi sirasiyla (kayitlar zaten sira ile geldi).
  const turetilmis = ogeler.filter((o) => o.kaynak === "dava" || o.kaynak === "cmk").sort((a, b) => (a.saat ?? "").localeCompare(b.saat ?? ""));
  const elle = ogeler.filter((o) => o.kaynak === "oge");
  const dogumlar = ogeler.filter((o) => o.kaynak === "dogum");
  const sirali = [...turetilmis, ...elle, ...dogumlar];

  const onceki = ayAnahtari(ay === 0 ? yil - 1 : yil, ay === 0 ? 11 : ay - 1);
  const sonraki = ayAnahtari(ay === 11 ? yil + 1 : yil, ay === 11 ? 0 : ay + 1);
  const buAyMi = yil === bugun.yil && ay === bugun.ay;

  return (
    <TakvimIstemci
      key={ayAnahtari(yil, ay)}
      yil={yil}
      ay={ay}
      bugun={bugun}
      oncekiAy={onceki}
      sonrakiAy={sonraki}
      buAyMi={buAyMi}
      ogeler={sirali}
    />
  );
}

// "Ekibimiz": yaklasan dogum gunleri (bugun dahil, onumuzdeki 60 gun).
export async function DogumGunuPaneli() {
  const bugun = bugunIstanbul();
  const ekip = await prisma.kullanici.findMany({
    where: { aktifMi: true, dogumTarihi: { not: null } },
    select: { adSoyad: true, dogumTarihi: true },
  });
  const bugunMs = Date.UTC(bugun.yil, bugun.ay, bugun.gun);
  const liste = ekip
    .flatMap((k) => {
      if (!k.dogumTarihi) return [];
      const ay = k.dogumTarihi.getUTCMonth();
      const gun = k.dogumTarihi.getUTCDate();
      let hedef = Date.UTC(bugun.yil, ay, gun);
      if (hedef < bugunMs) hedef = Date.UTC(bugun.yil + 1, ay, gun);
      return [{ ad: k.adSoyad, kalan: Math.round((hedef - bugunMs) / 86400000), ay, gun }];
    })
    .filter((x) => x.kalan <= 60)
    .sort((a, b) => a.kalan - b.kalan)
    .slice(0, 6);

  return (
    <section className="glass flex min-w-0 flex-col rounded-3xl p-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Ekibimiz</h2>
        <span className="text-xs text-white/40">Yaklaşan doğum günleri</span>
      </div>
      {liste.length === 0 ? (
        <p className="text-sm text-white/45">
          Önümüzdeki 60 günde doğum günü yok ya da tarihler henüz girilmemiş (Ayarlar › Kullanıcılar).
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.07]">
          {liste.map((k) => (
            <li key={k.ad} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 truncate text-white/90">
                {k.kalan === 0 && <span aria-hidden="true">🎂 </span>}
                {k.ad}
              </span>
              <span className={`shrink-0 text-sm ${k.kalan === 0 ? "font-semibold text-[#ffb870]" : "text-white/50"}`}>
                {k.kalan === 0 ? "Bugün!" : k.kalan === 1 ? "Yarın" : `${k.gun} ${AY_ADLARI[k.ay]} · ${k.kalan} gün`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
