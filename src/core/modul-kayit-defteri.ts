import type { KullaniciRolu } from "@prisma/client";

// Kokpit'in sol menusunu besleyen tek kaynak. Yeni bir modul eklerken
// (dava dosyalari, personel takibi, vb.) once bu modulun kendi klasoru
// src/modules/<modul>/ ve src/app/kokpit/<modul>/ altinda olusturulur,
// sonra buraya tek bir satir eklenir. Mevcut modullere dokunulmaz.
export type ModulTanimi = {
  anahtar: string;
  ad: string;
  yol: string;
  aktif: boolean; // false ise menude "Yakında" rozetiyle gosterilir, tiklanamaz
  rolGorebilir?: KullaniciRolu[]; // belirtilmezse tum roller gorur
};

// NOT: Bu liste bilerek DUZ (flat) kalir - Ayarlar > Menü Düzeni ekrani
// hala bunu tek tek gizle/goster edilebilir bir liste olarak okur (bkz.
// ayarlar/menu/page.tsx). Sol menudeki BOLUMLERE ayirma/ic ice (Dosyalar >
// Hukuk/Ceza) yerlesim SADECE gorunum katmaninda (kenar-cubugu.tsx) sabit
// olarak kodlanir - "hangi sayfa hangi isimle var" (veri) ile "ekranda
// nasil gruplanip gosterildigi" (sunum) bilerek ayri tutulur.
//
// "finans" (eski ust-duzey "Finans / Muhasebe") ve "gelistirme-kutusu"
// BILEREK bu listede degil: ilki artik ayri bir menu ogesi olarak
// gosterilmiyor (Musteri Finans'in altina alindi, kendisi hala
// /kokpit/finans/... uzerinden musteri/dosya sayfalarindaki mevcut
// baglantilarla erisilebilir durumda), ikincisi normal kullanicinin sol
// menusunden tamamen kaldirilip Ayarlar sekmelerine (sadece YONETICI
// rolune) tasindi - bkz. ayarlar/ayarlar-sekmeleri.tsx.
export const MODUL_KAYIT_DEFTERI: ModulTanimi[] = [
  { anahtar: "ana-sayfa", ad: "Ana Sayfa", yol: "/kokpit", aktif: true },
  { anahtar: "musteriler", ad: "Müvekkiller", yol: "/kokpit/musteriler", aktif: true },
  { anahtar: "dava-dosyalari", ad: "Hukuk Dosyaları", yol: "/kokpit/dava-dosyalari", aktif: true },
  { anahtar: "cmk-dosyalari", ad: "Ceza / CMK Dosyaları", yol: "/kokpit/cmk-dosyalari", aktif: true },
  { anahtar: "muvekkil-finans", ad: "Müvekkil Finans", yol: "/kokpit/muvekkil-finans", aktif: true },
  {
    anahtar: "oneriler",
    ad: "Öneriler",
    yol: "/kokpit/oneriler",
    aktif: true,
    rolGorebilir: ["YONETICI", "ORTAK"],
  },
  {
    anahtar: "ayarlar",
    ad: "Ayarlar",
    yol: "/kokpit/ayarlar/secenekler",
    aktif: true,
    rolGorebilir: ["YONETICI", "ORTAK"],
  },
];
