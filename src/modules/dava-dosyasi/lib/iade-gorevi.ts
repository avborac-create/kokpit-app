import { prisma } from "@/core/db/prisma";
import { pushGonder } from "@/core/bildirim/push";
import { dosyaEtiketiYaz, kapsamOzeti } from "@/modules/dava-dosyasi/lib/cari-sistem";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// 109 - Iade Edilecek Tutarlar hesabinda bakiye varsa finans yetkililerine "muvekkile iade et" gorevi acilir.
// Gorevin kaynagi: "iade:<dosyaId>"; dosya basina tek acik gorev. Iade kaydi girilip bakiye sifirlaninca
// gorev kendiliginden kapanir. Kapsam verilirse yalniz o dosya (anlik), verilmezse tum dosyalar (gunluk cron) taranir.
export const IADE_ONEKI = "iade:";

type Kapsam = { musteriId: string; dosyaId: string };

export async function iadeGorevleriniGuncelle(kapsam?: Kapsam, bildir = false): Promise<{ acilan: number; kapanan: number }> {
  const sorumlular = await prisma.kullanici.findMany({ where: { aktifMi: true, finansYetkilisiMi: true }, select: { id: true } });
  const sorumluIdleri = sorumlular.map((s) => s.id);

  const ciftler: Kapsam[] = kapsam
    ? [kapsam]
    : (
        await prisma.cariHareketi.findMany({
          where: { dosyaId: { not: null }, hesap: { iadeHesabiMi: true } },
          distinct: ["dosyaId", "musteriId"],
          select: { dosyaId: true, musteriId: true },
        })
      ).flatMap((c) => (c.dosyaId ? [{ musteriId: c.musteriId, dosyaId: c.dosyaId }] : []));

  // Tum dosyalar taramasinda, bakiyesi sifirlanmis ama gorevi hala acik olanlar da kapanabilsin diye acik gorevler eklenir.
  if (!kapsam) {
    const acikGorevler = await prisma.is.findMany({ where: { kaynak: { startsWith: IADE_ONEKI }, durum: { not: "TAMAMLANDI" } }, select: { kaynak: true } });
    for (const g of acikGorevler) {
      const dosyaId = (g.kaynak ?? "").slice(IADE_ONEKI.length);
      if (!dosyaId || ciftler.some((c) => c.dosyaId === dosyaId)) continue;
      const hareket = await prisma.cariHareketi.findFirst({ where: { dosyaId }, select: { musteriId: true } });
      if (hareket) ciftler.push({ musteriId: hareket.musteriId, dosyaId });
    }
  }

  let acilan = 0;
  let kapanan = 0;
  for (const c of ciftler) {
    const ozet = await kapsamOzeti({ musteriId: c.musteriId, dosyaId: c.dosyaId });
    const bekleyen = Math.round(ozet.iadeBekleyen * 100) / 100;
    const kaynak = `${IADE_ONEKI}${c.dosyaId}`;
    const acik = await prisma.is.findFirst({ where: { kaynak, durum: { not: "TAMAMLANDI" } }, select: { id: true } });

    if (bekleyen <= 0.001) {
      if (acik) {
        await prisma.is.update({ where: { id: acik.id }, data: { durum: "TAMAMLANDI", tamamlanmaTarihi: new Date(), guncellemeTarihi: new Date() } });
        await prisma.isYorumu.create({ data: { isId: acik.id, yazanId: sorumluIdleri[0] ?? null, metin: "İade kaydı girildiği için görev otomatik kapandı." } }).catch(() => {});
        kapanan++;
      }
      continue;
    }
    if (acik) continue;

    const dosya = await prisma.davaDosyasi.findUnique({
      where: { id: c.dosyaId },
      select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, anaDosya: { select: { kayitNo: true } } },
    });
    if (!dosya) continue;
    const etiket = dosyaEtiketiYaz(dosya);
    const is = await prisma.is.create({
      data: {
        baslik: `Müvekkile iade edilecek: ${etiket}`,
        aciklama:
          `${etiket} dosyasında müvekkile iade edilecek ${para.format(bekleyen)} var (109 - İade Edilecek Tutarlar).\n` +
          `Parayı müvekkile gönderince dosyanın Ekonomi sekmesinde 109 hesabına "İade Edildi" kaydı girin; görev kendiliğinden kapanır.\n` +
          `Dosya: /kokpit/dava-dosyalari/${c.dosyaId}?sekme=ekonomi`,
        tur: "PARCA",
        kaynak,
        sorumluId: sorumluIdleri[0] ?? null,
        olusturanId: sorumluIdleri[0] ?? null,
      },
    });
    acilan++;
    if (bildir && sorumluIdleri.length > 0) {
      try {
        await pushGonder(sorumluIdleri, { baslik: "Müvekkile iade edilecek tutar", metin: `${etiket}: ${para.format(bekleyen)}`.slice(0, 180), url: `/kokpit/isler/${is.id}`, etiket: `is-${is.id}` });
      } catch {
        // bildirim gonderilemese de gorev acilmistir
      }
    }
  }
  return { acilan, kapanan };
}
