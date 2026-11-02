import { prisma } from "@/core/db/prisma";
import { donemBasi } from "./hafta";

// Kullanicidan su an beklenen is sayisi: acik parca/artci/surec gorevler (donemsel olanlar yalniz baslatildiysa)
// + bu donemdeki hedefi dolmamis periyodik gorevler. Kullanicinin kendi isleri ve yardim/destek istenen isler sayilir.
export async function beklenenIsSayisi(kullaniciId: string): Promise<number> {
  const benim = [{ sorumluId: kullaniciId }, { yardimlar: { some: { yardimciId: kullaniciId } } }];
  const yilBasi = donemBasi("YIL");
  const [acik, periyodikler] = await Promise.all([
    prisma.is.count({
      where: {
        tur: { not: "OPERASYONEL" },
        durum: { not: "TAMAMLANDI" },
        OR: benim,
        NOT: { tur: "DONEMSEL", durum: "BASLATILMADI" },
      },
    }),
    prisma.is.findMany({
      where: { tur: "OPERASYONEL", haftalikHedef: { gt: 0 }, OR: benim },
      select: { haftalikHedef: true, periyot: true, operasyonKayitlari: { where: { tarih: { gte: yilBasi } }, select: { tarih: true } } },
    }),
  ]);
  return acik + periyodikler.filter((o) => o.operasyonKayitlari.filter((k) => k.tarih >= donemBasi(o.periyot)).length < (o.haftalikHedef ?? 0)).length;
}
