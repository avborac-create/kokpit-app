"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { pushGonder } from "@/core/bildirim/push";

async function yetkili() {
  const k = await mevcutKullanici();
  if (!k || !(await modulErisimiVarMi("avukat"))) throw new Error("Bu işlem için yetkiniz yok.");
  return k;
}

const metin = (f: FormData, ad: string) => String(f.get(ad) ?? "").trim();
const tarihOrNull = (f: FormData, ad: string) => {
  const v = metin(f, ad);
  return v ? new Date(v) : null;
};

// Gorevler modulunde bir "is emri" acar (kaynak ile geri izlenir) ve atananı haberdar eder.
async function isEmriAc(opts: { baslik: string; aciklama: string; sorumluId: string; kaynak: string; vade?: Date | null; olusturanId: string; olusturanAd: string }) {
  const is = await prisma.is.create({
    data: {
      baslik: opts.baslik.slice(0, 200),
      aciklama: opts.aciklama,
      sorumluId: opts.sorumluId,
      olusturanId: opts.olusturanId,
      kaynak: opts.kaynak,
      vade: opts.vade ?? null,
    },
  });
  if (opts.sorumluId !== opts.olusturanId) {
    await pushGonder([opts.sorumluId], { baslik: "Size yeni bir iş emri atandı", metin: `${opts.olusturanAd}: ${opts.baslik}`.slice(0, 180), url: `/kokpit/isler/${is.id}`, etiket: `is-${is.id}` });
  }
  revalidatePath("/kokpit/isler");
  return is.id;
}

export async function dilekceEkle(formData: FormData) {
  const k = await yetkili();
  const davaDosyasiId = metin(formData, "dosyaId");
  const tur = metin(formData, "tur");
  const baslik = metin(formData, "baslik");
  if (!davaDosyasiId || !tur || !baslik) throw new Error("Dosya, tür ve başlık zorunludur.");
  const gonderildi = metin(formData, "durum") === "GONDERILDI";
  const dilekce = await prisma.dilekce.create({
    data: {
      davaDosyasiId,
      tur,
      baslik,
      durum: gonderildi ? "GONDERILDI" : "TASLAK",
      gonderimTarihi: gonderildi ? (tarihOrNull(formData, "gonderimTarihi") ?? new Date()) : null,
      gonderimYolu: metin(formData, "gonderimYolu") || null,
      uyapEvrakNo: metin(formData, "uyapEvrakNo") || null,
      sonrakiAdimVade: tarihOrNull(formData, "sonrakiAdimVade"),
      notlar: metin(formData, "notlar") || null,
      olusturanId: k.kullaniciId,
    },
  });
  // Istege bagli: dilekceyi hazirlamasi/islemesi icin birine is emri ver.
  const sorumluId = metin(formData, "sorumluId");
  if (sorumluId) {
    const isId = await isEmriAc({
      baslik: gonderildi ? `Gönderilen dilekçeyi işle: ${baslik}` : `Dilekçe hazırla: ${baslik}`,
      aciklama: `${tur} — Avukat > Dilekçe Yönetimi kaydına bağlı iş emri.`,
      sorumluId,
      kaynak: `dilekce:${dilekce.id}`,
      vade: tarihOrNull(formData, "sonrakiAdimVade"),
      olusturanId: k.kullaniciId,
      olusturanAd: k.adSoyad,
    });
    await prisma.dilekce.update({ where: { id: dilekce.id }, data: { isId } });
  }
  revalidatePath("/kokpit/avukat/dilekce-yonetimi");
}

// Mevcut dilekce icin sonradan is emri ver.
export async function dilekceIsEmriVer(dilekceId: string, formData: FormData) {
  const k = await yetkili();
  const sorumluId = metin(formData, "sorumluId");
  if (!sorumluId) throw new Error("Sorumlu seçin.");
  const d = await prisma.dilekce.findUnique({ where: { id: dilekceId } });
  if (!d) throw new Error("Dilekçe bulunamadı.");
  const isId = await isEmriAc({
    baslik: d.durum === "GONDERILDI" ? `Gönderilen dilekçeyi işle: ${d.baslik}` : `Dilekçe hazırla: ${d.baslik}`,
    aciklama: `${d.tur} — Avukat > Dilekçe Yönetimi kaydına bağlı iş emri.${metin(formData, "not") ? "\n" + metin(formData, "not") : ""}`,
    sorumluId,
    kaynak: `dilekce:${d.id}`,
    vade: d.sonrakiAdimVade,
    olusturanId: k.kullaniciId,
    olusturanAd: k.adSoyad,
  });
  await prisma.dilekce.update({ where: { id: d.id }, data: { isId, guncellemeTarihi: new Date() } });
  revalidatePath("/kokpit/avukat/dilekce-yonetimi");
}

// Dilekce gonderildi olarak islenir; bagli is emri varsa tamamlanir.
export async function dilekceGonderildiIsle(dilekceId: string, formData: FormData) {
  const k = await yetkili();
  const d = await prisma.dilekce.update({
    where: { id: dilekceId },
    data: {
      durum: "GONDERILDI",
      gonderimTarihi: tarihOrNull(formData, "gonderimTarihi") ?? new Date(),
      gonderimYolu: metin(formData, "gonderimYolu") || null,
      uyapEvrakNo: metin(formData, "uyapEvrakNo") || null,
      guncellemeTarihi: new Date(),
    },
  });
  if (d.isId) {
    await prisma.is.update({ where: { id: d.isId }, data: { durum: "TAMAMLANDI", tamamlanmaTarihi: new Date(), guncellemeTarihi: new Date() } });
    await prisma.isYorumu.create({ data: { isId: d.isId, yazanId: k.kullaniciId, metin: "Dilekçe gönderildi olarak işlendi." } });
    revalidatePath("/kokpit/isler");
  }
  revalidatePath("/kokpit/avukat/dilekce-yonetimi");
}

export async function dilekceSil(dilekceId: string) {
  const k = await yetkili();
  if (k.rol !== "YONETICI") throw new Error("Silme yetkisi yalnız yöneticidedir.");
  await prisma.dilekce.delete({ where: { id: dilekceId } });
  revalidatePath("/kokpit/avukat/dilekce-yonetimi");
}

// Durusma artcisi: durusma sonrasi yapilacak is icin is emri.
export async function durusmaArtciIsEmriVer(dosyaId: string, formData: FormData) {
  const k = await yetkili();
  const sorumluId = metin(formData, "sorumluId");
  const baslik = metin(formData, "baslik");
  if (!sorumluId || !baslik) throw new Error("Sorumlu ve iş başlığı zorunludur.");
  await isEmriAc({
    baslik,
    aciklama: "Avukat > Duruşma Artçıları'ndan verilen iş emri.",
    sorumluId,
    kaynak: `durusma:${dosyaId}`,
    vade: tarihOrNull(formData, "vade"),
    olusturanId: k.kullaniciId,
    olusturanAd: k.adSoyad,
  });
  revalidatePath("/kokpit/avukat/durusma-artcilari");
}
