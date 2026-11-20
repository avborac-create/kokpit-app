"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { turBildirimiGonder } from "@/core/bildirim/tur-bildirimi";
import { ERISIM_SURESI_SAAT } from "./telefon-erisimi";

async function girisli() {
  const k = await mevcutKullanici();
  if (!k) throw new Error("Bu işlem için yetkiniz yok.");
  return k;
}

async function yonetici() {
  const k = await girisli();
  if (k.rol !== "YONETICI") throw new Error("Bu işlemi yalnızca yönetici yapabilir.");
  return k;
}

// Personel: numarayi gormek icin yoneticiden erisim ister.
export async function telefonErisimiIste(musteriId: string): Promise<void> {
  const k = await girisli();
  const musteri = await prisma.musteri.findUnique({ where: { id: musteriId }, select: { adSoyadUnvan: true } });
  if (!musteri) throw new Error("Müvekkil bulunamadı.");
  const var_ = await prisma.telefonErisimTalebi.findFirst({
    where: { musteriId, talepEdenId: k.kullaniciId, durum: "BEKLIYOR" },
    select: { id: true },
  });
  if (!var_) {
    await prisma.telefonErisimTalebi.create({ data: { musteriId, talepEdenId: k.kullaniciId } });
    const yoneticiler = await prisma.kullanici.findMany({ where: { aktifMi: true, rol: "YONETICI" }, select: { id: true } });
    await turBildirimiGonder(
      yoneticiler.map((y) => y.id),
      "telefon-erisim-talebi",
      {
        baslik: "Telefon erişim talebi",
        metin: `${k.adSoyad}, ${musteri.adSoyadUnvan} müvekkilinin telefon numarasını görmek istiyor.`.slice(0, 180),
        url: "/kokpit/ayarlar/telefon-erisimleri",
        etiket: `telefon-erisim-${musteriId}`,
      },
    );
  }
  revalidatePath(`/kokpit/musteriler/${musteriId}`);
  revalidatePath("/kokpit/ayarlar/telefon-erisimleri");
}

// Yonetici: talebi onaylar (ERISIM_SURESI_SAAT boyunca) ya da reddeder.
export async function telefonErisimKarari(talepId: string, onay: boolean): Promise<void> {
  const y = await yonetici();
  const talep = await prisma.telefonErisimTalebi.findUnique({ where: { id: talepId } });
  if (!talep || talep.durum !== "BEKLIYOR") throw new Error("Talep bulunamadı ya da karara bağlanmış.");
  const simdi = new Date();
  await prisma.telefonErisimTalebi.update({
    where: { id: talepId },
    data: {
      durum: onay ? "ONAYLANDI" : "REDDEDILDI",
      kararVerenId: y.kullaniciId,
      kararZamani: simdi,
      bitisZamani: onay ? new Date(simdi.getTime() + ERISIM_SURESI_SAAT * 3_600_000) : null,
    },
  });
  const musteri = await prisma.musteri.findUnique({ where: { id: talep.musteriId }, select: { adSoyadUnvan: true } });
  await turBildirimiGonder([talep.talepEdenId], "telefon-erisim-karari", {
    baslik: onay ? "Telefon erişimi onaylandı" : "Telefon erişimi reddedildi",
    metin: `${musteri?.adSoyadUnvan ?? "Müvekkil"}${onay ? ` — ${ERISIM_SURESI_SAAT} saat boyunca görebilirsiniz.` : " — talebiniz reddedildi."}`.slice(0, 180),
    url: `/kokpit/musteriler/${talep.musteriId}`,
    etiket: `telefon-erisim-${talep.musteriId}`,
  });
  revalidatePath("/kokpit/ayarlar/telefon-erisimleri");
  revalidatePath(`/kokpit/musteriler/${talep.musteriId}`);
}

// Yonetici: onaylanmis erisimi sure dolmadan geri alir.
export async function telefonErisiminiKapat(talepId: string): Promise<void> {
  await yonetici();
  const talep = await prisma.telefonErisimTalebi.update({
    where: { id: talepId },
    data: { bitisZamani: new Date() },
    select: { musteriId: true },
  });
  revalidatePath("/kokpit/ayarlar/telefon-erisimleri");
  revalidatePath(`/kokpit/musteriler/${talep.musteriId}`);
}
