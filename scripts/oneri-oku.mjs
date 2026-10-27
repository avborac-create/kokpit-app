import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

// Kullanicilarin "Oneri Yolla" ile gonderdigi, henuz islenmemis onerileri
// listeler (salt okunur). Ekran goruntuleri verilen klasore yazilir.
// Kullanim: node -r dotenv/config scripts/oneri-oku.mjs [gorsel-klasoru] [--hepsi]
const prisma = new PrismaClient();
const args = process.argv.slice(2);
const hepsi = args.includes("--hepsi");
const klasor = args.find((a) => !a.startsWith("--"));

const oneriler = await prisma.oneri.findMany({
  where: hepsi ? {} : { islendiMi: false },
  include: { kullanici: true },
  orderBy: { olusturmaTarihi: "asc" },
});

if (oneriler.length === 0) console.log("Bekleyen öneri yok.");
if (klasor) mkdirSync(klasor, { recursive: true });

for (const o of oneriler) {
  let gorsel = "";
  if (klasor && o.gorselVeri) {
    const dosya = path.join(klasor, `oneri-${o.id}.jpg`);
    writeFileSync(dosya, Buffer.from(o.gorselVeri.split(",")[1] ?? "", "base64"));
    gorsel = `\n  görsel: ${dosya}`;
  }
  console.log(
    `[${o.id}] ${o.olusturmaTarihi.toLocaleString("tr-TR")} · ${o.kullanici.adSoyad} · ${o.sayfaYolu}${o.islendiMi ? " · (işlendi)" : ""}\n  ${o.metin.replace(/\n/g, "\n  ")}${gorsel}\n`,
  );
}
await prisma.$disconnect();
