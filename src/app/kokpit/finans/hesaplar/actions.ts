"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { ekonomiDuzenleyebilirMi } from "@/core/auth/finans-yetki";

async function yetkili() {
  const k = await mevcutKullanici();
  if (!k || !(await ekonomiDuzenleyebilirMi())) throw new Error("Bu işlem için finans yetkisi gerekir.");
  return k;
}

function tutarAl(v: unknown): number {
  const t = Math.round(Number(String(v ?? "").replace(",", ".")) * 100) / 100;
  if (!Number.isFinite(t) || t <= 0) throw new Error("Tutar sıfırdan büyük olmalıdır.");
  return t;
}

const yenile = () => {
  revalidatePath("/kokpit/finans/hesaplar");
  revalidatePath("/kokpit/finans");
};

export async function hesapEkle(formData: FormData): Promise<{ hata?: string }> {
  try {
    await yetkili();
    const ad = String(formData.get("ad") ?? "").trim().slice(0, 120);
    if (!ad) throw new Error("Hesap adı zorunludur.");
    const tur = String(formData.get("tur") ?? "AVUKAT");
    if (!["BURO", "NAKIT", "AVUKAT", "DIGER"].includes(tur)) throw new Error("Geçersiz hesap türü.");
    const son = await prisma.paraHesabi.findFirst({ orderBy: { sira: "desc" }, select: { sira: true } });
    await prisma.paraHesabi.create({
      data: {
        ad,
        tur,
        sahipAdi: String(formData.get("sahipAdi") ?? "").trim().slice(0, 120) || null,
        iban: String(formData.get("iban") ?? "").trim().slice(0, 40) || null,
        sira: (son?.sira ?? 0) + 1,
      },
    });
    yenile();
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

// Hesap silinmez (gecmis kayitlar ona bagli): pasife alinir / yeniden aktif edilir.
export async function hesapAktifDegistir(id: string, aktif: boolean): Promise<{ hata?: string }> {
  try {
    await yetkili();
    const h = await prisma.paraHesabi.findUnique({ where: { id } });
    if (!h) throw new Error("Hesap bulunamadı.");
    if (!aktif && h.varsayilanMi) throw new Error("Varsayılan büro hesabı pasife alınamaz; önce başka hesabı varsayılan yapın.");
    await prisma.paraHesabi.update({ where: { id }, data: { aktifMi: aktif } });
    yenile();
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Değiştirilemedi." };
  }
}

export async function hesapVarsayilanYap(id: string): Promise<{ hata?: string }> {
  try {
    await yetkili();
    await prisma.$transaction([prisma.paraHesabi.updateMany({ data: { varsayilanMi: false } }), prisma.paraHesabi.update({ where: { id }, data: { varsayilanMi: true, aktifMi: true } })]);
    yenile();
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Değiştirilemedi." };
  }
}

export async function mahsupEkle(hesapId: string, formData: FormData): Promise<{ hata?: string }> {
  try {
    const k = await yetkili();
    const yon = String(formData.get("yon") ?? "");
    if (yon !== "BUROYA_AKTARILDI" && yon !== "SAHIBE_ODENDI") throw new Error("Mahsup yönünü seçin.");
    const tarih = String(formData.get("tarih") ?? "");
    if (!tarih) throw new Error("Tarih zorunludur.");
    await prisma.hesapMahsubu.create({
      data: { hesapId, yon, tarih: new Date(tarih), tutar: tutarAl(formData.get("tutar")), aciklama: String(formData.get("aciklama") ?? "").trim().slice(0, 500) || null, olusturanId: k.kullaniciId },
    });
    yenile();
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

// Yanlis mahsup silinmez, IPTAL edilir (iz kalir); gerekirse dogrusu yeniden girilir.
export async function mahsupIptalEt(id: string): Promise<{ hata?: string }> {
  try {
    const k = await yetkili();
    await prisma.hesapMahsubu.update({ where: { id }, data: { iptalZamani: new Date(), iptalEdenId: k.kullaniciId } });
    yenile();
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "İptal edilemedi." };
  }
}
