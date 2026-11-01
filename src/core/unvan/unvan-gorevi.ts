import { prisma } from "@/core/db/prisma";

// Kisa unvanli kayit icin "Gorevler" (Isler) paneline Parca gorev olarak acik bir gorev ekler (takvime YAZILMAZ:
// takvim yalniz zamana bagli isler icindir). Gorev kayda "unvan:<id>" ile baglanir; unvan
// tamamlaninca kapatilir.
export async function unvanGoreviOlustur(opts: {
  ad: string;
  tur: "Müvekkil" | "Karşı taraf";
  kayitId: string;
  kullaniciId: string | null;
}) {
  const kaynak = `unvan:${opts.kayitId}`;
  const var_ = await prisma.is.findFirst({ where: { kaynak, durum: { not: "TAMAMLANDI" } }, select: { id: true } });
  if (var_) return;
  await prisma.is.create({
    data: {
      tur: "PARCA",
      baslik: `Tam ünvanı tamamla: ${opts.ad}`,
      aciklama: `${opts.tur} kaydı kısa ünvanla açıldı. MERSİS ya da Ticaret Sicil Gazetesi'nden tam ünvanı bulup kaydı düzeltin.`,
      kaynak,
      sorumluId: opts.kullaniciId,
      olusturanId: opts.kullaniciId,
    },
  });
}

export async function unvanGoreviniKapat(kayitId: string) {
  await prisma.is.updateMany({
    where: { kaynak: `unvan:${kayitId}`, durum: { not: "TAMAMLANDI" } },
    data: { durum: "TAMAMLANDI", tamamlanmaTarihi: new Date() },
  });
}
