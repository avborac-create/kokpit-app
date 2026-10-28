// "use client" olan filtre-kaydedici.tsx'ten sunucu bilesenine sabit
// aktarilamaz (istemci referansi olur) - bu yuzden ayri, duz bir modul.
export const DOSYA_FILTRE_COOKIE = "kokpit-dosya-filtre";

// Kayitli filtre, listeye en son bakildigindan itibaren bu sure (saniye)
// icinde geri gelir; sonra kendiliginden silinir. Filtreli listeye her
// girildiginde sure yeniden baslar.
export const DOSYA_FILTRE_ZAMAN_ASIMI_SN = 10 * 60;
