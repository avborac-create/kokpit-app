"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { finansYetkilileri, turBildirimiGonder } from "@/core/bildirim/tur-bildirimi";
import { YOL_ADLARI } from "./hesap-ozeti-yollari";

// Müvekkilden para isteme takibi (hesap özeti kayıtları).
// Sorumluluk: parayı isteyen kişidedir (sorumluId); paranın gelip gelmediğini takip etmek de ondadır.
// Finans yetkilisi yalnızca banka hareketine bakıp "para geldi" teyidini verir.

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

function tarihDogrula(t: string, ad: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error(`${ad} için geçerli bir tarih girin.`);
  const d = new Date(`${t}T12:00:00`);
  if (d.getTime() > Date.now() + 86_400_000) throw new Error(`${ad} gelecekte olamaz.`);
  return d;
}

function yenile(musteriId: string) {
  revalidatePath(`/kokpit/finans/musteri-iliskileri/${musteriId}/odeme-talebi`);
  revalidatePath("/kokpit/finans/istenen-paralar");
}

async function girisli() {
  const k = await mevcutKullanici();
  if (!k) throw new Error("Bu işlem için yetkiniz yok.");
  return k;
}

const OZET = { musteriId: true, toplam: true, sorumluId: true, olusturanId: true, musteri: { select: { adSoyadUnvan: true } } } as const;

// "Müvekkilden istendi" onay kutusu: istenen tarih zorunlu.
export async function paraIstendiIsaretle(id: string, tarih: string, yol: string): Promise<void> {
  await girisli();
  if (!(yol in YOL_ADLARI)) throw new Error("Hangi yoldan istendiğini seçin.");
  const istenme = tarihDogrula(tarih, "İstenen tarih");
  const kayit = await prisma.hesapOzetiKaydi.update({
    where: { id },
    data: { sonuc: "GONDERILDI", sonucTarihi: new Date(), istenmeTarihi: istenme, yol },
    select: OZET,
  });
  await turBildirimiGonder(await finansYetkilileri(), "para-istendi", {
    baslik: "Müvekkilden para istendi",
    metin: `${kayit.musteri.adSoyadUnvan} — ${para.format(kayit.toplam)} (${YOL_ADLARI[yol]})`.slice(0, 180),
    url: "/kokpit/finans/istenen-paralar",
    etiket: `para-${id}`,
  });
  yenile(kayit.musteriId);
}

export async function paraIstenmeyecek(id: string): Promise<void> {
  await girisli();
  const kayit = await prisma.hesapOzetiKaydi.update({ where: { id }, data: { sonuc: "VAZGECILDI", sonucTarihi: new Date() }, select: { musteriId: true } });
  yenile(kayit.musteriId);
}

// "Para geldi" onay kutusu. Geliş tarihi ve banka hesabı zorunludur; elde yoksa boş bırakılabilir,
// bu durumda sorumluya "veri girişini tamamla" görevi açılır.
export async function paraGeldiIsaretle(id: string, tarih: string, banka: string): Promise<{ eksik: boolean }> {
  const k = await girisli();
  const bankaTemiz = banka.trim().slice(0, 120);
  const geldi = tarih ? tarihDogrula(tarih, "Geliş tarihi") : null;
  const kayit = await prisma.hesapOzetiKaydi.update({
    where: { id },
    data: { geldiMi: true, geldiTarihi: geldi, bankaHesabi: bankaTemiz || null, teyitEdenId: k.kullaniciId, teyitZamani: new Date() },
    select: OZET,
  });
  const sorumluId = kayit.sorumluId ?? kayit.olusturanId;
  const eksik = !geldi || !bankaTemiz;
  if (eksik) {
    const kaynak = `paratalebi-eksik:${id}`;
    const var_ = await prisma.is.findFirst({ where: { kaynak, durum: { not: "TAMAMLANDI" } }, select: { id: true } });
    if (!var_) {
      await prisma.is.create({
        data: {
          tur: "PARCA",
          baslik: `Ödeme bilgilerini tamamla: ${kayit.musteri.adSoyadUnvan} — ${para.format(kayit.toplam)}`,
          aciklama: `Para geldi olarak işaretlendi ancak ${[!geldi && "geliş tarihi", !bankaTemiz && "banka hesabı"].filter(Boolean).join(" ve ")} girilmedi. Finans > Müvekkilden İstenen Paralar sayfasından tamamlayın.`,
          kaynak,
          sorumluId,
          olusturanId: k.kullaniciId,
        },
      });
    }
  }
  const finans = await finansYetkilileri();
  await turBildirimiGonder([...finans, ...(sorumluId ? [sorumluId] : [])].filter((x) => x !== k.kullaniciId), "para-geldi", {
    baslik: "İstenen para geldi",
    metin: `${kayit.musteri.adSoyadUnvan} — ${para.format(kayit.toplam)}${bankaTemiz ? ` (${bankaTemiz})` : ""}`.slice(0, 180),
    url: "/kokpit/finans/istenen-paralar",
    etiket: `para-geldi-${id}`,
  });
  yenile(kayit.musteriId);
  return { eksik };
}

// Eksik kalan geliş tarihi / banka bilgisini sonradan tamamlar; tamamlanınca görev kapanır.
export async function paraBilgisiniTamamla(id: string, tarih: string, banka: string): Promise<void> {
  await girisli();
  const bankaTemiz = banka.trim().slice(0, 120);
  const geldi = tarih ? tarihDogrula(tarih, "Geliş tarihi") : undefined;
  const kayit = await prisma.hesapOzetiKaydi.update({
    where: { id },
    data: { ...(geldi ? { geldiTarihi: geldi } : {}), ...(bankaTemiz ? { bankaHesabi: bankaTemiz } : {}) },
    select: { musteriId: true, geldiTarihi: true, bankaHesabi: true },
  });
  if (kayit.geldiTarihi && kayit.bankaHesabi) {
    await prisma.is.updateMany({ where: { kaynak: `paratalebi-eksik:${id}`, durum: { not: "TAMAMLANDI" } }, data: { durum: "TAMAMLANDI", tamamlanmaTarihi: new Date() } });
  }
  yenile(kayit.musteriId);
}

// Uyarıyı belli bir tarihe kadar gizler (o tarihte yeniden sorulur).
export async function hesapOzetiErtele(id: string, tarih: string): Promise<void> {
  await girisli();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) throw new Error("Geçerli bir tarih seçin.");
  const kayit = await prisma.hesapOzetiKaydi.update({ where: { id }, data: { ertelemeTarihi: new Date(`${tarih}T12:00:00`) }, select: { musteriId: true } });
  yenile(kayit.musteriId);
}
