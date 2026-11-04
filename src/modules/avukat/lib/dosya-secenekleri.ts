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
    },
  });
  return dosyalar.map((d) => ({
    id: d.id,
    etiket: `${kayitNoGoster(d.kayitNo)} · ${d.dosyaNo ?? "Esas no yok"} · ${d.konu}`,
    ayrinti: [d.birimAdi, d.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ")].filter(Boolean).join(" — "),
  }));
}

export async function kullaniciSecenekleriGetir() {
  return prisma.kullanici.findMany({ where: { aktifMi: true }, orderBy: { adSoyad: "asc" }, select: { id: true, adSoyad: true } });
}
