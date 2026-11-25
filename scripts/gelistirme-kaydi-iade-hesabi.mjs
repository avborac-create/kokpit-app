import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const iz = (o) => ({ t: new Date().toISOString(), kim: "Claude", ozet: o });
const liste = [
  { baslik: "109 - İade Edilecek Tutarlar hesabı (müvekkile geri dönecek fazla para)", modul: "Dosya Ekonomisi", akis: "YAPILIYOR", olgunluk: "PROTOTIP",
    aciklama: "Harcama vb. hesapta artan, müvekkile iade edilecek para 109'a virmanlanır; iade yapılınca 'İade Edildi' kaydı girilir. Emanet hesabından ayrıdır (Emanet = müvekkil adına bir yere ödenecek para)." },
  { baslik: "Dosyada 'İade edilecek' rozeti ve dosya/müvekkil özetinde ayrı satır", modul: "Dosya Ekonomisi", akis: "YAPILIYOR", olgunluk: "PROTOTIP",
    aciklama: "109 hesabında duran tutar dosya başlığında ve ekonomi özetinde 'İade edilecek' olarak ayrı görünür; net bakiyeyi bozmaz." },
  { baslik: "İade bekleyen tutar için otomatik görev (iade edilince kendiliğinden kapanır)", modul: "Görevler", akis: "YAPILIYOR", olgunluk: "PROTOTIP",
    aciklama: "109 hesabında bakiye varsa dosya başına tek görev açılır; bakiye sıfırlanınca otomatik kapanır." },
  { baslik: "Büro geneli 'İadesi bekleyen tutarlar' listesi", modul: "Finans", akis: "YAPILIYOR", olgunluk: "PROTOTIP",
    aciklama: "Tüm dosyalarda 109 hesabında bekleyen tutarlar, müvekkil ve dosya bazında tek listede." },
];
for (const g of liste) {
  const mevcut = await prisma.gelistirme.findFirst({ where: { baslik: g.baslik } });
  if (mevcut) { console.log("Zaten var:", g.baslik); continue; }
  await prisma.gelistirme.create({ data: { baslik: g.baslik, aciklama: g.aciklama, modul: g.modul, akis: g.akis, olgunluk: g.olgunluk, gecmis: [iz("Bu sohbetten kaydedildi")] } });
  console.log("Eklendi:", g.baslik);
}
await prisma.$disconnect();
