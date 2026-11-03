import { prisma } from "@/core/db/prisma";
import { pushGonder, type PushIcerigi } from "./push";

// Kullanıcıların açıp kapatabildiği bildirim türleri (Bildirimler sayfasında listelenir).
export const BILDIRIM_TURLERI: { kod: string; ad: string; aciklama: string }[] = [
  { kod: "para-istendi", ad: "Müvekkilden para istendi", aciklama: "Bir müvekkilden para istendiğinde (finans yetkilileri için)." },
  { kod: "para-geldi", ad: "İstenen para geldi", aciklama: "Müvekkilden istenen paranın geldiği işaretlendiğinde." },
  { kod: "para-gecikti", ad: "İstenen para gecikti", aciklama: "İstenen para uzun süredir gelmediğinde günlük hatırlatma." },
];

// Finans yetkilisi: Ayarlar > Kullanıcılar'dan işaretlenen aktif kişiler.
export async function finansYetkilileri(): Promise<string[]> {
  const k = await prisma.kullanici.findMany({ where: { aktifMi: true, finansYetkilisiMi: true }, select: { id: true } });
  return k.map((x) => x.id);
}

// Türü kapatmış kullanıcılara göndermez.
export async function turBildirimiGonder(kullaniciIdleri: string[], tur: string, icerik: PushIcerigi): Promise<void> {
  const benzersiz = [...new Set(kullaniciIdleri)];
  if (benzersiz.length === 0) return;
  const kullanicilar = await prisma.kullanici.findMany({
    where: { id: { in: benzersiz }, aktifMi: true },
    select: { id: true, bildirimKapali: true },
  });
  const acik = kullanicilar.filter((k) => !k.bildirimKapali.includes(tur)).map((k) => k.id);
  if (acik.length === 0) return;
  try {
    await pushGonder(acik, icerik);
  } catch {
    // bildirim gonderilemese de is akisi bozulmaz
  }
}
