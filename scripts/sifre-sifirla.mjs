// Bir kullanicinin sifresini sifirlar (unutulan yonetici sifresi icin).
//   node -r dotenv/config scripts/sifre-sifirla.mjs admin@eceshukuk.com
// Yeni sifreyi KENDI terminalinizde, ekranda gorunmeden yazarsiniz; kimseyle paylasilmaz,
// hicbir dosyaya yazilmaz. Sifre uygulamadakiyle ayni yontemle (bcrypt, 12 tur) saklanir.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "readline";

const eposta = process.argv[2];
if (!eposta) {
  console.error("Kullanim: node -r dotenv/config scripts/sifre-sifirla.mjs <eposta>");
  process.exit(1);
}

function gizliSor(soru) {
  return new Promise((coz) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (metin) => {
      // Yazilan karakterleri gosterme; yalniz soruyu ve satir sonunu goster.
      if (metin.includes(soru) || metin === "\r\n" || metin === "\n") rl.output.write(metin);
    };
    rl.question(soru, (cevap) => {
      rl.close();
      console.log("");
      coz(cevap);
    });
  });
}

const prisma = new PrismaClient();
try {
  const kullanici = await prisma.kullanici.findUnique({ where: { eposta }, select: { id: true, adSoyad: true, aktifMi: true } });
  if (!kullanici) {
    console.error(`"${eposta}" e-postasına sahip kullanıcı bulunamadı.`);
    process.exit(1);
  }
  const yeni = await gizliSor("Yeni şifre (en az 8 karakter): ");
  const tekrar = await gizliSor("Yeni şifre (tekrar): ");
  if (yeni.length < 8) throw new Error("Şifre en az 8 karakter olmalı.");
  if (yeni !== tekrar) throw new Error("İki şifre aynı değil.");

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { sifreHash: await bcrypt.hash(yeni, 12), aktifMi: true },
  });
  console.log(`✓ ${kullanici.adSoyad} (${eposta}) için şifre güncellendi. Yeni şifrenizle giriş yapabilirsiniz.`);
} catch (hata) {
  console.error(hata instanceof Error ? hata.message : hata);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
