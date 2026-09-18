import { unstable_cache } from "next/cache";
import { prisma } from "@/core/db/prisma";

// Herhangi bir modulun "durum", "tip", "kaynak" gibi genisletilebilir
// alanlarini doldurmak icin kullandigi ortak sorgu - neredeyse HER liste/
// form sayfasinda (bazen tek sayfada 5 kez) cagirilir. Kokpit layout'u
// dinamik oldugu icin bu, cache'lenmezse her navigasyonda tekrar tekrar
// DB'ye gidilmesi anlamina gelirdi (bkz. menuDuzeniniGetir'deki ayni
// duzeltme). "secenek-listeleri" etiketiyle cache'lenir; Ayarlar >
// Seçenek Listeleri panelinden yapilan HER duzenleme (admin-actions.ts)
// bu etiketi updateTag ile gecersiz kilar - tek bir liste degil TUM
// listeler icin (dusuk siklikli bir admin islemi oldugundan basitligi
// tercih edildi, hangi listenin degistigini ayrica hesaplamaya gerek yok).
export const secenekleriGetir = unstable_cache(
  async (listeAnahtari: string) => {
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
  },
  ["secenekleri-getir"],
  { tags: ["secenek-listeleri"] },
);
