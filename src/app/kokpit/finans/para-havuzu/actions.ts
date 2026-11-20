"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { ekonomiYetkisiniDogrula } from "@/core/auth/finans-yetki";
import { silmeSifresiniDogrula } from "@/core/auth/silme-dogrulama";
import { dosyaEtiketiYaz } from "@/modules/dava-dosyasi/lib/cari-sistem";

const yuvarla = (n: number) => Math.round(n * 100) / 100;

function tutarAl(v: unknown): number {
  const t = yuvarla(Number(String(v ?? "").replace(",", ".")));
  if (!Number.isFinite(t) || t <= 0) throw new Error("Tutar sıfırdan büyük olmalıdır.");
  return t;
}

export async function havuzGirisiEkle(formData: FormData): Promise<{ hata?: string }> {
  try {
    await ekonomiYetkisiniDogrula();
    const k = await mevcutKullanici();
    const tarih = String(formData.get("tarih") ?? "");
    if (!tarih) throw new Error("Tarih zorunludur.");
    await prisma.paraHavuzuGirisi.create({
      data: {
        tarih: new Date(tarih),
        tutar: tutarAl(formData.get("tutar")),
        kaynak: String(formData.get("kaynak") ?? "").trim() || null,
        aciklama: String(formData.get("aciklama") ?? "").trim() || null,
        odemeYontemiId: String(formData.get("odemeYontemiId") ?? "") || null,
        olusturanId: k?.kullaniciId ?? null,
      },
    });
    revalidatePath("/kokpit/finans/para-havuzu");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

// Seçilen müvekkilin dosyaları (dağıtım formundaki dosya listesi için).
export async function muvekkilDosyalari(musteriId: string): Promise<{ id: string; etiket: string }[]> {
  await ekonomiYetkisiniDogrula();
  if (!musteriId) return [];
  const dosyalar = await prisma.davaDosyasi.findMany({
    where: { muvekkiller: { some: { musteriId } } },
    select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, birimAdi: true, anaDosya: { select: { kayitNo: true } } },
    orderBy: { kayitNo: "desc" },
  });
  return dosyalar.map((d) => ({ id: d.id, etiket: `${dosyaEtiketiYaz(d)}${d.birimAdi ? ` — ${d.birimAdi}` : ""}` }));
}

// Havuzdaki paradan müvekkile (dosya boş) ya da dosyaya (dosya dolu) aktarım.
export async function havuzDagit(girisId: string, formData: FormData): Promise<{ hata?: string }> {
  try {
    await ekonomiYetkisiniDogrula();
    const k = await mevcutKullanici();
    const musteriId = String(formData.get("musteriId") ?? "");
    const dosyaId = String(formData.get("dosyaId") ?? "") || null;
    if (!musteriId) throw new Error("Müvekkil seçilmelidir.");
    const tutar = tutarAl(formData.get("tutar"));
    const tarihHam = String(formData.get("tarih") ?? "");
    if (!tarihHam) throw new Error("Tarih zorunludur.");
    if (dosyaId && (await prisma.dosyaMuvekkili.count({ where: { dosyaId, musteriId } })) === 0) {
      throw new Error("Seçilen dosya bu müvekkile ait değil.");
    }
    const para = await prisma.cariHesap.findFirst({ where: { paraHesabiMi: true, grup: "MUVEKKIL" } });
    if (!para) throw new Error("Para Trafiği hesabı bulunamadı.");

    await prisma.$transaction(async (tx) => {
      const g = await tx.paraHavuzuGirisi.findUnique({ where: { id: girisId }, include: { dagitimlar: true } });
      if (!g) throw new Error("Havuz kaydı bulunamadı.");
      const kalan = yuvarla(Number(g.tutar) - g.dagitimlar.reduce((t, d) => t + Number(d.tutar), 0));
      if (tutar > kalan + 0.001) throw new Error(`Havuzda yalnızca ${kalan.toLocaleString("tr-TR")} TL kaldı.`);
      const tarih = new Date(tarihHam);
      const aciklama = `PARA HAVUZUNDAN${g.kaynak ? ` — ${g.kaynak}` : ""}${g.aciklama ? ` — ${g.aciklama}` : ""}`;
      const hareket = await tx.cariHareketi.create({
        data: { musteriId, dosyaId, hesapId: para.id, yon: "ALACAK", tarih, tutar, aciklama, odemeYontemiId: g.odemeYontemiId },
      });
      await tx.paraHavuzuDagitimi.create({
        data: { girisId, musteriId, dosyaId, tutar, tarih, cariHareketId: hareket.id, olusturanId: k?.kullaniciId ?? null },
      });
    });
    revalidatePath("/kokpit", "layout");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Aktarılamadı." };
  }
}

// Dağıtımı geri al: cari kayıt silinir, tutar havuza döner.
export async function havuzDagitimiGeriAl(dagitimId: string, sifre?: string): Promise<{ hata?: string }> {
  try {
    await silmeSifresiniDogrula(sifre);
    await ekonomiYetkisiniDogrula();
    const d = await prisma.paraHavuzuDagitimi.findUnique({ where: { id: dagitimId } });
    if (!d) return {};
    await prisma.$transaction(async (tx) => {
      if (d.cariHareketId) await tx.cariHareketi.deleteMany({ where: { id: d.cariHareketId } });
      await tx.paraHavuzuDagitimi.delete({ where: { id: dagitimId } });
    });
    revalidatePath("/kokpit", "layout");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Geri alınamadı." };
  }
}

export async function havuzGirisiSil(id: string, sifre?: string): Promise<{ hata?: string }> {
  try {
    await silmeSifresiniDogrula(sifre);
    await ekonomiYetkisiniDogrula();
    const sayi = await prisma.paraHavuzuDagitimi.count({ where: { girisId: id } });
    if (sayi > 0) throw new Error("Önce bu girişin dağıtımlarını geri alın.");
    await prisma.paraHavuzuGirisi.deleteMany({ where: { id } });
    revalidatePath("/kokpit/finans/para-havuzu");
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Silinemedi." };
  }
}
