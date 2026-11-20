import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";

// Muvekkil telefon numaralarina erisim: YONETICI her zaman gorur; digerleri numarayi
// maskeli gorur, yonetici onayladigi talep suresince (bitisZamani) gorur.

export const ERISIM_SURESI_SAAT = 24;

export function telefonuMaskele(telefon: string | null | undefined): string {
  if (!telefon) return "—";
  const rakamlar = telefon.replace(/\D/g, "");
  const son = rakamlar.slice(-2);
  return `•••• ••• •• ${son}`;
}

export type TelefonErisimDurumu = {
  gorebilir: boolean;
  bekleyenTalepVar: boolean;
  bitisZamani: Date | null;
};

export async function telefonErisimDurumu(musteriId: string): Promise<TelefonErisimDurumu> {
  const k = await mevcutKullanici();
  if (!k) return { gorebilir: false, bekleyenTalepVar: false, bitisZamani: null };
  if (k.rol === "YONETICI") return { gorebilir: true, bekleyenTalepVar: false, bitisZamani: null };
  const simdi = new Date();
  const [onayli, bekleyen] = await Promise.all([
    prisma.telefonErisimTalebi.findFirst({
      where: { musteriId, talepEdenId: k.kullaniciId, durum: "ONAYLANDI", bitisZamani: { gt: simdi } },
      orderBy: { bitisZamani: "desc" },
      select: { bitisZamani: true },
    }),
    prisma.telefonErisimTalebi.findFirst({
      where: { musteriId, talepEdenId: k.kullaniciId, durum: "BEKLIYOR" },
      select: { id: true },
    }),
  ]);
  return { gorebilir: Boolean(onayli), bekleyenTalepVar: Boolean(bekleyen), bitisZamani: onayli?.bitisZamani ?? null };
}

// Liste ekranlari icin: kullanicinin numarasini gorebildigi muvekkil id'leri (yonetici icin null = hepsi).
export async function telefonGorulebilirMusteriler(): Promise<Set<string> | null> {
  const k = await mevcutKullanici();
  if (!k) return new Set();
  if (k.rol === "YONETICI") return null;
  const satirlar = await prisma.telefonErisimTalebi.findMany({
    where: { talepEdenId: k.kullaniciId, durum: "ONAYLANDI", bitisZamani: { gt: new Date() } },
    select: { musteriId: true },
  });
  return new Set(satirlar.map((s) => s.musteriId));
}
