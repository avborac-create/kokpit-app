"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

const YOLLAR = ["UYAP", "PTT", "KEP", "NOTER", "ELDEN", "DIGER"];
const DURUMLAR = ["BEKLIYOR", "TEBLIG_EDILDI", "IADE", "GECERSIZ"];

function metin(f: FormData, ad: string): string | null {
  const d = String(f.get(ad) ?? "").trim();
  return d === "" ? null : d;
}

function tarih(f: FormData, ad: string): Date | null {
  const d = metin(f, ad);
  if (!d) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error("Geçersiz tarih.");
  return new Date(`${d}T00:00:00.000Z`);
}

// Tebligat kaydi ekler ya da (tebligatId verilirse) gunceller. "gorevAc" isaretliyse son tarih icin dosyaya bagli gorev acilir.
export async function tebligatKaydet(dosyaId: string, tebligatId: string | null, f: FormData): Promise<{ hata?: string }> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return { hata: "Bu işlem için yetkiniz yok." };
  try {
    const baslik = metin(f, "baslik");
    if (!baslik) return { hata: "Tebliğ edilen evrakın adı yazılmalıdır." };
    const yolHam = metin(f, "yol");
    const durumHam = metin(f, "durum") ?? "BEKLIYOR";
    const sureHam = metin(f, "sureGun");
    const sureGun = sureHam ? Number.parseInt(sureHam, 10) : null;
    if (sureGun !== null && (!Number.isFinite(sureGun) || sureGun < 0)) return { hata: "Süre gün olarak girilmelidir." };
    const tebligTarihi = tarih(f, "tebligTarihi");
    let sonTarih = tarih(f, "sonTarih");
    // Son tarih bos ama teblig tarihi + sure varsa otomatik hesaplanir.
    if (!sonTarih && tebligTarihi && sureGun !== null) {
      sonTarih = new Date(tebligTarihi.getTime() + sureGun * 86400000);
    }
    const veri = {
      yon: metin(f, "yon") === "GIDEN" ? "GIDEN" : "GELEN",
      baslik: baslik.slice(0, 300),
      muhatap: metin(f, "muhatap"),
      yol: yolHam && YOLLAR.includes(yolHam) ? yolHam : null,
      barkod: metin(f, "barkod")?.replace(/\s+/g, "") ?? null,
      gonderimTarihi: tarih(f, "gonderimTarihi"),
      tebligTarihi,
      durum: DURUMLAR.includes(durumHam) ? durumHam : "BEKLIYOR",
      sureGun,
      sonTarih,
      not: metin(f, "not"),
    };
    let gorevId: string | undefined;
    if (f.get("gorevAc") === "on" && sonTarih) {
      const is = await prisma.is.create({
        data: {
          baslik: `Tebligat süresi: ${baslik}`.slice(0, 200),
          aciklama: veri.not,
          sorumluId: kullanici.kullaniciId,
          olusturanId: kullanici.kullaniciId,
          dosyaId,
          vade: sonTarih,
          zamanBaskisi: "SON_GUN",
        },
      });
      gorevId = is.id;
      revalidatePath("/kokpit/isler");
    }
    if (tebligatId) {
      await prisma.dosyaTebligati.update({ where: { id: tebligatId }, data: { ...veri, ...(gorevId ? { gorevId } : {}) } });
    } else {
      await prisma.dosyaTebligati.create({ data: { dosyaId, ...veri, gorevId } });
    }
    revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
    return {};
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

export async function tebligatSil(dosyaId: string, tebligatId: string): Promise<{ hata?: string }> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return { hata: "Bu işlem için yetkiniz yok." };
  await prisma.dosyaTebligati.deleteMany({ where: { id: tebligatId, dosyaId } });
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
  return {};
}
