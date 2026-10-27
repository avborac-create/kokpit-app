"use server";

import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { camKademesiMi, paletMi, puntoMu, temaModuMu, type GorunumTercihi } from "./sabitler";

// Kullanicinin gorunum tercihini hesabina kaydeder (cookie istemcide zaten
// yazilmis olur; burasi baska cihazda/oturumda da ayni gorunumun gelmesi icin).
export async function gorunumTercihiniKaydet(tercih: GorunumTercihi): Promise<void> {
  if (!temaModuMu(tercih.tema) || !camKademesiMi(tercih.cam) || !paletMi(tercih.palet) || !puntoMu(tercih.punto)) return;

  const kullanici = await mevcutKullanici();
  if (!kullanici) return;

  await prisma.kullanici.update({
    where: { id: kullanici.kullaniciId },
    data: { gorunumTema: tercih.tema, gorunumCam: tercih.cam, gorunumPalet: tercih.palet, gorunumPunto: tercih.punto },
  });
}
