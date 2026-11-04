import { prisma } from "@/core/db/prisma";
import { pushGonder } from "@/core/bildirim/push";
import { dosyaEtiketiYaz } from "@/modules/dava-dosyasi/lib/cari-sistem";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// Vekalet ucreti (Akdi Vekalet / Karsi Vekalet) hesaplarina para girisi oldugunda serbest meslek makbuzu (SMM)
// kesilip kesilmedigini finans yetkilisine gorev olarak hatirlatir.
// Gorevin kaynagi: "smm:<dosyaId>:<hesapNo>:<o ana kadarki toplam alacak (kurus)>". Ayni toplam icin ikinci gorev acilmaz;
// hesaba yeni para girerse (toplam artarsa) yalniz artis icin yeni gorev acilir. Gorev kapaninca (SMM kestim) tekrar acilmaz.
export const SMM_ONEKI = "smm:";

export async function smmGorevleriniGuncelle(dosyaIdleri: string[], bildirim = true): Promise<number> {
  const idler = [...new Set(dosyaIdleri.filter(Boolean))];
  if (idler.length === 0) return 0;
  const hesaplar = await prisma.cariHesap.findMany({
    where: { OR: [{ ad: { contains: "Akdi Vekalet", mode: "insensitive" } }, { ad: { contains: "Karşı Vekalet", mode: "insensitive" } }] },
    select: { id: true, no: true, ad: true },
  });
  if (hesaplar.length === 0) return 0;
  // Gorev finans yetkilisine atanir (kisi degisse de rol uzerinden bulunur).
  // Yönetici hesapları da finans yetkisine sahip olabilir; makbuz görevi yöneticiye değil, asıl finans yetkilisine (yönetici olmayan) atanır.
  const sorumlu =
    (await prisma.kullanici.findFirst({ where: { aktifMi: true, finansYetkilisiMi: true, rol: { not: "YONETICI" } }, orderBy: { adSoyad: "asc" }, select: { id: true } })) ??
    (await prisma.kullanici.findFirst({ where: { aktifMi: true, finansYetkilisiMi: true }, select: { id: true } })) ??
    (await prisma.kullanici.findFirst({ where: { aktifMi: true, adSoyad: { contains: "Sınmaz", mode: "insensitive" } }, select: { id: true } }));

  let acilan = 0;
  for (const dosyaId of idler) {
    const gruplar = await prisma.cariHareketi.groupBy({
      by: ["hesapId"],
      where: { dosyaId, yon: "ALACAK", hesapId: { in: hesaplar.map((h) => h.id) } },
      _sum: { tutar: true },
    });
    if (gruplar.length === 0) continue;
    const dosya = await prisma.davaDosyasi.findUnique({
      where: { id: dosyaId },
      select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, anaDosya: { select: { kayitNo: true } } },
    });
    if (!dosya) continue;
    const etiket = dosyaEtiketiYaz(dosya);
    for (const g of gruplar) {
      const hesap = hesaplar.find((h) => h.id === g.hesapId);
      const toplam = Math.round(Number(g._sum.tutar ?? 0) * 100);
      if (!hesap || toplam <= 0) continue;
      const onek = `${SMM_ONEKI}${dosyaId}:${hesap.no}:`;
      const mevcut = await prisma.is.findMany({ where: { kaynak: { startsWith: onek } }, select: { kaynak: true } });
      const enYuksek = Math.max(0, ...mevcut.map((m) => Number((m.kaynak ?? "").slice(onek.length)) || 0));
      if (toplam <= enYuksek) continue;
      const fark = (toplam - enYuksek) / 100;
      const is = await prisma.is.create({
        data: {
          baslik: `SMM kesilecek: ${etiket} — ${hesap.no} ${hesap.ad}`,
          aciklama:
            `${etiket} dosyasında ${hesap.no} - ${hesap.ad} hesabına ${para.format(fark)} tutarında vekalet ücreti girişi var` +
            `${enYuksek > 0 ? " (daha önce kesilen makbuzun üzerine yeni giriş)" : ""}. Serbest meslek makbuzu kesildi mi?\n` +
            `Kesildiyse Görevler sayfasındaki "SMM kesme uyarıları" bölümünden "SMM kestim" kutusunu işaretleyin.\n` +
            `Dosya: /kokpit/dava-dosyalari/${dosyaId}`,
          tur: "PARCA",
          kaynak: `${onek}${toplam}`,
          sorumluId: sorumlu?.id ?? null,
          olusturanId: sorumlu?.id ?? null,
        },
      });
      acilan++;
      if (bildirim && sorumlu) {
        try {
          await pushGonder([sorumlu.id], {
            baslik: "Serbest meslek makbuzu kesilecek",
            metin: `${etiket} — ${hesap.ad}: ${para.format(fark)}`.slice(0, 180),
            url: `/kokpit/isler/${is.id}`,
            etiket: `is-${is.id}`,
          });
        } catch {
          // bildirim gonderilemese de gorev acilmistir
        }
      }
    }
  }
  return acilan;
}
