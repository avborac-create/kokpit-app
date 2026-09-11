import { prisma } from "@/core/db/prisma";

// Herhangi bir modulun "durum", "tip", "kaynak" gibi genisletilebilir
// alanlarini doldurmak icin kullandigi ortak sorgu. Yeni bir liste anahtari
// eklemek icin prisma/seed.ts icindeki SECENEK_LISTELERI dizisine satir
// eklemek yeterlidir.
export async function secenekleriGetir(listeAnahtari: string) {
  const liste = await prisma.secenekListesi.findUnique({
    where: { anahtar: listeAnahtari },
    include: {
      degerler: {
        where: { aktifMi: true },
        orderBy: { siraNo: "asc" },
      },
    },
  });

  return liste?.degerler ?? [];
}
