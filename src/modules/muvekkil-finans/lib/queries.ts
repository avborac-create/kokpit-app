import { prisma } from "@/core/db/prisma";

// Sol menudeki "Müvekkil Finans" sayfasinin muvekkil seciciyi doldurmak
// icin kullandigi hafif liste - bkz. src/app/kokpit/muvekkil-finans/page.tsx.
export async function musterileriFinansIcinListele() {
  return prisma.musteri.findMany({
    orderBy: { adSoyadUnvan: "asc" },
    select: { id: true, adSoyadUnvan: true },
  });
}

export async function musteriFinansHareketleriniListele(musteriId: string) {
  return prisma.musteriFinansHareketi.findMany({
    where: { musteriId },
    include: { davaDosyasi: { select: { id: true, konu: true, kayitNo: true } } },
    orderBy: { tarih: "desc" },
  });
}

// 5 basit soruya (bkz. ARCHITECTURE.md "Muvekkil Finans V1") cevap veren
// hesaplanan ozet - hicbir yerde saklanmaz, her cagrida MusteriFinansHareketi
// satirlarindan islemTuru bazinda toplanir.
export async function musteriFinansOzetiHesapla(musteriId: string) {
  const toplamlar = await prisma.musteriFinansHareketi.groupBy({
    by: ["islemTuru"],
    where: { musteriId },
    _sum: { tutar: true },
  });

  const toplamHaritasi = new Map(toplamlar.map((t) => [t.islemTuru, Number(t._sum.tutar ?? 0)]));
  const paraGirisi = toplamHaritasi.get("PARA_GIRISI") ?? 0;
  const masraf = toplamHaritasi.get("MASRAF") ?? 0;
  const disKurumaAktarim = toplamHaritasi.get("DIS_KURUMA_AKTARIM") ?? 0;
  const disKurumdanIade = toplamHaritasi.get("DIS_KURUMDAN_IADE") ?? 0;
  const musteriyeIade = toplamHaritasi.get("MUSTERIYE_IADE") ?? 0;

  return {
    alinanToplam: paraGirisi,
    gerceklesenMasraf: masraf,
    disKurumda: disKurumaAktarim - disKurumdanIade,
    musteriyeIade,
    bizdeKalan: paraGirisi - masraf - disKurumaAktarim + disKurumdanIade - musteriyeIade,
  };
}
