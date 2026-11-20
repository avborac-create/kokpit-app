import { prisma } from "@/core/db/prisma";

export type HesapSecenegi = { id: string; ad: string; tur: string; sahipAdi: string | null; varsayilanMi: boolean };

export const HESAP_TURLERI: Record<string, string> = {
  BURO: "Büro banka hesabı",
  NAKIT: "Nakit kasa",
  AVUKAT: "Avukatın kişisel hesabı",
  DIGER: "Diğer kişisel hesap",
};

// Kisisel hesap: buro disinda bir kisinin hesabi. Buradan cikan/buraya gelen para buro ile sahibi arasinda alacak-borc dogurur.
export const kisiselHesapMi = (tur: string) => tur === "AVUKAT" || tur === "DIGER";

export async function aktifHesaplar(): Promise<HesapSecenegi[]> {
  const r = await prisma.paraHesabi.findMany({ where: { aktifMi: true }, orderBy: [{ sira: "asc" }, { ad: "asc" }] });
  return r.map((h) => ({ id: h.id, ad: h.ad, tur: h.tur, sahipAdi: h.sahipAdi, varsayilanMi: h.varsayilanMi }));
}

// Formdan gelen hesapId'yi dogrular; bos ya da gecersizse null.
export async function hesapIdAl(formData: FormData): Promise<string | null> {
  const id = String(formData.get("hesapId") ?? "").trim();
  if (!id) return null;
  const h = await prisma.paraHesabi.findUnique({ where: { id }, select: { id: true } });
  return h ? h.id : null;
}

// Hesabi bos kayitlarin sayilacagi hesap: kasa icin nakit kasa, digerleri icin varsayilan buro hesabi.
export function varsayilanHesapBul(hesaplar: { id: string; tur: string; varsayilanMi: boolean }[], nakitMi = false) {
  if (nakitMi) {
    const n = hesaplar.find((h) => h.tur === "NAKIT");
    if (n) return n.id;
  }
  return (hesaplar.find((h) => h.varsayilanMi) ?? hesaplar[0])?.id ?? "";
}
