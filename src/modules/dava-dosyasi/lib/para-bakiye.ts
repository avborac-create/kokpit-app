import { prisma } from "@/core/db/prisma";
import { havuzTuretilenAlacak } from "@/modules/dava-dosyasi/lib/cari-sistem";

type Tx = Pick<typeof prisma, "cariHareketi" | "cariHesap">;

// Para Trafigi bakiyesi (Alacak - Borc). dosyaId verilirse dosya gorunumu
// (muvekkil havuzundan o dosyaya aktarilanlar ALACAK sayilir).
export async function paraBakiyesi(tx: Tx, musteriId: string, dosyaId?: string, grup: "MUVEKKIL" | "BORCLU" = "MUVEKKIL") {
  const para = await tx.cariHesap.findFirst({ where: { paraHesabiMi: true, grup } });
  if (!para) throw new Error("Para Trafiği hesabı bulunamadı.");
  const where = { musteriId, hesapId: para.id, ...(dosyaId ? { dosyaId } : {}) };
  const gruplar = await tx.cariHareketi.groupBy({ by: ["yon", "havuzKaynakli"], where, _sum: { tutar: true } });
  let alacak = 0;
  let borcHavuzsuz = 0;
  let borcHavuz = 0;
  for (const g of gruplar) {
    const t = Number(g._sum.tutar ?? 0);
    if (g.yon === "ALACAK") alacak += t;
    else if (g.havuzKaynakli) borcHavuz += t;
    else borcHavuzsuz += t;
  }
  const bakiye = alacak - borcHavuzsuz - borcHavuz + (dosyaId ? havuzTuretilenAlacak({ alacak, borcHavuzsuz, borcHavuz }) : 0);
  return Math.round(bakiye * 100) / 100;
}

// Silme/geri alma sonrasi Para Trafigi'nin (muvekkil ve ilgili dosya) eksiye dusmemesi icin kontrol.
export async function eksiyeDusmeKontrolu(tx: Tx, musteriId: string, dosyaId: string | null) {
  for (const grup of ["MUVEKKIL", "BORCLU"] as const) {
    if ((await paraBakiyesi(tx, musteriId, undefined, grup)) < -0.001 || (dosyaId && (await paraBakiyesi(tx, musteriId, dosyaId, grup)) < -0.001)) {
      throw new Error("Bu işlem, virmanla kullanılmış parayı eksiye düşürür. Önce ilgili virmanı düzeltin ya da silin.");
    }
  }
}
