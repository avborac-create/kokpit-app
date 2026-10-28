import type { BuroRolu, KullaniciRolu } from "@prisma/client";

// Kokpit'in sol menusunu besleyen tek kaynak. Yeni bir modul eklerken
// (dava dosyalari, personel takibi, vb.) once bu modulun kendi klasoru
// src/modules/<modul>/ ve src/app/kokpit/<modul>/ altinda olusturulur,
// sonra buraya tek bir satir eklenir. Mevcut modullere dokunulmaz.
export type ModulTanimi = {
  anahtar: string;
  ad: string;
  yol: string;
  aktif: boolean; // false ise menude "Yakında" rozetiyle gosterilir, tiklanamaz
  rolGorebilir?: KullaniciRolu[]; // uygulama rolu; belirtilmezse tum roller gorur
  // Buro rolune gore kisitlama (Avukat/Yonetici/Personel): belirtilmezse tum buro rolleri gorur.
  buroRolGorebilir?: BuroRolu[];
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
  { anahtar: "dava-dosyalari", ad: "Yargı Dosyaları", yol: "/kokpit/dava-dosyalari", aktif: true },
  { anahtar: "cmk-dosyalari", ad: "CMK Dosyaları", yol: "/kokpit/cmk-dosyalari", aktif: true },
  // "haciz-artcilari" menuden kaldirildi (deaktif); sayfa, veri ve /kokpit/haciz-artcilari
  // adresi yerinde. Geri getirmek icin su girisi ve kenar-cubugu.tsx'teki blogu geri ekleyin:
  // { anahtar: "haciz-artcilari", ad: "Haciz Artçıları", yol: "/kokpit/haciz-artcilari", aktif: true,
  //   rolGorebilir: ["YONETICI"] },
  // "muvekkil-finans" menuden kaldirildi (su an kullanilmiyor); sayfa ve veri yerinde,
  // /kokpit/muvekkil-finans adresi ve dosyalardaki baglanti calismaya devam eder.
  // Geri getirmek icin satiri ve kenar-cubugu.tsx'teki FINANS blogunu geri ekleyin.
  {
    anahtar: "oneriler",
    ad: "Öneriler",
    yol: "/kokpit/oneriler",
    aktif: true,
    rolGorebilir: ["YONETICI"],
  },
  {
    anahtar: "ayarlar",
    ad: "Ayarlar",
    yol: "/kokpit/ayarlar/secenekler",
    aktif: true,
    rolGorebilir: ["YONETICI"],
  },
];
