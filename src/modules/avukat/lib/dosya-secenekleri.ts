import { prisma } from "@/core/db/prisma";
import { kayitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";

export type DosyaSecenegi = { id: string; etiket: string; ayrinti?: string };

export async function dosyaSecenekleriGetir(yalnizIcra = false): Promise<DosyaSecenegi[]> {
  const dosyalar = await prisma.davaDosyasi.findMany({
    where: yalnizIcra ? { tur: { kod: "icra_dosyasi" } } : {},
    orderBy: { kayitNo: "desc" },
    take: 1500,
    select: {
      id: true,
      kayitNo: true,
      dosyaNo: true,
      birimAdi: true,
      konu: true,
      muvekkiller: { select: { musteri: { select: { adSoyadUnvan: true } } } },
      karsiTaraflar: { select: { karsiTaraf: { select: { ad: true } } } },
    },
  });
  // Arama icin temel bilgiler hep elin altinda: birim, dosya no, konu, muvekkil ve karsi taraf.
  return dosyalar.map((d) => {
    const muvekkil = d.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ");
    const karsi = d.karsiTaraflar.map((k) => k.karsiTaraf.ad).filter(Boolean).join(", ");
    return {
      id: d.id,
      etiket: [kayitNoGoster(d.kayitNo), d.dosyaNo ?? "Esas no yok", d.konu].filter(Boolean).join(" · "),
      ayrinti: [
        `Birim: ${d.birimAdi || "belirtilmemiş"}`,
        muvekkil && `Müvekkil: ${muvekkil}`,
        karsi && `Karşı taraf: ${karsi}`,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  });
}

export async function kullaniciSecenekleriGetir() {
  return prisma.kullanici.findMany({ where: { aktifMi: true }, orderBy: { adSoyad: "asc" }, select: { id: true, adSoyad: true } });
}
