import Link from "next/link";
import { prisma } from "@/core/db/prisma";

const ZONE = "Europe/Istanbul";
const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUN_ADLARI = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const saatBicimi = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: ZONE });

type Olay = { gun: number; tur: "durusma" | "dogum"; metin: string; saat?: string };

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

// Ana sayfadaki takvim: secili ayin durusmalari (dava + CMK) ve ekip uyelerinin dogum gunleri.
export async function TakvimPaneli({ ayParam }: { ayParam?: string }) {
  const bugun = bugunIstanbul();
  const eslesme = /^(\d{4})-(\d{2})$/.exec(ayParam ?? "");
  const yil = eslesme ? Number(eslesme[1]) : bugun.yil;
  const ay = eslesme && Number(eslesme[2]) >= 1 && Number(eslesme[2]) <= 12 ? Number(eslesme[2]) - 1 : bugun.ay;

  // Istanbul (UTC+3) gun sinirlari
  const bas = new Date(Date.UTC(yil, ay, 1, -3));
  const son = new Date(Date.UTC(yil, ay + 1, 1, -3));

  const [davalar, cmkler, ekip] = await Promise.all([
    prisma.davaDosyasi.findMany({
      where: { durusmaTarihi: { gte: bas, lt: son } },
      select: { durusmaTarihi: true, birimAdi: true, dosyaNo: true, konu: true },
    }),
    prisma.cMKDosyasi.findMany({
      where: { durusmaTarihi: { gte: bas, lt: son } },
      select: { durusmaTarihi: true, birim: true, dosyaNo: true },
    }),
    prisma.kullanici.findMany({
      where: { aktifMi: true, dogumTarihi: { not: null } },
      select: { adSoyad: true, dogumTarihi: true },
    }),
  ]);

  const olaylar: Olay[] = [];
  for (const d of davalar) {
    if (!d.durusmaTarihi) continue;
    olaylar.push({
      gun: gunuIstanbul(d.durusmaTarihi),
      tur: "durusma",
      saat: saatBicimi.format(d.durusmaTarihi),
      metin: [d.birimAdi ?? d.konu, d.dosyaNo].filter(Boolean).join(" · "),
    });
  }
  for (const d of cmkler) {
    if (!d.durusmaTarihi) continue;
    olaylar.push({
      gun: gunuIstanbul(d.durusmaTarihi),
      tur: "durusma",
      saat: saatBicimi.format(d.durusmaTarihi),
      metin: ["CMK", d.birim, d.dosyaNo].filter(Boolean).join(" · "),
    });
  }
  for (const k of ekip) {
    if (!k.dogumTarihi || k.dogumTarihi.getUTCMonth() !== ay) continue;
    olaylar.push({ gun: k.dogumTarihi.getUTCDate(), tur: "dogum", metin: `${k.adSoyad} · doğum günü` });
  }
  olaylar.sort((a, b) => a.gun - b.gun || (a.saat ?? "").localeCompare(b.saat ?? ""));

  const gunSayisi = new Date(Date.UTC(yil, ay + 1, 0)).getUTCDate();
  const ilkGun = (new Date(Date.UTC(yil, ay, 1)).getUTCDay() + 6) % 7; // Pazartesi = 0
  const hucreler: (number | null)[] = [...Array(ilkGun).fill(null), ...Array.from({ length: gunSayisi }, (_, i) => i + 1)];
  while (hucreler.length % 7 !== 0) hucreler.push(null);

  const onceki = ayAnahtari(ay === 0 ? yil - 1 : yil, ay === 0 ? 11 : ay - 1);
  const sonraki = ayAnahtari(ay === 11 ? yil + 1 : yil, ay === 11 ? 0 : ay + 1);
  const buAyMi = yil === bugun.yil && ay === bugun.ay;
  const gunTurleri = (g: number) => new Set(olaylar.filter((o) => o.gun === g).map((o) => o.tur));

  const gezinti = "rounded-full px-2.5 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white";

  return (
    <section className="glass flex min-w-0 flex-col rounded-3xl p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Takvim</h2>
        <div className="flex items-center gap-1">
          <Link href={`/kokpit?ay=${onceki}`} className={gezinti} aria-label="Önceki ay">
            ‹
          </Link>
          <span className="min-w-28 text-center text-sm font-medium text-white">
            {AY_ADLARI[ay]} {yil}
          </span>
          <Link href={`/kokpit?ay=${sonraki}`} className={gezinti} aria-label="Sonraki ay">
            ›
          </Link>
          {!buAyMi && (
            <Link href="/kokpit" className="ml-1 rounded-full px-2.5 py-1 text-xs text-[var(--link)] hover:bg-white/10">
              Bugün
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {GUN_ADLARI.map((g) => (
          <div key={g} className="pb-1 text-white/40">
            {g}
          </div>
        ))}
        {hucreler.map((g, i) => {
          if (g === null) return <div key={i} />;
          const turler = gunTurleri(g);
          const bugunMu = buAyMi && g === bugun.gun;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 py-0.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                  bugunMu ? "bg-[var(--accent)] font-semibold text-white" : "text-white/85"
                }`}
              >
                {g}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {turler.has("durusma") && <span className="h-1.5 w-1.5 rounded-full bg-[#6db8ff]" />}
                {turler.has("dogum") && <span className="h-1.5 w-1.5 rounded-full bg-[#ff9f43]" />}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-white/45">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#6db8ff]" /> Duruşma
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff9f43]" /> Doğum günü
        </span>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-white/[0.08] pt-3">
        {olaylar.length === 0 ? (
          <p className="text-sm text-white/40">Bu ay için kayıtlı duruşma veya doğum günü yok.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {olaylar.map((o, i) => (
              <li key={i} className="flex items-baseline gap-3 text-sm">
                <span className="w-12 shrink-0 text-white/50">
                  {o.gun} {AY_ADLARI[ay].slice(0, 3)}
                </span>
                <span className={`min-w-0 flex-1 truncate ${o.tur === "dogum" ? "text-[#ffb870]" : "text-white/85"}`}>
                  {o.saat && o.saat !== "00:00" ? `${o.saat} · ` : ""}
                  {o.metin}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
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
