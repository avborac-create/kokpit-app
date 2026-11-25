import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const baslik = "CMK dosyasına müvekkil TCKN alanı";
if (!(await prisma.gelistirme.findFirst({ where: { baslik } }))) {
  await prisma.gelistirme.create({ data: { baslik, modul: "CMK Dosyaları", akis: "YAYINDA", olgunluk: "PROTOTIP", yayinTarihi: new Date(),
    aciklama: "Dosya düzenleme formunda isteğe bağlı TCKN alanı; 11 hane + sağlama doğrulaması; dosya sayfasında başlık altında görünür. Yanlışsa form üzerinden düzeltilir veya boşaltılır.",
    gecmis: [{ t: new Date().toISOString(), kim: "Claude", ozet: "Sohbetten kaydedildi" }] } });
}
await prisma.$disconnect();
