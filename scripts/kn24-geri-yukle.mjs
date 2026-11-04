// KN-24 dosyasini ve bagli kayitlarini, silmeden once alinan anlik goruntuden geri yukler.
// Kullanim: node -r dotenv/config scripts/kn24-geri-yukle.mjs
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const DOSYA = "D:/KOKPIT-YEDEKLERI/kn24-silinen-kayitlar.json";
const tarihMi = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const g = JSON.parse(fs.readFileSync(DOSYA, "utf8"), (_k, v) => (typeof v === "string" && tarihMi.test(v) ? new Date(v) : v));

const p = new PrismaClient();
await p.$transaction(async (tx) => {
  if (await tx.davaDosyasi.findUnique({ where: { id: g.dosya.id } })) throw new Error("Dosya zaten var; geri yukleme yapilmadi.");
  await tx.davaDosyasi.create({ data: g.dosya });
  await tx.dosyaMuvekkili.createMany({ data: g.dosyaMuvekkili });
  await tx.muvekkilAnlasma.createMany({ data: g.muvekkilAnlasma });
  await tx.dosyaMasrafi.createMany({ data: g.dosyaMasrafi });
  await tx.cariHareketi.createMany({ data: g.cariHareketi });
});
console.log("Geri yuklendi:", {
  dosya: 1,
  dosyaMuvekkili: g.dosyaMuvekkili.length,
  muvekkilAnlasma: g.muvekkilAnlasma.length,
  dosyaMasrafi: g.dosyaMasrafi.length,
  cariHareketi: g.cariHareketi.length,
});
await p.$disconnect();
