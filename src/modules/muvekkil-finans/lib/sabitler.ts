import type { MusteriFinansIslemTuru, MusteriFinansParaAmaci } from "@prisma/client";

// Sabit, kapali kume (bkz. schema.prisma'daki enum yorumu - admin panelden
// genisletilebilir olmasi BILEREK istenmiyor). Hem actions.ts'in dogrulamasi
// hem de UI bilesenlerinin (secim kutulari, etiketler) TEK ortak kaynagi.
export const ISLEM_TURU_ETIKETLERI: Record<MusteriFinansIslemTuru, string> = {
  PARA_GIRISI: "Para Girişi",
  MASRAF: "Masraf",
  DIS_KURUMA_AKTARIM: "Dış Kuruma Aktarım",
  DIS_KURUMDAN_IADE: "Dış Kurumdan İade",
  MUSTERIYE_IADE: "Müvekkile İade",
};

export const PARA_AMACI_ETIKETLERI: Record<MusteriFinansParaAmaci, string> = {
  MASRAF_AVANSI: "Masraf Avansı",
  TEMINAT: "Teminat",
  VEKALET_UCRETI: "Vekalet Ücreti",
  TAHSILAT: "Tahsilat",
  DIGER: "Diğer",
};

export const MUVEKKIL_FINANS_ISLEM_TURLERI = Object.entries(ISLEM_TURU_ETIKETLERI).map(
  ([deger, etiket]) => ({ deger: deger as MusteriFinansIslemTuru, etiket }),
);

export const MUVEKKIL_FINANS_PARA_AMACLARI = Object.entries(PARA_AMACI_ETIKETLERI).map(
  ([deger, etiket]) => ({ deger: deger as MusteriFinansParaAmaci, etiket }),
);
