// Muvekkil kaydinda telefon ve adres (il / ilce dahil) zorunludur. Eksikse kayit ancak
// "sonra tamamlayacagim" onayiyla acilir ve kullaniciya takip gorevi atanir.
// Bu dosya hem formda (istemci) hem sunucuda kullanilir.

export function eksikBilgiUyarisi(eksikler: string[]): string {
  return `${eksikler.join(" ve ")} girilmedi. Telefon ve adres (il / ilçe dahil) zorunludur; girmeden devam ederseniz size eksik bilgiyi tamamlamanız için görev atanacaktır.`;
}

export const EKSIK_BILGI_ONAY_METNI = "Eksik bilgiyi sonra tamamlayacağım (Bekleyen Görevler listeme eklensin)";

// Telefon kutusunda yalniz "+90" on eki varsa bos sayilir.
export function telefonBosMu(deger: string): boolean {
  return deger.replace(/\D/g, "").replace(/^90/, "") === "";
}
