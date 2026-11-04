import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "./mevcut-kullanici";
import { silebilirMi } from "./yetki";

// Dosya ekonomisindeki (defter, virman, anlasma, masraf, avans aktarimi) kayitlari DEGISTIRME ve SILME yetkisi:
// sistem yoneticisi ya da Ayarlar > Kullanicilar'dan "finans yetkilisi" isaretlenen kisi.
export async function ekonomiDuzenleyebilirMi(): Promise<boolean> {
  const oturum = await mevcutKullanici();
  if (!oturum) return false;
  if (silebilirMi(oturum.rol)) return true;
  const k = await prisma.kullanici.findUnique({ where: { id: oturum.kullaniciId }, select: { finansYetkilisiMi: true, aktifMi: true } });
  return !!k?.aktifMi && !!k.finansYetkilisiMi;
}

export async function ekonomiYetkisiniDogrula(): Promise<void> {
  if (!(await ekonomiDuzenleyebilirMi())) throw new Error("Bu işlem için yetkiniz yok.");
}
