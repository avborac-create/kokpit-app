import { prisma } from "@/core/db/prisma";
import { pushGonder } from "@/core/bildirim/push";
import { dosyaEtiketiYaz, kapsamOzeti } from "@/modules/dava-dosyasi/lib/cari-sistem";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// Eksi bakiye veren dosyalarda muvekkilden para istenmesi isini finans yetkililerine gorev olarak hatirlatir.
// Gorevin kaynagi: "eksi:<dosyaId>". Dosya basina tek acik gorev vardir; ertelenirse (vade = erteleme tarihi)
// o tarihe kadar uyari listesinde gorunmez, tarih gelince yeniden cikar. Gorev kapaninca (para istendi) ve
// bakiye hala eksiyse YENIDEN_GUN gun sonra yeniden hatirlatilir.
export const EKSI_ONEKI = "eksi:";
const YENIDEN_GUN = 7;

export async function eksiBakiyeGorevleriniGuncelle(): Promise<{ acilan: number; kapanan: number }> {
  const sorumlular = await prisma.kullanici.findMany({ where: { aktifMi: true, finansYetkilisiMi: true }, select: { id: true } });
  const sorumluIdleri = sorumlular.map((s) => s.id);

  const cift = await prisma.cariHareketi.findMany({
    where: { dosyaId: { not: null }, dosya: { ekonomiDisi: false } },
    distinct: ["dosyaId", "musteriId"],
    select: { dosyaId: true, musteriId: true },
  });

  const mevcutlar = await prisma.is.findMany({ where: { kaynak: { startsWith: EKSI_ONEKI } }, select: { id: true, kaynak: true, durum: true, tamamlanmaTarihi: true } });
  const dosyaGorevleri = new Map<string, typeof mevcutlar>();
  for (const m of mevcutlar) {
    const dosyaId = (m.kaynak ?? "").slice(EKSI_ONEKI.length);
    dosyaGorevleri.set(dosyaId, [...(dosyaGorevleri.get(dosyaId) ?? []), m]);
  }

  let acilan = 0;
  let kanan = 0;
  const simdi = Date.now();
  for (const c of cift) {
    if (!c.dosyaId) continue;
    const ozet = await kapsamOzeti({ musteriId: c.musteriId, dosyaId: c.dosyaId });
    // Muvekkilden istenecek tutar: karsi taraf / adliye hesaplari disindaki eksi bakiyeler (dosya basligindaki kirmizi etiketlerle ayni kural).
    const eksik = ozet.hesaplar
      .filter((h) => !h.tutulanHesapMi && h.grup !== "BORCLU")
      .map((h) => Math.round((h.paraHesabiMi ? h.bakiye : -h.bakiye) * 100) / 100)
      .filter((t) => t < 0)
      .reduce((t, x) => t + Math.abs(x), 0);

    const onceki = dosyaGorevleri.get(c.dosyaId) ?? [];
    const acik = onceki.find((o) => o.durum !== "TAMAMLANDI");

    if (eksik <= 0.001) {
      // Bakiye duzeldi: acik gorev kendiliginden kapanir.
      if (acik) {
        await prisma.is.update({ where: { id: acik.id }, data: { durum: "TAMAMLANDI", tamamlanmaTarihi: new Date(), guncellemeTarihi: new Date() } });
        await prisma.isYorumu.create({ data: { isId: acik.id, yazanId: sorumluIdleri[0] ?? null, metin: "Bakiye eksiden çıktığı için görev otomatik kapandı." } }).catch(() => {});
        kanan++;
      }
      continue;
    }
    if (acik) continue;
    const sonKapanma = onceki.reduce((en, o) => Math.max(en, o.tamamlanmaTarihi?.getTime() ?? 0), 0);
    if (sonKapanma && simdi - sonKapanma < YENIDEN_GUN * 86_400_000) continue;

    const dosya = await prisma.davaDosyasi.findUnique({
      where: { id: c.dosyaId },
      select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, anaDosya: { select: { kayitNo: true } } },
    });
    if (!dosya) continue;
    const etiket = dosyaEtiketiYaz(dosya);
    const is = await prisma.is.create({
      data: {
        baslik: `Müvekkilden bakiye istenecek: ${etiket}`,
        aciklama:
          `${etiket} dosyası eksi bakiye veriyor: ${para.format(eksik)} müvekkilden istenecek.\n` +
          `Müvekkile hesap özeti gönderip parayı isteyin. Şimdi uygun değilse Görevler sayfasındaki "Bakiye hatırlatmaları" bölümünden ileri bir tarihe erteleyebilirsiniz.\n` +
          `Dosya: /kokpit/dava-dosyalari/${c.dosyaId}?sekme=ekonomi`,
        tur: "PARCA",
        kaynak: `${EKSI_ONEKI}${c.dosyaId}`,
        sorumluId: sorumluIdleri[0] ?? null,
        olusturanId: sorumluIdleri[0] ?? null,
      },
    });
    acilan++;
    if (sorumluIdleri.length > 0) {
      try {
        await pushGonder(sorumluIdleri, { baslik: "Müvekkilden bakiye istenecek", metin: `${etiket}: ${para.format(eksik)}`.slice(0, 180), url: `/kokpit/isler/${is.id}`, etiket: `is-${is.id}` });
      } catch {
        // bildirim gonderilemese de gorev acilmistir
      }
    }
  }
  return { acilan, kapanan: kanan };
}
