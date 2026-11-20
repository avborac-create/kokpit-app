"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { gercekKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { AKISLAR, OLGUNLUKLAR } from "./sabitler";

async function yonetici() {
  const k = await gercekKullanici();
  if (!k || !silebilirMi(k.rol)) throw new Error("Bu panel yalnız yöneticiler içindir.");
  return k;
}

type Iz = { t: string; kim: string; ozet: string };
const iz = (kim: string, ozet: string): Iz => ({ t: new Date().toISOString(), kim, ozet });

export async function gelistirmeEkle(baslik: string, aciklama: string, modul: string): Promise<{ hata?: string }> {
  try {
    const k = await yonetici();
    if (!baslik.trim()) throw new Error("Başlık yazın.");
    await prisma.gelistirme.create({
      data: { baslik: baslik.trim().slice(0, 200), aciklama: aciklama.trim().slice(0, 2000) || null, modul: modul.trim().slice(0, 100) || null, olusturanId: k.kullaniciId, gecmis: [iz(k.adSoyad, "Talep olarak eklendi")] },
    });
    revalidatePath("/kokpit/gelistirmeler");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Eklenemedi." };
  }
}

// Durum degisikligi geri alinabilir: eski deger izde yazili, ayni ekrandan geri secilebilir.
export async function gelistirmeDurumDegistir(id: string, alan: "akis" | "olgunluk", deger: string): Promise<{ hata?: string }> {
  try {
    const k = await yonetici();
    const liste = alan === "akis" ? AKISLAR : OLGUNLUKLAR;
    const yeni = liste.find((x) => x.k === deger);
    if (!yeni) throw new Error("Geçersiz durum.");
    const g = await prisma.gelistirme.findUnique({ where: { id } });
    if (!g) throw new Error("Kayıt bulunamadı.");
    const eskiEtiket = liste.find((x) => x.k === g[alan])?.ad ?? g[alan];
    await prisma.gelistirme.update({
      where: { id },
      data: {
        [alan]: deger,
        ...(alan === "akis" && deger === "YAYINDA" && !g.yayinTarihi ? { yayinTarihi: new Date() } : {}),
        gecmis: [...((g.gecmis as Iz[]) ?? []), iz(k.adSoyad, `${alan === "akis" ? "Akış" : "Olgunluk"}: ${eskiEtiket} → ${yeni.ad}`)],
      },
    });
    revalidatePath("/kokpit/gelistirmeler");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Güncellenemedi." };
  }
}

export async function gelistirmeNotEkle(id: string, not: string): Promise<{ hata?: string }> {
  try {
    const k = await yonetici();
    if (!not.trim()) throw new Error("Not boş.");
    const g = await prisma.gelistirme.findUnique({ where: { id } });
    if (!g) throw new Error("Kayıt bulunamadı.");
    await prisma.gelistirme.update({ where: { id }, data: { gecmis: [...((g.gecmis as Iz[]) ?? []), iz(k.adSoyad, not.trim().slice(0, 500))] } });
    revalidatePath("/kokpit/gelistirmeler");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Eklenemedi." };
  }
}
