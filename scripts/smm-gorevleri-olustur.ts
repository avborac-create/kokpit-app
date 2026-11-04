// Mevcut vekalet ucreti (Akdi/Karsi Vekalet) girisi olan tum dosyalar icin serbest meslek makbuzu gorevlerini bir kez acar.
// Tekrar calistirmak guvenlidir: ayni toplam icin ikinci gorev acilmaz.
import { prisma } from "@/core/db/prisma";
import { smmGorevleriniGuncelle } from "@/modules/dava-dosyasi/lib/smm-gorevi";

async function main() {
  const hesaplar = await prisma.cariHesap.findMany({
    where: { OR: [{ ad: { contains: "Akdi Vekalet", mode: "insensitive" } }, { ad: { contains: "Karşı Vekalet", mode: "insensitive" } }] },
    select: { id: true },
  });
  const satirlar = await prisma.cariHareketi.findMany({
    where: { yon: "ALACAK", dosyaId: { not: null }, hesapId: { in: hesaplar.map((h) => h.id) } },
    select: { dosyaId: true },
    distinct: ["dosyaId"],
  });
  const idler = satirlar.map((s) => s.dosyaId!).filter(Boolean);
  const acilan = await smmGorevleriniGuncelle(idler, false);
  console.log(`Vekalet girisi olan dosya: ${idler.length}, acilan gorev: ${acilan}`);
}
main().finally(() => prisma.$disconnect());
