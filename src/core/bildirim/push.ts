import webpush from "web-push";
import { prisma } from "@/core/db/prisma";

export type PushIcerigi = { baslik: string; metin: string; url?: string; etiket?: string };

// VAPID anahtar cifti ilk kullanimda uretilip veritabaninda tek satir olarak saklanir.
export async function pushAnahtariGetir() {
  const var_ = await prisma.pushAnahtari.findUnique({ where: { id: "vapid" } });
  if (var_) return var_;
  const g = webpush.generateVAPIDKeys();
  return prisma.pushAnahtari.upsert({
    where: { id: "vapid" },
    update: {},
    create: { id: "vapid", publicKey: g.publicKey, privateKey: g.privateKey },
  });
}

// Kullanicilarin kayitli tum cihazlarina bildirim gonderir; gecersiz (silinmis) abonelikleri temizler.
// Best-effort: hicbir zaman hata firlatmaz.
export async function pushGonder(kullaniciIdleri: string[], icerik: PushIcerigi): Promise<{ gonderilen: number; hatali: number }> {
  try {
    if (kullaniciIdleri.length === 0) return { gonderilen: 0, hatali: 0 };
    const [anahtar, abonelikler] = await Promise.all([
      pushAnahtariGetir(),
      prisma.pushAboneligi.findMany({ where: { kullaniciId: { in: kullaniciIdleri } } }),
    ]);
    webpush.setVapidDetails("https://kokpit-app.vercel.app", anahtar.publicKey, anahtar.privateKey);
    let gonderilen = 0;
    let hatali = 0;
    await Promise.all(
      abonelikler.map(async (a) => {
        try {
          await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(icerik), { TTL: 3600 });
          gonderilen++;
        } catch (hata) {
          hatali++;
          const kod = (hata as { statusCode?: number }).statusCode;
          if (kod === 404 || kod === 410) await prisma.pushAboneligi.delete({ where: { id: a.id } }).catch(() => {});
        }
      }),
    );
    return { gonderilen, hatali };
  } catch (hata) {
    console.error("Push bildirimi gonderilemedi:", hata);
    return { gonderilen: 0, hatali: 0 };
  }
}
