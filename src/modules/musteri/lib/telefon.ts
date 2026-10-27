// Telefon numarasi bicimi ve dogrulamasi (istemci ve sunucu ortak kullanir).
// Standart: uluslararasi (E.164) bicim, okunur gruplamayla: "+90 506 875 28 05".
// Basindaki "0" ulusal arama oneki oldugundan KAYDEDILMEZ; kullanici 0506...
// yazsa da +90 506... olarak duzeltilir. Yabanci numara "+" ile baslar.

export type TelefonTipi = "CEP" | "SABIT";
export type TelefonSonucu = { deger: string; tip: TelefonTipi | null } | { hata: string };

export const TELEFON_YARDIMI = "Başında 0 yazmayın: +90 otomatik eklenir (ör. 506 875 28 05). Yabancı numara + ile başlar.";

export function telefonuDuzenle(ham: string, secilenTip?: string | null): TelefonSonucu {
  const sade = ham.trim().replace(/[\s().\-]/g, "");
  if (!sade) return { hata: "Telefon numarası boş olamaz." };

  let rakamlar: string;
  if (sade.startsWith("+") || sade.startsWith("00")) {
    rakamlar = sade.replace(/^(\+|00)/, "");
    if (!/^\d+$/.test(rakamlar)) return { hata: "Numara yalnızca rakam içermelidir." };
    if (!rakamlar.startsWith("90")) {
      if (rakamlar.length < 8 || rakamlar.length > 15) return { hata: "Yabancı numara 8–15 haneli olmalıdır." };
      return { deger: `+${rakamlar}`, tip: null };
    }
    rakamlar = rakamlar.slice(2);
  } else {
    if (!/^\d+$/.test(sade)) return { hata: "Numara yalnızca rakam içermelidir." };
    rakamlar = sade.startsWith("90") && sade.length === 12 ? sade.slice(2) : sade;
    if (rakamlar.startsWith("0")) rakamlar = rakamlar.slice(1);
  }

  if (rakamlar.length !== 10) {
    return { hata: "Numara 10 haneli olmalıdır (ör. 506 875 28 05); başına 0 yazmayın, +90 otomatik eklenir." };
  }
  const ilk = rakamlar[0];
  const tip: TelefonTipi | null = ilk === "5" ? "CEP" : "23".includes(ilk) || ilk === "4" ? "SABIT" : null;
  if (!tip) return { hata: "Geçerli bir cep (5XX) ya da sabit hat (2XX, 3XX, 4XX) numarası girin." };
  if (secilenTip && (secilenTip === "CEP" || secilenTip === "SABIT") && secilenTip !== tip) {
    return { hata: tip === "CEP" ? "5 ile başlayan numara 'Cep' olmalıdır." : "Bu numara sabit hattır; tip 'Sabit' olmalıdır." };
  }
  const g = rakamlar;
  return { deger: `+90 ${g.slice(0, 3)} ${g.slice(3, 6)} ${g.slice(6, 8)} ${g.slice(8, 10)}`, tip };
}
