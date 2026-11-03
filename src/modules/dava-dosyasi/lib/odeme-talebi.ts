import { prisma } from "@/core/db/prisma";
import { dosyaEtiketiYaz, kapsamOzeti } from "@/modules/dava-dosyasi/lib/cari-sistem";

// tahakkuk/odenen/kalan: cari mantigi - ne kadar borclandirildi, ne kadar odendi, guncel bakiye.
export type TalepSatiri = { baslik: string; aciklama: string; tutar: number; tahakkuk?: number; odenen?: number; kalan?: number };
export type MasrafDokumuSatiri = { dosya: string; karsiTaraf?: string; tarih: string; tur: string; aciklama: string; tutar: number };

// Cari hesabin, belgeyi okuyan musterinin anlayacagi dildeki karsiligi.
// Hesap numaralari kurulumda degisebildigi icin hesap ADIYLA eslenir.
const HESAP_ACIKLAMALARI: { ad: RegExp; baslik: string; aciklama: string }[] = [
  { ad: /vekalet|vekâlet/i, baslik: "Avukatlık ücreti (vekâlet ücreti)", aciklama: "Büromuzun hizmet bedeli; vekâlet sözleşmesi gereği ödenecek ücret" },
  { ad: /harcama/i, baslik: "Dosya masrafları", aciklama: "Adınıza yapılan harç, posta, tebligat ve benzeri giderler" },
  { ad: /avans/i, baslik: "Masraf avansı", aciklama: "Dosya giderleri için büroya bırakılması istenen tutar" },
  { ad: /bloke/i, baslik: "Bloke / teminat tutarı", aciklama: "Dosya için ayrı tutulması gereken tutar" },
  { ad: /harç|harc/i, baslik: "Harç", aciklama: "Dosya için yatırılacak harçlar" },
];

const para2 = (n: number) => Math.round(n * 100) / 100;

// "Ne kadar isteyelim" onerisi: muvekkilin borclu oldugu hesaplar; muvekkilin
// bizde bekleyen parasi (Para Trafigi) ayri bir satir olarak dusulur.
export async function odemeTalebiVarsayilanlari(musteriId: string) {
  const [musteri, ozet] = await Promise.all([
    prisma.musteri.findUnique({ where: { id: musteriId }, select: { adSoyadUnvan: true } }),
    kapsamOzeti({ musteriId }),
  ]);

  const satirlar: TalepSatiri[] = ozet.hesaplar
    .filter((h) => !h.paraHesabiMi && !h.tutulanHesapMi && h.bakiye > 0.009)
    .map((h) => {
      const tanim = HESAP_ACIKLAMALARI.find((t) => t.ad.test(h.ad));
      return {
        baslik: tanim?.baslik ?? h.ad,
        aciklama: tanim?.aciklama ?? "Cari hesap bakiyesi",
        tutar: para2(h.bakiye),
        tahakkuk: para2(h.borc),
        odenen: para2(h.alacak),
        kalan: para2(h.bakiye),
      };
    });

  const bekleyenPara = para2(Math.max(0, ozet.paraBakiyesi));
  return { musteriAdi: musteri?.adSoyadUnvan ?? "", satirlar, bekleyenPara, net: para2(ozet.net) };
}

// Isteyen icin eklenebilen masraf dokumu: muvekkile yansitilan masraflar, dosya dosya.
export async function masrafDokumu(musteriId: string): Promise<MasrafDokumuSatiri[]> {
  const masraflar = await prisma.dosyaMasrafi.findMany({
    where: { yansitmaHedefi: "MUVEKKIL", dosya: { muvekkiller: { some: { musteriId } }, ekonomiDisi: false } },
    include: {
      tur: true,
      dosya: { select: { kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, birimAdi: true, anaDosya: { select: { kayitNo: true } }, karsiTaraflar: { select: { karsiTaraf: { select: { ad: true } } } } } },
    },
    orderBy: [{ tarih: "asc" }],
  });
  return masraflar.map((m) => ({
    karsiTaraf: m.dosya.karsiTaraflar.map((k) => k.karsiTaraf.ad).filter(Boolean).join(", ") || undefined,
    // Belgede dosya, birim adi ve esas numarasiyla yazilir (ör. "Bursa 18. İş Mahkemesi 2026/213"); bilgi yoksa KN numarasi.
    dosya: [m.dosya.birimAdi, m.dosya.dosyaNo].filter(Boolean).join(" ") || dosyaEtiketiYaz(m.dosya),
    tarih: m.tarih.toISOString().slice(0, 10),
    tur: m.tur.etiket,
    aciklama: m.aciklama,
    tutar: para2(Number(m.tutar)),
  }));
}
