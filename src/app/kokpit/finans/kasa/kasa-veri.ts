import { prisma } from "@/core/db/prisma";
import { kokpitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";

export type KasaSatiri = {
  id: string;
  otomatik: boolean;
  tarih: Date;
  yon: "GIRIS" | "CIKIS";
  tutar: number;
  aciklama: string;
  kodNo: number | null;
  kodAd: string;
  personelId: string | null;
  kodId: string | null;
  dosyaId: string | null;
  ham: string;
  sira: number;
};

// Kasa = (muvekkillerden Para Trafigi'ne gelen NAKIT tahsilatlar) + (elle girilen hareketler).
// Nakit tahsilatlar kopyalanmaz, her acilista Para Trafigi'nden okunur (tek kaynak).
export async function kasaSatirlari(): Promise<KasaSatiri[]> {
  const [nakit, elle, kisiler] = await Promise.all([
    prisma.cariHareketi.findMany({
      where: { yon: "ALACAK", hesap: { paraHesabiMi: true }, odemeYontemi: { etiket: { contains: "nakit", mode: "insensitive" } } },
      include: {
        musteri: { select: { adSoyadUnvan: true } },
        dosya: { select: { id: true, kayitNo: true, altSiraNo: true, anaDosya: { select: { kayitNo: true } } } },
      },
    }),
    prisma.kasaHareketi.findMany({ include: { kod: true } }),
    prisma.kullanici.findMany({ select: { id: true, adSoyad: true } }),
  ]);
  const ad = new Map(kisiler.map((x) => [x.id, x.adSoyad]));
  const satirlar: KasaSatiri[] = [];
  for (const h of nakit) {
    satirlar.push({
      id: "ph:" + h.id,
      otomatik: true,
      tarih: h.tarih,
      yon: "GIRIS",
      tutar: Number(h.tutar),
      aciklama: `${h.aciklama ? h.aciklama + " · " : ""}${h.musteri.adSoyadUnvan}${h.dosya ? " · " + kokpitNoGoster(h.dosya) : ""}`,
      kodNo: 1,
      kodAd: "Müvekkil nakit tahsilatı (otomatik)",
      personelId: null,
      kodId: null,
      dosyaId: h.dosyaId,
      ham: h.aciklama ?? "",
      sira: h.olusturmaTarihi.getTime(),
    });
  }
  for (const h of elle) {
    satirlar.push({
      id: h.id,
      otomatik: false,
      tarih: h.tarih,
      yon: h.yon,
      tutar: Number(h.tutar),
      aciklama: `${h.personelId ? (ad.get(h.personelId) ?? "Personel") + (h.aciklama ? " · " : "") : ""}${h.aciklama ?? ""}`,
      kodNo: h.kod.no,
      kodAd: h.kod.ad,
      personelId: h.personelId,
      kodId: h.kodId,
      dosyaId: null,
      ham: h.aciklama ?? "",
      sira: h.olusturmaTarihi.getTime(),
    });
  }
  satirlar.sort((a, b) => a.tarih.getTime() - b.tarih.getTime() || a.sira - b.sira);
  return satirlar;
}

export async function kasaOzeti() {
  const satirlar = await kasaSatirlari();
  const giris = satirlar.filter((s) => s.yon === "GIRIS").reduce((t, s) => t + s.tutar, 0);
  const cikis = satirlar.filter((s) => s.yon === "CIKIS").reduce((t, s) => t + s.tutar, 0);
  return { giris, cikis, bakiye: Math.round((giris - cikis) * 100) / 100 };
}

// Birikimli kasa bakiyesi (kronolojik sirali satirlar uzerinden).
export function bakiyeEkle(satirlar: KasaSatiri[]) {
  let b = 0;
  const sonuc: (KasaSatiri & { bakiye: number })[] = [];
  for (const s of satirlar) {
    b += s.yon === "GIRIS" ? s.tutar : -s.tutar;
    sonuc.push({ ...s, bakiye: Math.round(b * 100) / 100 });
  }
  return sonuc;
}
