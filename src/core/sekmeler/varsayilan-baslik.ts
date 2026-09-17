import { MODUL_KAYIT_DEFTERI } from "@/core/modul-kayit-defteri";

// MODUL_KAYIT_DEFTERI'nde YER ALMAYAN ama gezilebilir rota gruplari icin
// (bkz. modul-kayit-defteri.ts'teki not: "finans" ve "gelistirme-kutusu"
// bilerek sol menude ayri birer modul degil) elle eklenmis baslik
// karsiliklari. "/kokpit/ayarlar" burada genel bir geri-dusus olarak
// durur; modul kaydindaki "ayarlar" girdisi daha UZUN/ozel bir yol
// (`/kokpit/ayarlar/secenekler`) tasidigindan asagidaki eslestirmede o
// hala kendi sekmesine kazanir, diger ayarlar alt sayfalari (menu,
// form-duzeni) ise bu genel "Ayarlar" basligina duser.
const EK_YOL_BASLIKLARI: { yol: string; baslik: string }[] = [
  { yol: "/kokpit/finans", baslik: "Müvekkil Finans" },
  { yol: "/kokpit/gelistirme-kutusu", baslik: "Geliştirme Kutusu" },
  { yol: "/kokpit/ayarlar", baslik: "Ayarlar" },
];

function yolEslesiyorMu(yol: string, onEk: string): boolean {
  if (onEk === "/kokpit") return yol === "/kokpit";
  return yol === onEk || yol.startsWith(`${onEk}/`);
}

// Bir rotanin (pathname) sekme cubugunda gorunecek VARSAYILAN basligini
// hesaplar - en UZUN eslesen onek kazanir (ör. "/kokpit/ayarlar/secenekler"
// > "/kokpit/ayarlar"). Sayfalar <SekmeBasligi> ile bunu (musteri adi,
// dosya konusu, grup adi gibi) daha ozel bir baslikla EZEBILIR - bkz.
// sekme-basligi.tsx. Yeni bir modul MODUL_KAYIT_DEFTERI'ne eklendiginde
// bu fonksiyona DOKUNMADAN otomatik olarak dogru varsayilan baslige
// kavusur.
export function varsayilanSekmeBasligi(yol: string): string {
  const adaylar = [...MODUL_KAYIT_DEFTERI.map((m) => ({ yol: m.yol, baslik: m.ad })), ...EK_YOL_BASLIKLARI].sort(
    (a, b) => b.yol.length - a.yol.length,
  );

  const eslesen = adaylar.find((aday) => yolEslesiyorMu(yol, aday.yol));
  return eslesen?.baslik ?? "KOKPİT";
}
