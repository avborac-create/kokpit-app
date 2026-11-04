import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "./mevcut-kullanici";

// Yalniz Yonetici'ye acik menu modullerinden, kullanici bazinda ayrica acilabilenler.
// (Ayarlar/Oneriler guvenlik geregi bilerek burada yok.)
export const IZIN_VERILEBILIR_MODULLER: { anahtar: string; ad: string }[] = [
  { anahtar: "finans", ad: "Finans" },
  { anahtar: "avukat", ad: "Avukat" },
];

export async function kullaniciModulIzinleri(kullaniciId: string): Promise<string[]> {
  const k = await prisma.kullanici.findUnique({ where: { id: kullaniciId }, select: { modulIzinleri: true, aktifMi: true } });
  return k?.aktifMi ? k.modulIzinleri : [];
}

// Giris yapan kisi bu modulu gorebilir mi: Yonetici her zaman, digerleri yalniz izin verildiyse.
export async function modulErisimiVarMi(anahtar: string): Promise<boolean> {
  const oturum = await mevcutKullanici();
  if (!oturum) return false;
  if (oturum.rol === "YONETICI") return true;
  // Avukat modulu: buro rolu Avukat olan herkese acik (ayrica izin gerekmez).
  if (anahtar === "avukat" && oturum.buroRolu === "AVUKAT") return true;
  return (await kullaniciModulIzinleri(oturum.kullaniciId)).includes(anahtar);
}
