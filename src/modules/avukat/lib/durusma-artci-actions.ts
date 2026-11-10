"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";

async function yetkili() {
  const k = await mevcutKullanici();
  if (!k || !(await modulErisimiVarMi("avukat"))) throw new Error("Bu işlem için yetkiniz yok.");
  return k;
}

const metin = (f: FormData, ad: string) => String(f.get(ad) ?? "").trim();
const SAYFA = "/kokpit/avukat/durusma-artcilari";
const GUN = 24 * 60 * 60 * 1000;

// "2026-11-20T10:00" (datetime-local) -> Istanbul saati olarak yorumlanir.
function istanbulZamani(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v.length === 16 ? `${v}:00+03:00` : v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function gunOlarak(v: string): Date | null {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function gunEkle(d: Date, gun: number) {
  return new Date(d.getTime() + gun * GUN);
}

// Duruşma masrafı (Duruşma Masraf Föyü satırı). Tutar sabit değil; kalem hazır listeden veya serbest.
export async function durusmaMasrafiEkle(dosyaId: string, durusmaTarihiMs: number, formData: FormData) {
  const k = await yetkili();
  const kalem = metin(formData, "kalem");
  const tutar = Number(metin(formData, "tutar").replace(/\./g, "").replace(",", "."));
  if (!kalem || !Number.isFinite(tutar) || tutar <= 0) throw new Error("Masraf kalemi ve geçerli bir tutar girin.");
  const odeyen = ["AVUKAT", "BURO", "MUVEKKIL"].includes(metin(formData, "odeyen")) ? metin(formData, "odeyen") : "AVUKAT";
  await prisma.durusmaMasrafi.create({
    data: {
      davaDosyasiId: dosyaId,
      durusmaTarihi: durusmaTarihiMs ? new Date(durusmaTarihiMs) : null,
      // Duruşmaya giren avukat adına da girilebilir (föy o kişiye yazılır).
      personelId: metin(formData, "personelId") || k.kullaniciId,
      tarih: gunOlarak(metin(formData, "tarih")) ?? new Date(),
      kalem: kalem.slice(0, 120),
      tutar,
      odeyen,
      belgeVar: formData.get("belgeVar") === "on",
      aciklama: metin(formData, "aciklama") || null,
    },
  });
  revalidatePath(SAYFA);
}

export async function durusmaMasrafiSil(id: string) {
  const k = await yetkili();
  const m = await prisma.durusmaMasrafi.findUnique({ where: { id }, select: { personelId: true } });
  if (!m) return;
  if (m.personelId !== k.kullaniciId && k.rol !== "YONETICI") throw new Error("Yalnız kendi girdiğiniz masrafı silebilirsiniz.");
  await prisma.durusmaMasrafi.delete({ where: { id } });
  revalidatePath(SAYFA);
}

// Duruşma sonucu: ileri tarihe bırakıldı (yeni gün işlenir) veya karara çıktı (akıbet + takip görevleri).
export async function durusmaSonucuKaydet(dosyaId: string, durusmaTarihiMs: number, formData: FormData) {
  const k = await yetkili();
  const sonuc = metin(formData, "sonuc");
  if (sonuc !== "ILERI_TARIH" && sonuc !== "KARARA_CIKTI") throw new Error("Duruşma sonucunu seçin.");
  const durusmaTarihi = new Date(durusmaTarihiMs);
  const dosya = await prisma.davaDosyasi.findUnique({
    where: { id: dosyaId },
    select: { id: true, kayitNo: true, dosyaNo: true, birimAdi: true },
  });
  if (!dosya) throw new Error("Dosya bulunamadı.");
  const mevcut = await prisma.durusmaArtcisi.findUnique({ where: { davaDosyasiId_durusmaTarihi: { davaDosyasiId: dosyaId, durusmaTarihi } }, select: { id: true } });
  if (mevcut) throw new Error("Bu duruşmanın sonucu zaten işlenmiş.");
  const kimlik = `${dosya.birimAdi ?? ""} ${dosya.dosyaNo ?? ""}`.trim();

  if (sonuc === "ILERI_TARIH") {
    const yeni = istanbulZamani(metin(formData, "yeniDurusmaTarihi"));
    if (!yeni) throw new Error("Yeni duruşma gün ve saatini girin.");
    await prisma.$transaction([
      prisma.durusmaArtcisi.create({
        data: { davaDosyasiId: dosyaId, durusmaTarihi, sonuc, yeniDurusmaTarihi: yeni, notlar: metin(formData, "notlar") || null, olusturanId: k.kullaniciId },
      }),
      prisma.davaDosyasi.update({ where: { id: dosyaId }, data: { durusmaTarihi: yeni } }),
      prisma.takvimOgesi.create({
        data: {
          tarih: new Date(yeni.getTime() + 3 * 60 * 60 * 1000),
          saat: new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(yeni),
          baslik: `Duruşma — ${kimlik}`.slice(0, 200),
          tur: "DURUSMA",
          takvim: "DURUSMA",
          davaDosyasiId: dosyaId,
          sorumluId: k.kullaniciId,
          olusturanId: k.kullaniciId,
        },
      }),
    ]);
    revalidatePath(SAYFA);
    return;
  }

  // KARARA_CIKTI
  const yargiKolu = metin(formData, "yargiKolu") === "CEZA" ? "CEZA" : "HUKUK";
  const yasalGun = yargiKolu === "CEZA" ? 15 : 30;
  const kararGunu = gunOlarak(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(durusmaTarihi)) ?? durusmaTarihi;
  const yasalSureSonu = gunEkle(kararGunu, yasalGun);
  const ilkKontrolGun = Math.max(0, Math.min(Number(metin(formData, "ilkKontrolGun") || 3) || 3, yasalGun));
  const ilkKontrol = gunEkle(kararGunu, ilkKontrolGun);
  const sikiPeriyot = [1, 2, 7].includes(Number(metin(formData, "sikiPeriyot"))) ? Number(metin(formData, "sikiPeriyot")) : null;
  const kaynak = `durusma:${dosyaId}`;
  const sorumluId = metin(formData, "sorumluId") || k.kullaniciId;
  const akibet = metin(formData, "akibet");
  if (!akibet) throw new Error("Kararın akıbetini yazın.");

  await prisma.$transaction(async (tx) => {
    await tx.durusmaArtcisi.create({
      data: { davaDosyasiId: dosyaId, durusmaTarihi, sonuc, akibet, notlar: metin(formData, "notlar") || null, yargiKolu, yasalSureSonu, takipPeriyotGun: sikiPeriyot, olusturanId: k.kullaniciId },
    });
    await tx.is.create({
      data: {
        baslik: `Gerekçeli karar kontrolü — ${kimlik}`.slice(0, 200),
        aciklama: `Karar: ${akibet}. ${yargiKolu === "CEZA" ? "Ceza" : "Hukuk"} dosyası; gerekçeli karar için yasal süre ${yasalGun} gün. UYAP'tan yazılıp yazılmadığına bakın; yazıldıysa tebliğ/istinaf süresini ve sıradaki işi başlatın.`,
        tur: "ARTCI",
        sorumluId,
        olusturanId: k.kullaniciId,
        kaynak,
        dosyaId,
        vade: ilkKontrol,
      },
    });
    await tx.is.create({
      data: {
        baslik: `Gerekçeli karar yasal süre sonu (${yasalGun}. gün) — ${kimlik}`.slice(0, 200),
        aciklama: "Bu tarihe kadar gerekçeli karar yazılmadıysa mahkeme yazı işlerine başvurun.",
        tur: "ARTCI",
        zamanBaskisi: "SON_GUN",
        sorumluId,
        olusturanId: k.kullaniciId,
        kaynak,
        dosyaId,
        vade: yasalSureSonu,
      },
    });
    if (sikiPeriyot) {
      const gunler: Date[] = [];
      for (let g = sikiPeriyot; g <= yasalGun && gunler.length < 40; g += sikiPeriyot) gunler.push(gunEkle(kararGunu, g));
      await tx.takvimOgesi.createMany({
        data: gunler.map((tarih) => ({
          tarih,
          baslik: `Sıkı takip: gerekçeli karar yazıldı mı? — ${kimlik}`.slice(0, 200),
          tur: "GOREV" as const,
          takvim: "IS",
          davaDosyasiId: dosyaId,
          sorumluId,
          olusturanId: k.kullaniciId,
        })),
      });
    }
  });
  revalidatePath(SAYFA);
  revalidatePath("/kokpit/isler");
}

// "Sıradaki iş": sonuç işlendikten sonra dosyaya serbest metinle sıradaki görevi ekler (zincirin ilk hâli).
export async function siradakiIsEkle(dosyaId: string, formData: FormData) {
  const k = await yetkili();
  const baslik = metin(formData, "baslik");
  if (!baslik) throw new Error("Görev başlığını yazın.");
  await prisma.is.create({
    data: {
      baslik: baslik.slice(0, 200),
      tur: "ARTCI",
      sorumluId: metin(formData, "sorumluId") || k.kullaniciId,
      olusturanId: k.kullaniciId,
      kaynak: `durusma:${dosyaId}`,
      dosyaId,
      vade: gunOlarak(metin(formData, "vade")),
    },
  });
  revalidatePath(SAYFA);
  revalidatePath("/kokpit/isler");
}

export async function muvekkileBilgiVerildi(artciId: string) {
  await yetkili();
  await prisma.durusmaArtcisi.update({ where: { id: artciId }, data: { muvekkileBilgiTarihi: new Date() } });
  revalidatePath(SAYFA);
}
