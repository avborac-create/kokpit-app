import { prisma } from "@/core/db/prisma";
import { buHaftaBasi } from "./hafta";

// Kullanicidan su an beklenen is sayisi: acik parca/surec gorevler + bu haftaki hedefi dolmamis operasyonel gorevler.
// Kullanicinin kendi isleri ve yardim/destek istenen isler sayilir.
export async function beklenenIsSayisi(kullaniciId: string): Promise<number> {
  const benim = [{ sorumluId: kullaniciId }, { yardimlar: { some: { yardimciId: kullaniciId } } }];
  const [acik, operasyonlar] = await Promise.all([
    prisma.is.count({ where: { tur: { not: "OPERASYONEL" }, durum: { not: "TAMAMLANDI" }, OR: benim } }),
    prisma.is.findMany({
      where: { tur: "OPERASYONEL", haftalikHedef: { gt: 0 }, OR: benim },
      select: { haftalikHedef: true, _count: { select: { operasyonKayitlari: { where: { tarih: { gte: buHaftaBasi() } } } } } },
    }),
  ]);
  return acik + operasyonlar.filter((o) => o._count.operasyonKayitlari < (o.haftalikHedef ?? 0)).length;
}
