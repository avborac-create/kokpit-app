// Karsi vekalet (202) icin KDV tevkifatli / stopajli odemelerin net tutar hesabi.
//
// Akis: kullanici KDV DAHIL tutari girer -> sistem KDV haric tutari, KDV'yi, (varsa) KDV tevkifatini ve stopaji
// hesaplar -> bizim hesabimiza gecen NET tutar karsi vekalet hesabinda BORCLANDIRMA olarak yazilir.
//
// Oranlar kullanicidan gelir (varsayilanlar asagida); hangi odemede hangi tevkifat/stopaj orani uygulanacagi
// hukuki-mali bir karar oldugu icin sabitlenmez. Tum tutarlar kurus hassasiyetinde yuvarlanir.

export type KarsiVekaletGirdisi = {
  // KDV dahil tutar (odemenin brut tutari)
  kdvDahilTutar: number;
  // KDV orani, yuzde (varsayilan 20)
  kdvOrani?: number;
  // KDV tevkifat orani, yuzde olarak KDV'nin ne kadari kesilir (0 = tevkifat yok; ornegin 50 = 5/10, 90 = 9/10)
  kdvTevkifatOrani?: number;
  // Stopaj (gelir vergisi kesintisi) orani, KDV HARIC tutar uzerinden yuzde (0 = stopaj yok)
  stopajOrani?: number;
};

export type KarsiVekaletSonucu = {
  kdvHaricTutar: number;
  kdv: number;
  // KDV'nin alici tarafindan sorumlu olarak odenen (bize odenmeyen) kismi
  kdvTevkifati: number;
  stopaj: number;
  // Hesabimiza gecen net tutar = KDV dahil tutar - KDV tevkifati - stopaj
  netTutar: number;
};

const kurus = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function karsiVekaletHesapla({ kdvDahilTutar, kdvOrani = 20, kdvTevkifatOrani = 0, stopajOrani = 0 }: KarsiVekaletGirdisi): KarsiVekaletSonucu {
  const kdvHaricTutar = kurus(kdvDahilTutar / (1 + kdvOrani / 100));
  const kdv = kurus(kdvDahilTutar - kdvHaricTutar);
  const kdvTevkifati = kurus((kdv * kdvTevkifatOrani) / 100);
  const stopaj = kurus((kdvHaricTutar * stopajOrani) / 100);
  const netTutar = kurus(kdvDahilTutar - kdvTevkifati - stopaj);
  return { kdvHaricTutar, kdv, kdvTevkifati, stopaj, netTutar };
}
