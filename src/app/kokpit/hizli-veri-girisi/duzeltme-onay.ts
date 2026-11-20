// Teyitli kayit duzeltme talebini kimin onaylayabilecegi: once teyiti veren kisi.
// Teyit eden yoksa / pasifse / talebi kendisi actiysa, talep eden disindaki herhangi bir finans yetkilisi onaylar.
export function duzeltmeOnaylayabilirMi(a: {
  kullaniciId: string;
  yetkili: boolean;
  talepEdenId: string | null;
  teyitEdenId: string | null;
  teyitEdenAktif: boolean;
}): boolean {
  if (!a.yetkili || a.kullaniciId === a.talepEdenId) return false;
  if (a.teyitEdenId && a.teyitEdenAktif && a.teyitEdenId !== a.talepEdenId) return a.kullaniciId === a.teyitEdenId;
  return true;
}
