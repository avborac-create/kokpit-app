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
// Katalog niteligindeki listeler (hukuk dali, dava turu, dosya turu...) acilir menuede ALFABETIK gosterilir
// ("Diger" ile baslayan degerler en sona). Sirasi anlam tasiyan listeler (durum akislari, oncelik,
// masraf gruplari, cari kodlar...) Ayarlar'daki elle siraya (siraNo) gore kalir.
const ALFABETIK_LISTELER = new Set([
  "hukuk_dali",
  "dava_turu",
  "hukuki_iliski_turu",
  "hukuki_mudahale_turu",
  "dosya_turu",
  "yargi_kolu",
  "muvekkil_sifati",
  "masraf_turu",
  "fatura_turu",
  "odeme_yontemi",
]);

function alfabetikSirala<T extends { etiket: string }>(liste: T[]): T[] {
  const sonaMi = (e: string) => /^diğer/i.test(e.trim());
  return [...liste].sort((a, b) => Number(sonaMi(a.etiket)) - Number(sonaMi(b.etiket)) || a.etiket.localeCompare(b.etiket, "tr-TR"));
}

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

    // Prisma'nin Decimal degeri client bilesenlerine duz obje olarak
    // gecmez (bkz. masraf-turu-tutar-alani.tsx) - sayiya cevrilir.
    const degerler = (liste?.degerler ?? []).map((deger) => ({
      ...deger,
      maktuTutar: deger.maktuTutar !== null ? Number(deger.maktuTutar) : null,
    }));
    return ALFABETIK_LISTELER.has(listeAnahtari) ? alfabetikSirala(degerler) : degerler;
  },
  ["secenekleri-getir"],
  { tags: ["secenek-listeleri"] },
);
