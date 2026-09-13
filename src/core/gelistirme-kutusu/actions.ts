"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { secenekleriGetir } from "@/core/secenek/secenek-service";

const YOL = "/kokpit/gelistirme-kutusu";
const DURUM_SIRASI = ["beklemede", "yapiliyor", "tamamlandi"];

export async function gelistirmeTalebiGonder(formData: FormData) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) {
    throw new Error("Giriş yapmalısınız.");
  }

  const metin = String(formData.get("metin") ?? "").trim();
  if (!metin) {
    throw new Error("Talep metni zorunludur.");
  }

  const durumlar = await secenekleriGetir("gelistirme_talebi_durumu");
  const beklemedeId = durumlar.find((d) => d.kod === "beklemede")?.id;
  if (!beklemedeId) {
    throw new Error("Durum listesi bulunamadı.");
  }

  await prisma.gelistirmeTalebi.create({
    data: {
      kullaniciId: kullanici.kullaniciId,
      metin,
      durumId: beklemedeId,
    },
  });

  revalidatePath(YOL);
}

export async function gelistirmeTalebiDurumIlerlet(id: string, mevcutDurumKodu: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  const mevcutSira = DURUM_SIRASI.indexOf(mevcutDurumKodu);
  const sonrakiKod = DURUM_SIRASI[mevcutSira + 1];
  if (!sonrakiKod) return;

  const durumlar = await secenekleriGetir("gelistirme_talebi_durumu");
  const sonrakiId = durumlar.find((d) => d.kod === sonrakiKod)?.id;
  if (!sonrakiId) return;

  await prisma.gelistirmeTalebi.update({ where: { id }, data: { durumId: sonrakiId } });
  revalidatePath(YOL);
}

export async function gelistirmeTalebiSil(id: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.gelistirmeTalebi.delete({ where: { id } });
  revalidatePath(YOL);
}
