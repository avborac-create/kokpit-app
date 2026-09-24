import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// withAccelerate(): DATABASE_URL "prisma+postgres://" (Accelerate)
// formatindaysa sorgulari HTTP uzerinden onceden havuzlanmis/aninda hazir
// bir baglanti ile yurutur - ham TCP+TLS Postgres baglantisinin sunucusuz
// (Vercel) ortamda HER istekte yeniden kurulmasi gereken maliyetini
// (bkz. kokpit performans arastirmasi: yerelde ilk sorgu ~3.2sn -
// baglanti kurulumu -, sonrakiler ~46ms idi; Vercel'de HER istek ayni
// ~1sn'lik bedeli odedigi icin baglanti hic yeniden kullanilamiyordu)
// ortadan kaldirir. DATABASE_URL ham "postgresql://" ise (ör. yerel
// gelistirme, `prisma migrate` gibi araclar) extension sorgu yurutmesini
// ETKILEMEZ - sadece Accelerate'e ozel `cacheStrategy` secenegini (hic
// kullanilmiyor) pasif birakir, bu yuzden KOSULSUZ uygulanabilir (bkz.
// Prisma dokumantasyonu - extension, gercek bir Accelerate baglantisi
// olmadan da PrismaClient'i bozmadan calisir).
//
// NOT (tip guvenligi): $extends(withAccelerate()) DOGRU CALISIR ama
// dondurdugu tip, TypeScript'in include/select sonuclarini derin
// cikarmasini kirar (bilinen bir Prisma extension sinirlamasi) - projedeki
// YUZLERCE include/select cagrisinin tipini bozardi. Calisma zamaninda
// sonuc SEKLI degismedigi (Accelerate saf bir HTTP proxy, veri aynen
// donuyor) icin export edilen degeri orijinal PrismaClient tipine geri
// sabitliyoruz - boylece tum modul/sorgu dosyalari hicbir degisiklik
// gerektirmeden eskisi gibi tam tip cikarimiyla calismaya devam eder.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function prismaOlustur(): PrismaClient {
  return new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? prismaOlustur();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
