"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { silmeSifresiniDogrula } from "@/core/auth/silme-dogrulama";
import { kasaOzeti } from "./kasa-veri";

async function yetkili() {
  const k = await mevcutKullanici();
  if (!k || !silebilirMi(k.rol)) throw new Error("Bu işlem için yetkiniz yok.");
  return k;
}

function tutarAl(v: unknown): number {
  const t = Math.round(Number(String(v ?? "").replace(",", ".")) * 100) / 100;
  if (!Number.isFinite(t) || t <= 0) throw new Error("Tutar sıfırdan büyük olmalıdır.");
  return t;
}

async function hareketiHazirla(formData: FormData) {
  const kodId = String(formData.get("kodId") ?? "");
  const tarih = String(formData.get("tarih") ?? "");
  if (!kodId || !tarih) throw new Error("Kod ve tarih zorunludur.");
  const kod = await prisma.kasaKodu.findUnique({ where: { id: kodId } });
  if (!kod) throw new Error("Kasa kodu bulunamadı.");
  const personelId = String(formData.get("personelId") ?? "") || null;
  if (kod.personelMi && !personelId) throw new Error("Bu kod için personel seçmelisiniz.");
  return {
    kodId,
    yon: kod.yon,
    tarih: new Date(tarih),
    tutar: tutarAl(formData.get("tutar")),
    aciklama: String(formData.get("aciklama") ?? "").trim() || null,
    personelId: kod.personelMi ? personelId : null,
  };
}

export async function kasaHareketiEkle(formData: FormData): Promise<{ hata?: string }> {
  try {
    const k = await yetkili();
    const veri = await hareketiHazirla(formData);
    if (veri.yon === "CIKIS") {
      const { bakiye } = await kasaOzeti();
      if (bakiye - Number(veri.tutar) < -0.001) throw new Error("Kasada yeterli nakit yok; çıkış, kasa bakiyesini eksiye düşürür.");
    }
    await prisma.kasaHareketi.create({ data: { ...veri, olusturanId: k.kullaniciId } });
    revalidatePath("/kokpit/finans/kasa");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

export async function kasaHareketiGuncelle(id: string, formData: FormData): Promise<{ hata?: string }> {
  try {
    await yetkili();
    const veri = await hareketiHazirla(formData);
    const eski = await prisma.kasaHareketi.findUnique({ where: { id } });
    if (!eski) throw new Error("Kayıt bulunamadı.");
    await prisma.kasaHareketi.update({ where: { id }, data: veri });
    const { bakiye } = await kasaOzeti();
    if (bakiye < -0.001) {
      await prisma.kasaHareketi.update({ where: { id }, data: { kodId: eski.kodId, yon: eski.yon, tarih: eski.tarih, tutar: eski.tutar, aciklama: eski.aciklama, personelId: eski.personelId } });
      throw new Error("Bu değişiklik kasa bakiyesini eksiye düşürür; kaydedilmedi.");
    }
    revalidatePath("/kokpit/finans/kasa");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

export async function kasaHareketiSil(id: string, sifre?: string): Promise<{ hata?: string }> {
  try {
    await silmeSifresiniDogrula(sifre);
    await yetkili();
    const h = await prisma.kasaHareketi.findUnique({ where: { id } });
    if (!h) return {};
    await prisma.kasaHareketi.delete({ where: { id } });
    const { bakiye } = await kasaOzeti();
    if (bakiye < -0.001) {
      await prisma.kasaHareketi.create({ data: { id: h.id, kodId: h.kodId, yon: h.yon, tarih: h.tarih, tutar: h.tutar, aciklama: h.aciklama, personelId: h.personelId, olusturanId: h.olusturanId, olusturmaTarihi: h.olusturmaTarihi } });
      throw new Error("Bu kaydı silmek kasa bakiyesini eksiye düşürür; silinmedi.");
    }
    revalidatePath("/kokpit/finans/kasa");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Silinemedi." };
  }
}

export async function kasaSayimiEkle(formData: FormData): Promise<{ hata?: string }> {
  try {
    const k = await yetkili();
    const tarih = String(formData.get("tarih") ?? "");
    if (!tarih) throw new Error("Tarih zorunludur.");
    const sayilan = Math.round(Number(String(formData.get("sayilan") ?? "").replace(",", ".")) * 100) / 100;
    if (!Number.isFinite(sayilan) || sayilan < 0) throw new Error("Sayılan tutar geçersiz.");
    const { bakiye } = await kasaOzeti();
    await prisma.kasaSayimi.create({
      data: {
        tarih: new Date(tarih),
        sayilan,
        beklenen: bakiye,
        fark: Math.round((sayilan - bakiye) * 100) / 100,
        aciklama: String(formData.get("aciklama") ?? "").trim() || null,
        olusturanId: k.kullaniciId,
      },
    });
    revalidatePath("/kokpit/finans/kasa");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}
