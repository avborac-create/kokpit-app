import type { Prisma } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import type { ParaTalebiVerisi } from "../components/ekonomi/para-talebi-karti";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

// Kayıtları kart verisine çevirir; sorumlu adı için kullanıcı tablosuna bakar.
export async function paraTalebiVerileri(where: Prisma.HesapOzetiKaydiWhereInput): Promise<ParaTalebiVerisi[]> {
  const kayitlar = await prisma.hesapOzetiKaydi.findMany({
    where: { ...where, OR: [{ ertelemeTarihi: null }, { ertelemeTarihi: { lte: new Date() } }, { sonuc: { not: null } }] },
    orderBy: { olusturmaTarihi: "desc" },
    include: { musteri: { select: { adSoyadUnvan: true } } },
  });
  const idler = [...new Set(kayitlar.map((k) => k.sorumluId ?? k.olusturanId).filter((x): x is string => !!x))];
  const kisiler = await prisma.kullanici.findMany({ where: { id: { in: idler } }, select: { id: true, adSoyad: true } });
  const ad = new Map(kisiler.map((k) => [k.id, k.adSoyad]));
  const simdi = Date.now();
  return kayitlar.map((k) => {
    const istendi = k.sonuc === "GONDERILDI";
    const istenme = k.istenmeTarihi ?? k.sonucTarihi;
    return {
      id: k.id,
      musteriAdi: k.musteri.adSoyadUnvan,
      toplam: k.toplam,
      konu: k.konu,
      sorumluAdi: ad.get(k.sorumluId ?? k.olusturanId ?? "") ?? null,
      olusturma: k.olusturmaTarihi.toISOString(),
      istendi,
      istenmeTarihi: iso(istenme),
      yol: k.yol,
      geldiMi: k.geldiMi,
      geldiTarihi: iso(k.geldiTarihi),
      bankaHesabi: k.bankaHesabi,
      bekleyenGun: istendi && !k.geldiMi && istenme ? Math.max(0, Math.floor((simdi - istenme.getTime()) / 86_400_000)) : null,
    };
  });
}

// Önceki girişlerde kullanılan banka hesapları (öneri listesi için).
export async function kullanilmisBankalar(): Promise<string[]> {
  const s = await prisma.hesapOzetiKaydi.findMany({ where: { bankaHesabi: { not: null } }, distinct: ["bankaHesabi"], select: { bankaHesabi: true }, take: 30 });
  return s.map((x) => x.bankaHesabi!).filter(Boolean);
}
