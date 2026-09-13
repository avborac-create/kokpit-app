import { prisma } from "@/core/db/prisma";

// Yonetim panelinde (Ayarlar > Secenek Listeleri) tum listeleri, aktif ve
// pasif TUM degerleriyle birlikte getirir - secenekleriGetir()'in aksine
// burada pasif degerler de gorunmeli ki admin gerekirse tekrar aktif
// edebilsin.
export async function tumSecenekListeleriniListele() {
  return prisma.secenekListesi.findMany({
    include: {
      degerler: { orderBy: { siraNo: "asc" } },
    },
    orderBy: { ad: "asc" },
  });
}
