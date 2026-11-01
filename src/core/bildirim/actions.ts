"use server";

import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { pushAnahtariGetir, pushGonder } from "./push";

async function girisli() {
  const k = await mevcutKullanici();
  if (!k) throw new Error("Oturum bulunamadı.");
  return k;
}

export async function pushGenelAnahtar(): Promise<string> {
  await girisli();
  return (await pushAnahtariGetir()).publicKey;
}

export async function pushAboneligiKaydet(abonelik: { endpoint: string; p256dh: string; auth: string }, cihaz: string) {
  const k = await girisli();
  await prisma.pushAboneligi.upsert({
    where: { endpoint: abonelik.endpoint },
    update: { kullaniciId: k.kullaniciId, p256dh: abonelik.p256dh, auth: abonelik.auth, cihaz: cihaz.slice(0, 200) },
    create: { kullaniciId: k.kullaniciId, endpoint: abonelik.endpoint, p256dh: abonelik.p256dh, auth: abonelik.auth, cihaz: cihaz.slice(0, 200) },
  });
}

export async function pushAboneliginiSil(endpoint: string) {
  const k = await girisli();
  await prisma.pushAboneligi.deleteMany({ where: { endpoint, kullaniciId: k.kullaniciId } });
}

export async function pushTestiGonder(): Promise<{ gonderilen: number; hatali: number }> {
  const k = await girisli();
  return pushGonder([k.kullaniciId], {
    baslik: "Kokpit test bildirimi",
    metin: "Bu bildirimi görüyorsanız telefonunuza bildirim gönderebiliyoruz.",
    url: "/kokpit/bildirimler",
    etiket: "test",
  });
}

export async function kayitliCihazSayisi(): Promise<number> {
  const k = await girisli();
  return prisma.pushAboneligi.count({ where: { kullaniciId: k.kullaniciId } });
}
