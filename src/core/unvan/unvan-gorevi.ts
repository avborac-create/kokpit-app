import { prisma } from "@/core/db/prisma";

// Ertesi is gunu (pazar atlanir) 09:00'a, kaydi giren kisiye acik bir gorev ekler.
// Gorev, ilgili kayda "unvan:<id>" etiketiyle baglanir; unvan tamamlaninca kapatilir.
export async function unvanGoreviOlustur(opts: {
  ad: string;
  tur: "Müvekkil" | "Karşı taraf";
  kayitId: string;
  kullaniciId: string | null;
}) {
  const gun = new Date();
  gun.setUTCHours(0, 0, 0, 0);
  do {
    gun.setUTCDate(gun.getUTCDate() + 1);
  } while (gun.getUTCDay() === 0);

  const etiket = `unvan:${opts.kayitId}`;
  const var_ = await prisma.takvimOgesi.findFirst({ where: { etiketler: { has: etiket }, tamamlandiMi: false }, select: { id: true } });
  if (var_) return;

  await prisma.takvimOgesi.create({
    data: {
      tarih: gun,
      saat: "09:00",
      baslik: `Tam ünvanı tamamla: ${opts.ad}`,
      tur: "GOREV",
      takvim: "IS",
      durum: "BEKLIYOR",
      etiketler: [etiket, "unvan"],
      sorumluId: opts.kullaniciId,
      olusturanId: opts.kullaniciId,
      icerik: `${opts.tur} kaydı kısa ünvanla açıldı. MERSİS ya da Ticaret Sicil Gazetesi'nden tam ünvanı bulup kaydı düzeltin.\n- [ ] Tam ünvanı bul\n- [ ] Kayıtta düzelt`,
    },
  });
}

export async function unvanGoreviniKapat(kayitId: string) {
  await prisma.takvimOgesi.updateMany({
    where: { etiketler: { has: `unvan:${kayitId}` }, tamamlandiMi: false },
    data: { tamamlandiMi: true, durum: "TAMAM" },
  });
}
