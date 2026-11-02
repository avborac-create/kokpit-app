import { prisma } from "@/core/db/prisma";
import { donemBasi } from "./hafta";

export type Detay = {
  id: string;
  baslik: string;
  aciklama: string | null;
  durum: string;
  tur: string;
  vade: string;
  haftalikHedef: number;
  periyot: string;
  tetikleyici: string;
  zamanBaskisi: string;
  yargiTuruId: string;
  yapilan: number;
  kayitlar: { id: string; yapan: string; zaman: string }[];
  sorumluId: string;
  olusturan: string;
  yardimlar: { id: string; ad: string; isteyen: string; yardimciId: string }[];
  maddeler: { id: string; metin: string; tamam: boolean }[];
  yorumlar: { id: string; yazan: string; benim: boolean; metin: string; zaman: string; ekler: { id: string; ad: string; tur: string }[] }[];
};

export async function isDetayiYukle(id: string, benimId: string): Promise<{ is: Detay; kisiler: { id: string; adSoyad: string }[]; yargiTurleri: { id: string; ad: string }[] } | null> {
  const [is, kisiler, yargiTurleri] = await Promise.all([
    prisma.is.findUnique({
      where: { id },
      include: {
        operasyonKayitlari: { orderBy: { tarih: "desc" }, take: 15 },
        yardimlar: true,
        maddeler: { orderBy: [{ sira: "asc" }, { id: "asc" }] },
        yorumlar: { orderBy: { tarih: "asc" }, include: { ekler: true } },
      },
    }),
    prisma.kullanici.findMany({ where: { aktifMi: true }, select: { id: true, adSoyad: true }, orderBy: { adSoyad: "asc" } }),
    prisma.gorevYargiTuru.findMany({ orderBy: [{ sira: "asc" }, { ad: "asc" }], select: { id: true, ad: true } }),
  ]);
  if (!is) return null;
  const yapilan = await prisma.isOperasyonKaydi.count({ where: { isId: id, tarih: { gte: donemBasi(is.periyot) } } });
  const ad = new Map(kisiler.map((x) => [x.id, x.adSoyad]));
  const tarihSaat = (d: Date) => d.toLocaleString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  return {
    kisiler,
    yargiTurleri,
    is: {
      id: is.id,
      baslik: is.baslik,
      aciklama: is.aciklama,
      durum: is.durum,
      tur: is.tur,
      vade: is.vade ? is.vade.toISOString().slice(0, 10) : "",
      haftalikHedef: is.haftalikHedef ?? 0,
      periyot: is.periyot,
      tetikleyici: is.tetikleyici ?? "",
      zamanBaskisi: is.zamanBaskisi ?? "",
      yargiTuruId: is.yargiTuruId ?? "",
      yapilan,
      kayitlar: is.operasyonKayitlari.map((o) => ({ id: o.id, yapan: o.yapanId ? (ad.get(o.yapanId) ?? "—") : "—", zaman: tarihSaat(o.tarih) })),
      sorumluId: is.sorumluId ?? "",
      olusturan: is.olusturanId ? (ad.get(is.olusturanId) ?? "—") : "—",
      yardimlar: is.yardimlar.map((y) => ({ id: y.id, ad: ad.get(y.yardimciId) ?? "—", isteyen: ad.get(y.isteyenId) ?? "—", yardimciId: y.yardimciId })),
      maddeler: is.maddeler.map((m) => ({ id: m.id, metin: m.metin, tamam: m.tamam })),
      yorumlar: is.yorumlar.map((y) => ({ id: y.id, yazan: y.yazanId ? (ad.get(y.yazanId) ?? "—") : "—", benim: y.yazanId === benimId, metin: y.metin, zaman: tarihSaat(y.tarih), ekler: y.ekler.map((e) => ({ id: e.id, ad: e.ad, tur: e.tur })) })),
    },
  };
}
