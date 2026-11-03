"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { YOL_ADLARI } from "./hesap-ozeti-yollari";

// "Hesap özetini müvekkile gönderdiniz mi?" sorusunun cevabı.
// Finans islerini yurutecek kisi: aktif ve yonetici rolunde "Ebru" adli kullanici; bulunamazsa gorevi acan kisi.
async function finansYetkilisi(yedek: string | null): Promise<string | null> {
  const k = await prisma.kullanici.findFirst({
    where: { aktifMi: true, buroRolu: "YONETICI", adSoyad: { startsWith: "Ebru" } },
    select: { id: true },
  });
  return k?.id ?? yedek;
}

export async function hesapOzetiSonucuYaz(id: string, sonuc: "GONDERILDI" | "VAZGECILDI", yol?: string): Promise<void> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için yetkiniz yok.");
  if (sonuc === "GONDERILDI" && !(yol && yol in YOL_ADLARI)) throw new Error("Hangi yoldan istendiğini seçin.");
  const kayit = await prisma.hesapOzetiKaydi.update({
    where: { id },
    data: { sonuc, sonucTarihi: new Date(), yol: sonuc === "GONDERILDI" ? yol : null },
    select: { musteriId: true, toplam: true, musteri: { select: { adSoyadUnvan: true } } },
  });
  if (sonuc === "GONDERILDI") {
    // Finans yetkilisine acik gorev: odemenin takibi.
    const tutar = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kayit.toplam);
    await prisma.is.create({
      data: {
        tur: "PARCA",
        baslik: `Ödeme takibi: ${kayit.musteri.adSoyadUnvan} — ${tutar}`,
        aciklama: `Müvekkil hesap özeti ${YOL_ADLARI[yol!]} yoluyla müvekkilden ${tutar} ödeme istendi. Ödeme geldiğinde Para Trafiği'ne işleyin; gelmezse müvekkille iletişime geçin.`,
        kaynak: `hesapozeti:${id}`,
        sorumluId: await finansYetkilisi(kullanici.kullaniciId),
        olusturanId: kullanici.kullaniciId,
      },
    });
  }
  revalidatePath(`/kokpit/finans/musteri-iliskileri/${kayit.musteriId}/odeme-talebi`);
}

// Uyariyi belli bir tarihe kadar gizler (o tarihte yeniden sorulur).
export async function hesapOzetiErtele(id: string, tarih: string): Promise<void> {
  if (!(await mevcutKullanici())) throw new Error("Bu işlem için yetkiniz yok.");
  if (!/^d{4}-d{2}-d{2}$/.test(tarih)) throw new Error("Geçerli bir tarih seçin.");
  const kayit = await prisma.hesapOzetiKaydi.update({
    where: { id },
    data: { ertelemeTarihi: new Date(`${tarih}T12:00:00`) },
    select: { musteriId: true },
  });
  revalidatePath(`/kokpit/finans/musteri-iliskileri/${kayit.musteriId}/odeme-talebi`);
}
