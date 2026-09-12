// Kokpit'in sol menusunu besleyen tek kaynak. Yeni bir modul eklerken
// (dava dosyalari, personel takibi, vb.) once bu modulun kendi klasoru
// src/modules/<modul>/ ve src/app/kokpit/<modul>/ altinda olusturulur,
// sonra buraya tek bir satir eklenir. Mevcut modullere dokunulmaz.
export type ModulTanimi = {
  anahtar: string;
  ad: string;
  yol: string;
  aktif: boolean; // false ise menude "Yakında" rozetiyle gosterilir, tiklanamaz
};

export const MODUL_KAYIT_DEFTERI: ModulTanimi[] = [
  { anahtar: "musteriler", ad: "Müvekkiller", yol: "/kokpit/musteriler", aktif: true },
  { anahtar: "dava-dosyalari", ad: "Dava Dosyaları", yol: "/kokpit/dava-dosyalari", aktif: true },
  { anahtar: "finans", ad: "Finans / Muhasebe", yol: "/kokpit/finans", aktif: false },
];
