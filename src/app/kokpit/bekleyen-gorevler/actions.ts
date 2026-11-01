"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { pushGonder } from "@/core/bildirim/push";
import { bildirimEpostasiGonder } from "@/core/bildirim/eposta";

async function girisliKullanici() {
  const k = await mevcutKullanici();
  if (!k) throw new Error("Oturum bulunamadı.");
  return k;
}

export async function gorevEkle(baslik: string, sorumluId: string | null) {
  const k = await girisliKullanici();
  const metin = baslik.trim();
  if (!metin) return { hata: "Görev başlığı yazın." };
  const atanan = sorumluId || k.kullaniciId;
  await prisma.bekleyenGorev.create({
    data: { baslik: metin.slice(0, 300), sorumluId: atanan, olusturanId: k.kullaniciId },
  });
  // Baskasina atandiysa haber ver (best-effort; hata gorevi bozmaz).
  if (atanan !== k.kullaniciId) {
    const hedef = await prisma.kullanici.findUnique({ where: { id: atanan }, select: { eposta: true } });
    const baslik = "Size yeni bir görev atandı";
    const ozet = `${k.adSoyad}: ${metin.slice(0, 200)}`;
    await pushGonder([atanan], { baslik, metin: ozet, url: "/kokpit/bekleyen-gorevler", etiket: "gorev" });
    if (hedef?.eposta) await bildirimEpostasiGonder(hedef.eposta, baslik, ozet, "https://kokpit-app.vercel.app/kokpit/bekleyen-gorevler");
  }
  revalidatePath("/kokpit/bekleyen-gorevler");
  return { hata: null };
}

export async function gorevDurumuDegistir(id: string, tamam: boolean) {
  await girisliKullanici();
  await prisma.bekleyenGorev.update({
    where: { id },
    data: { tamamlandiMi: tamam, tamamlanmaTarihi: tamam ? new Date() : null },
  });
  revalidatePath("/kokpit/bekleyen-gorevler");
}

export async function gorevSil(id: string) {
  await girisliKullanici();
  await prisma.bekleyenGorev.delete({ where: { id } });
  revalidatePath("/kokpit/bekleyen-gorevler");
}
