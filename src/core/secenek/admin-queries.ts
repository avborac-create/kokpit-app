import { prisma } from "@/core/db/prisma";

// Yonetim panelinde (Ayarlar > Secenek Listeleri) tum listeleri, aktif ve
// pasif TUM degerleriyle birlikte getirir - secenekleriGetir()'in aksine
// burada pasif degerler de gorunmeli ki admin gerekirse tekrar aktif
// edebilsin.
export async function tumSecenekListeleriniListele() {
  const listeler = await prisma.secenekListesi.findMany({
    include: {
      degerler: { orderBy: { siraNo: "asc" } },
    },
    orderBy: { ad: "asc" },
  });

  // Prisma'nin Decimal degeri client bilesenine (SecenekDegeriSatiri) duz
  // (plain) obje olarak gecmez - sayiya cevrilir.
  return listeler.map((liste) => ({
    ...liste,
    degerler: liste.degerler.map((deger) => ({
      ...deger,
      maktuTutar: deger.maktuTutar !== null ? Number(deger.maktuTutar) : null,
    })),
  }));
}
