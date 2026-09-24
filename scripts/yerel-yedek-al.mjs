import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Prisma Postgres kendi tarafinda da yedek tutuyor (Prisma Console >
// Backups), ama arkadas tavsiyesi geregi bagimsiz bir GUVENCE olarak
// veritabaninin TAMAMINI duzenli olarak bu bilgisayara da indiriyoruz -
// tek bir saglayiciya (Vercel/Prisma) bagimli kalmamak icin. pg_dump
// yuklu olmadigindan SQL dump yerine her tabloyu JSON olarak diziyoruz;
// geri yukleme gerekirse bu JSON'lardan Prisma create/upsert ile
// yeniden yazilabilir.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const YEDEK_KLASORU = path.join(__dirname, "..", "yedekler");
const SAKLAMA_GUNU = 30; // 30 gunden eski yedekler otomatik silinir

const prisma = new PrismaClient();

function zamanDamgasi() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

async function main() {
  mkdirSync(YEDEK_KLASORU, { recursive: true });

  const modelAnahtarlari = Object.keys(prisma).filter(
    (k) => !k.startsWith("$") && !k.startsWith("_") && typeof prisma[k]?.findMany === "function",
  );

  const veri = {};
  let toplamKayit = 0;
  for (const anahtar of modelAnahtarlari) {
    const kayitlar = await prisma[anahtar].findMany();
    veri[anahtar] = kayitlar;
    toplamKayit += kayitlar.length;
  }

  const dosyaAdi = `kokpit-yedek-${zamanDamgasi()}.json`;
  const tamYol = path.join(YEDEK_KLASORU, dosyaAdi);
  writeFileSync(tamYol, JSON.stringify(veri, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2), "utf-8");

  console.log(`Yedek alindi: ${dosyaAdi} (${modelAnahtarlari.length} tablo, ${toplamKayit} kayit)`);

  // Eski yedekleri temizle (diskin dolmamasi icin)
  const simdi = Date.now();
  for (const dosya of readdirSync(YEDEK_KLASORU)) {
    if (!dosya.startsWith("kokpit-yedek-")) continue;
    const dosyaYolu = path.join(YEDEK_KLASORU, dosya);
    const yasGun = (simdi - statSync(dosyaYolu).mtimeMs) / (1000 * 60 * 60 * 24);
    if (yasGun > SAKLAMA_GUNU) {
      unlinkSync(dosyaYolu);
      console.log(`Eski yedek silindi: ${dosya}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("Yedekleme HATASI:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
