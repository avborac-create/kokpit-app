// Mevcut kayitlarda kisa unvan denetimi. Varsayilan: yalniz listeler. --uygula: musteriler icin
// "Tam unvani tamamla" gorevi acar (kullanici: av.bora.c@gmail.com'daki hesap). Veriyi degistirmez.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { unvanKisaMi } from "../src/core/unvan/unvan-kontrol";
import { unvanGoreviOlustur } from "../src/core/unvan/unvan-gorevi";

const p = new PrismaClient();
const uygula = process.argv.includes("--uygula");
const k = await p.kullanici.findFirst({ where: { eposta: "av.bora.c@gmail.com" }, select: { id: true } });
const musteriler = await p.musteri.findMany({ select: { id: true, adSoyadUnvan: true, tip: { select: { kod: true } } } });
let m = 0;
for (const x of musteriler) {
  if (unvanKisaMi(x.adSoyadUnvan, x.tip.kod === "tuzel_kisi")) {
    m++;
    console.log(`MUVEKKIL: ${x.adSoyadUnvan}  [${x.tip.kod}]`);
    if (uygula) await unvanGoreviOlustur({ ad: x.adSoyadUnvan, tur: "Müvekkil", kayitId: x.id, kullaniciId: k?.id ?? null });
  }
}
const taraflar = await p.karsiTaraf.findMany({ select: { id: true, ad: true } });
let t = 0;
for (const x of taraflar) if (unvanKisaMi(x.ad)) { t++; console.log(`KARSI TARAF: ${x.ad}`); }
console.log(`${uygula ? "GOREV ACILDI" : "KURU CALISMA"}: ${m} muvekkil, ${t} karsi taraf kisa unvanli.`);
await p.$disconnect();
