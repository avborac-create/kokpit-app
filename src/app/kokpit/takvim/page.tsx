import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { TakvimUygulamasi } from "./takvim-uygulamasi";
import type { Oge, OgeDurumu, OgeTuru, Tekrar, TakvimKodu } from "./tipler";

const ZONE = "Europe/Istanbul";
const tarihFormati = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const saatFormati = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const gunDizesi = (d: Date) => d.toISOString().slice(0, 10);

export const metadata = { title: "Büro Takvimi" };

export default async function BuroTakvimiSayfasi() {
  const kullanici = await mevcutKullanici();
  const bir_yil_once = new Date(new Date().getTime() - 400 * 86400000);

  const [kayitlar, davalar, cmkler, ekip] = await Promise.all([
    prisma.takvimOgesi.findMany({ include: { davaDosyasi: { select: { birimAdi: true, dosyaNo: true } }, cmkDosyasi: { select: { birim: true, dosyaNo: true } } } }),
    prisma.davaDosyasi.findMany({
      where: { durusmaTarihi: { gte: bir_yil_once } },
      select: { id: true, durusmaTarihi: true, birimAdi: true, dosyaNo: true, konu: true },
    }),
    prisma.cMKDosyasi.findMany({
      where: { durusmaTarihi: { gte: bir_yil_once } },
      select: { id: true, durusmaTarihi: true, birim: true, dosyaNo: true },
    }),
    prisma.kullanici.findMany({ where: { aktifMi: true }, select: { id: true, adSoyad: true, dogumTarihi: true }, orderBy: { adSoyad: "asc" } }),
  ]);

  const ogeler: Oge[] = kayitlar.map((k) => ({
    id: k.id,
    baslik: k.baslik,
    tur: k.tur as OgeTuru,
    takvim: (k.takvim as TakvimKodu) ?? "IS",
    tarih: gunDizesi(k.tarih),
    saat: k.saat,
    bitisTarihi: k.bitisTarihi ? gunDizesi(k.bitisTarihi) : null,
    bitisSaati: k.bitisSaati,
    yer: k.yer,
    meet: k.meetBaglantisi,
    sorumluId: k.sorumluId,
    etiketler: k.etiketler,
    durum: k.durum as OgeDurumu,
    tamam: k.tamamlandiMi,
    icerik: k.icerik ?? "",
    tekrar: (k.tekrar as Tekrar | null) ?? null,
    tekrarBitis: k.tekrarBitis ? gunDizesi(k.tekrarBitis) : null,
    sira: k.sira,
    dosya: k.davaDosyasiId ? `d:${k.davaDosyasiId}` : k.cmkDosyasiId ? `c:${k.cmkDosyasiId}` : null,
    dosyaEtiketi: k.davaDosyasi
      ? [k.davaDosyasi.birimAdi, k.davaDosyasi.dosyaNo].filter(Boolean).join(" · ")
      : k.cmkDosyasi
        ? ["CMK", k.cmkDosyasi.birim, k.cmkDosyasi.dosyaNo].filter(Boolean).join(" · ")
        : null,
    turetilmis: null,
  }));

  // Dosya kayitlarindaki duruşma tarihleri (ayni dosya + gun icin elle duruşma girilmisse gizlenir).
  const girilmis = new Set(ogeler.filter((o) => o.tur === "DURUSMA" && o.dosya).map((o) => `${o.dosya}|${o.tarih}`));
  const turetilmisOge = (kaynak: "dava" | "cmk", id: string, t: Date, etiket: string): Oge | null => {
    const tarih = tarihFormati.format(t);
    const dosya = `${kaynak === "dava" ? "d" : "c"}:${id}`;
    if (girilmis.has(`${dosya}|${tarih}`)) return null;
    const saat = saatFormati.format(t);
    return {
      id: dosya,
      baslik: `Duruşma · ${etiket}`,
      tur: "DURUSMA",
      takvim: "DURUSMA",
      tarih,
      saat: saat === "00:00" ? null : saat,
      bitisTarihi: null,
      bitisSaati: null,
      yer: null,
      meet: null,
      sorumluId: null,
      etiketler: [],
      durum: "BEKLIYOR",
      tamam: false,
      icerik: "",
      tekrar: null,
      tekrarBitis: null,
      sira: 0,
      dosya,
      dosyaEtiketi: etiket,
      turetilmis: kaynak,
    };
  };
  for (const d of davalar) {
    if (!d.durusmaTarihi) continue;
    const o = turetilmisOge("dava", d.id, d.durusmaTarihi, [d.birimAdi ?? d.konu, d.dosyaNo].filter(Boolean).join(" · "));
    if (o) ogeler.push(o);
  }
  for (const d of cmkler) {
    if (!d.durusmaTarihi) continue;
    const o = turetilmisOge("cmk", d.id, d.durusmaTarihi, ["CMK", d.birim, d.dosyaNo].filter(Boolean).join(" · "));
    if (o) ogeler.push(o);
  }

  const dogumlar = ekip.flatMap((k) => (k.dogumTarihi ? [{ id: k.id, ad: k.adSoyad, ay: k.dogumTarihi.getUTCMonth() + 1, gun: k.dogumTarihi.getUTCDate() }] : []));

  return (
    <TakvimUygulamasi
      ilkOgeler={ogeler}
      dogumlar={dogumlar}
      kisiler={ekip.map((k) => ({ id: k.id, ad: k.adSoyad }))}
      bugun={tarihFormati.format(new Date())}
      benimId={kullanici?.kullaniciId ?? null}
    />
  );
}
