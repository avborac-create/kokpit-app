"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { silmeSifresiniDogrula } from "@/core/auth/silme-dogrulama";

function yenile(dosyaId: string) {
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
  revalidatePath("/kokpit/finans/musteri-iliskileri");
}

async function silmeYetkisiniDogrula(sifre: string | undefined) {
  await silmeSifresiniDogrula(sifre);
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
}

function tutarAl(formData: FormData): number {
  const tutar = Number(String(formData.get("tutar") ?? "").replace(",", "."));
  if (!Number.isFinite(tutar) || tutar <= 0) throw new Error("Tutar sıfırdan büyük bir sayı olmalıdır.");
  return Math.round(tutar * 100) / 100;
}

function tarihAl(formData: FormData): Date {
  const tarih = String(formData.get("tarih") ?? "");
  if (!tarih) throw new Error("Tarih zorunludur.");
  return new Date(tarih);
}

// Muvekkilden gelen para: cari kod SECILMEDEN havuza girer.
export async function paraGirisiEkle(dosyaId: string, formData: FormData) {
  const tutar = tutarAl(formData);
  const tarih = tarihAl(formData);
  const aciklama = String(formData.get("aciklama") ?? "").trim() || null;
  await prisma.dosyaParaGirisi.create({ data: { dosyaId, tarih, tutar, aciklama } });
  yenile(dosyaId);
}

export async function paraGirisiSil(id: string, dosyaId: string, sifre?: string) {
  await silmeYetkisiniDogrula(sifre);
  const dagitimSayisi = await prisma.dosyaCariDagitimi.count({ where: { paraGirisiId: id } });
  if (dagitimSayisi > 0) {
    throw new Error("Bu para girişinden cari kodlara dağıtım yapılmış. Önce dağıtımları silin.");
  }
  await prisma.dosyaParaGirisi.delete({ where: { id } });
  yenile(dosyaId);
}

// Havuzdaki bir para girisinden (kismen de olabilir) bir cari kodun ALACAK
// hanesine aktarim. Giris tutarinin kalanindan fazlasi dagitilamaz.
export async function paraDagit(dosyaId: string, formData: FormData) {
  const paraGirisiId = String(formData.get("paraGirisiId") ?? "");
  const cariKodId = String(formData.get("cariKodId") ?? "");
  if (!paraGirisiId || !cariKodId) throw new Error("Para girişi ve cari kod seçmelisiniz.");
  const tutar = tutarAl(formData);
  const tarih = tarihAl(formData);
  const aciklama = String(formData.get("aciklama") ?? "").trim() || null;

  await prisma.$transaction(async (tx) => {
    const giris = await tx.dosyaParaGirisi.findUnique({
      where: { id: paraGirisiId },
      include: { dagitimlar: { select: { tutar: true } } },
    });
    if (!giris || giris.dosyaId !== dosyaId) throw new Error("Para girişi bulunamadı.");
    const dagitilan = giris.dagitimlar.reduce((t, d) => t + Number(d.tutar), 0);
    const kalan = Math.round((Number(giris.tutar) - dagitilan) * 100) / 100;
    if (tutar > kalan) {
      throw new Error(`Bu girişin dağıtılabilir kalanı ${kalan.toLocaleString("tr-TR")} TL; daha fazlası aktarılamaz.`);
    }
    await tx.dosyaCariDagitimi.create({ data: { paraGirisiId, dosyaId, cariKodId, tarih, tutar, aciklama } });
  });
  yenile(dosyaId);
}

export async function paraDagitimiSil(id: string, dosyaId: string, sifre?: string) {
  await silmeYetkisiniDogrula(sifre);
  await prisma.dosyaCariDagitimi.delete({ where: { id } });
  yenile(dosyaId);
}

// Cari kodun BORC hanesine kayit (ör. Akdi Vekalet: dosyanin hizmet bedeli).
export async function cariTahakkukEkle(dosyaId: string, formData: FormData) {
  const cariKodId = String(formData.get("cariKodId") ?? "");
  const dayanak = String(formData.get("dayanak") ?? "").trim();
  if (!cariKodId || !dayanak) throw new Error("Cari kod ve dayanak (neye istinaden) zorunludur.");
  await prisma.dosyaCariTahakkuku.create({
    data: { dosyaId, cariKodId, tarih: tarihAl(formData), tutar: tutarAl(formData), dayanak },
  });
  yenile(dosyaId);
}

export async function cariTahakkukSil(id: string, dosyaId: string, sifre?: string) {
  await silmeYetkisiniDogrula(sifre);
  await prisma.dosyaCariTahakkuku.delete({ where: { id } });
  yenile(dosyaId);
}
