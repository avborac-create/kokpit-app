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

// Eksik telefon / adres icin takip gorevi ("eksik:<musteriId>"); bilgi tamamlaninca kapatilir.
export async function eksikBilgiGoreviOlustur(opts: { ad: string; eksikler: string[]; kayitId: string; kullaniciId: string | null }) {
  const kaynak = `eksik:${opts.kayitId}`;
  const baslik = `Müvekkil bilgisini tamamla (${opts.eksikler.join(", ")}): ${opts.ad}`;
  const var_ = await prisma.is.findFirst({ where: { kaynak, durum: { not: "TAMAMLANDI" } }, select: { id: true } });
  if (var_) {
    await prisma.is.update({ where: { id: var_.id }, data: { baslik } });
    return;
  }
  await prisma.is.create({
    data: {
      tur: "PARCA",
      baslik,
      aciklama: "Müvekkil kaydı eksik bilgiyle açıldı. Telefon ve il / ilçe dahil adres müvekkil kartına girilmelidir.",
      kaynak,
      sorumluId: opts.kullaniciId,
      olusturanId: opts.kullaniciId,
    },
  });
}

export async function eksikBilgiGoreviniKapat(kayitId: string) {
  await prisma.is.updateMany({
    where: { kaynak: `eksik:${kayitId}`, durum: { not: "TAMAMLANDI" } },
    data: { durum: "TAMAMLANDI", tamamlanmaTarihi: new Date() },
  });
}

// Formda "Listede yok" ile yazilan il / ilce icin yoneticiye "listeye ekle" gorevi.
export async function adresListeGoreviOlustur(opts: { il: string; ilce: string; ilListeDisi: boolean; ilceListeDisi: boolean; musteriAdi: string; olusturanId: string | null }) {
  const ad = opts.ilListeDisi ? opts.il : `${opts.ilce} (${opts.il})`;
  const kaynak = `adresliste:${ad.toLocaleLowerCase("tr-TR")}`;
  const var_ = await prisma.is.findFirst({ where: { kaynak, durum: { not: "TAMAMLANDI" } }, select: { id: true } });
  if (var_) return;
  const yonetici = await prisma.kullanici.findFirst({ where: { rol: "YONETICI" }, orderBy: { id: "asc" }, select: { id: true } });
  await prisma.is.create({
    data: {
      tur: "PARCA",
      baslik: `Adres listesine ekle: ${ad}`,
      aciklama: `${opts.musteriAdi} müvekkil kaydında il / ilçe listede bulunamadı ve elle yazıldı. Doğruluğunu kontrol edip il-ilçe listesine eklenmesini sağlayın.`,
      kaynak,
      sorumluId: yonetici?.id ?? opts.olusturanId,
      olusturanId: opts.olusturanId,
    },
  });
}
