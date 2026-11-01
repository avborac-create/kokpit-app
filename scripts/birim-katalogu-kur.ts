// Tek seferlik: mevcut dosyalardaki birim adlarini UYAP yazimina duzeltir ve
// adli birim katalogunu bunlarla doldurur. Varsayilan: yalniz gosterir; yazmak icin --uygula.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ADLIYELER, BIRIM_TURLERI, birimAdiOlustur } from "../src/modules/dava-dosyasi/lib/adli-birim-sabitleri";

const DUZELTME: Record<string, string> = {
  "İstanbul 10 ATM": "İstanbul 10. Asliye Ticaret Mahkemesi",
  "İstanbul 10.Asliye Ticaret Mahkemesi": "İstanbul 10. Asliye Ticaret Mahkemesi",
  "Anadolu 11. İcra Müdürlüğü": "İstanbul Anadolu 11. İcra Dairesi",
  "Anadolu 16. İcra Hukuk Mahkemesi": "İstanbul Anadolu 16. İcra Hukuk Mahkemesi",
  "İstanbul Anadolu 8. Sulh Ceza Hâkimliği": "İstanbul Anadolu 8. Sulh Ceza Hakimliği",
};

function ayristir(ad: string) {
  const adliye = [...ADLIYELER].sort((a, b) => b.length - a.length).find((a) => ad.startsWith(a + " "));
  const tur = BIRIM_TURLERI.find((t) => ad.endsWith(" " + t.ad));
  if (!adliye || !tur) return null;
  const orta = ad.slice(adliye.length + 1, ad.length - tur.ad.length - 1).trim();
  const sira = orta === "" ? null : /^(\d{1,3})\.$/.test(orta) ? Number(orta.slice(0, -1)) : NaN;
  if (Number.isNaN(sira)) return null;
  if (birimAdiOlustur(adliye, tur.ad, sira) !== ad) return null;
  return { adliye, tur: tur.ad, sira };
}

async function main() {
  const uygula = process.argv.includes("--uygula");
  const prisma = new PrismaClient();
  const dosyalar = await prisma.davaDosyasi.findMany({ where: { birimAdi: { not: null } }, select: { id: true, birimAdi: true } });
  const katalog = new Map<string, NonNullable<ReturnType<typeof ayristir>>>();
  let guncellenecek = 0;
  for (const d of dosyalar) {
    const eski = d.birimAdi!;
    const yeni = DUZELTME[eski] ?? eski;
    const p = ayristir(yeni);
    if (!p) {
      console.log(`ATLANDI (ayristirilamadi): ${eski}`);
      continue;
    }
    katalog.set(yeni, p);
    if (yeni !== eski) {
      guncellenecek++;
      console.log(`DUZELT: ${eski}  ->  ${yeni}`);
      if (uygula) await prisma.davaDosyasi.update({ where: { id: d.id }, data: { birimAdi: yeni } });
    }
  }
  for (const [ad, p] of katalog) {
    console.log(`KATALOG: ${ad}`);
    if (uygula) await prisma.adliBirim.upsert({ where: { ad }, update: {}, create: { ad, ...p } });
  }
  console.log(`${uygula ? "UYGULANDI" : "KURU CALISMA"}: ${guncellenecek} dosya duzeltildi, ${katalog.size} birim katalogda.`);
  await prisma.$disconnect();
}
main();
