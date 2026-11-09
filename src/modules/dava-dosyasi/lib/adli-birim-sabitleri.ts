// Adli birim adi UYAP'taki gibi kurulur: "{Adliye} {Sira}. {Tur}" (sira yoksa "{Adliye} {Tur}").
// Adliye ve tur listeleri sabittir; serbest yazima yer birakmaz (kisaltma/yazim hatasi olusmaz).

export const ADLIYELER = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Ankara Batı", "Antalya", "Ardahan", "Artvin",
  "Aydın", "Bakırköy", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa",
  "Büyükçekmece", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir",
  "Gaziantep", "Gebze", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İstanbul Anadolu", "İzmir", "İzmir Batı",
  "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu",
  "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Silivri", "Sinop", "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon",
  "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
] as const;

// numarali: "51. Asliye Hukuk Mahkemesi" gibi sira numarasi alir; false ise numarasizdir.
export const BIRIM_TURLERI: { ad: string; numarali: boolean }[] = [
  { ad: "Asliye Hukuk Mahkemesi", numarali: true },
  { ad: "Asliye Ticaret Mahkemesi", numarali: true },
  { ad: "Asliye Ceza Mahkemesi", numarali: true },
  { ad: "Ağır Ceza Mahkemesi", numarali: true },
  { ad: "Sulh Hukuk Mahkemesi", numarali: true },
  { ad: "Sulh Ceza Hakimliği", numarali: true },
  { ad: "İş Mahkemesi", numarali: true },
  { ad: "Aile Mahkemesi", numarali: true },
  { ad: "Tüketici Mahkemesi", numarali: true },
  { ad: "Kadastro Mahkemesi", numarali: true },
  { ad: "Fikri ve Sınai Haklar Hukuk Mahkemesi", numarali: true },
  { ad: "Fikri ve Sınai Haklar Ceza Mahkemesi", numarali: true },
  { ad: "Çocuk Mahkemesi", numarali: true },
  { ad: "Çocuk Ağır Ceza Mahkemesi", numarali: true },
  { ad: "İcra Hukuk Mahkemesi", numarali: true },
  { ad: "İcra Ceza Mahkemesi", numarali: true },
  { ad: "İcra Dairesi", numarali: true },
  { ad: "İdare Mahkemesi", numarali: true },
  { ad: "Vergi Mahkemesi", numarali: true },
  { ad: "Cumhuriyet Başsavcılığı", numarali: false },
];

export function birimAdiOlustur(adliye: string, tur: string, sira: number | null): string {
  return sira ? `${adliye} ${sira}. ${tur}` : `${adliye} ${tur}`;
}
