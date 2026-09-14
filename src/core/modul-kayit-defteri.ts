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

export const MODUL_KAYIT_DEFTERI: ModulTanimi[] = [
  { anahtar: "musteriler", ad: "Müvekkiller", yol: "/kokpit/musteriler", aktif: true },
  { anahtar: "dava-dosyalari", ad: "Dosyalar", yol: "/kokpit/dava-dosyalari", aktif: true },
  { anahtar: "finans", ad: "Finans / Muhasebe", yol: "/kokpit/finans", aktif: true },
  { anahtar: "muvekkil-finans", ad: "Müvekkil Finans", yol: "/kokpit/muvekkil-finans", aktif: true },
  {
    anahtar: "oneriler",
    ad: "Öneriler",
    yol: "/kokpit/oneriler",
    aktif: true,
    rolGorebilir: ["YONETICI", "ORTAK"],
  },
  {
    anahtar: "gelistirme-kutusu",
    ad: "Geliştirme Kutusu",
    yol: "/kokpit/gelistirme-kutusu",
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
