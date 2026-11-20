-- Gelistirmeler paneli (yeni tablo + ilk dolum; mevcut veriye dokunmaz)
CREATE TABLE "gelistirmeler" (
  "id" TEXT NOT NULL,
  "baslik" TEXT NOT NULL,
  "aciklama" TEXT,
  "modul" TEXT,
  "akis" TEXT NOT NULL DEFAULT 'TALEP',
  "olgunluk" TEXT NOT NULL DEFAULT 'PROTOTIP',
  "yayinTarihi" TIMESTAMP(3),
  "olusturanId" TEXT,
  "gecmis" JSONB NOT NULL DEFAULT '[]',
  "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "guncellemeTarihi" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gelistirmeler_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "gelistirmeler_akis_idx" ON "gelistirmeler"("akis");

INSERT INTO "gelistirmeler" ("id","baslik","aciklama","modul","akis","olgunluk","yayinTarihi","guncellemeTarihi") VALUES
('gel-cari','Müvekkil/dosya cari hesap sistemi','Tek cari hareket tablosu, bakiye, virman, hesap özeti','Finans','YAYINDA','LTS',NOW(),NOW()),
('gel-gorevler','Görevler','Görev listesi, tipler, odak kutusu','Görevler','YAYINDA','KARARLI',NOW(),NOW()),
('gel-dosyalar','Yargı Dosyaları','Dosya kartı, birim kataloğu, ekonomi','Yargı Dosyaları','YAYINDA','KARARLI',NOW(),NOW()),
('gel-cmk','CMK Dosyaları','Evrak alanı, önizleme, avukata özel sekme','CMK','YAYINDA','KARARLI',NOW(),NOW()),
('gel-tema','Tema sistemi','Açık/koyu, paletler, cam kademesi','Görünüm','YAYINDA','KARARLI',NOW(),NOW()),
('gel-oneri','Öneri Yolla','Sayfalardan yönetime öneri iletme','Öneriler','YAYINDA','KARARLI',NOW(),NOW()),
('gel-takvim','Büro Takvimi','Takvim, görev son günleri, sürükle-bırak erteleme','Takvim','YAYINDA','BETA',NOW(),NOW()),
('gel-para-trafigi','Para Trafiği Kaydet','Gelen ödeme kaydı, muhasebe teyidi, düzeltme talebi, toplu işlemler','Hızlı Veri Girişi','YAYINDA','BETA',NOW(),NOW()),
('gel-inceleniyor','Para Trafiği: İnceleniyor durumu','Muhasebe incelemeye alınca kaydı girene görünür','Hızlı Veri Girişi','YAYINDA','PROTOTIP',NOW(),NOW()),
('gel-adina','Kullanıcı gözüyle çalış (yönetici)','Başka kullanıcı gibi görüntüleme ve işlem yapma, izli','Yönetim','YAYINDA','PROTOTIP',NOW(),NOW()),
('gel-foyler','Masraf föyleri / Duruşma Artçıları','Personel föy yapısı, zincirli görev','Avukat','PLANLANDI','PROTOTIP',NULL,NOW()),
('gel-borclu','Borçludan gelen paraların dağıtımı','Kalem tanımı, faiz, dağıtım, geri alma','Finans','PLANLANDI','PROTOTIP',NULL,NOW()),
('gel-panel','Geliştirmeler paneli','İş akışı + olgunluk durumlarıyla geliştirme takibi','Yönetim','YAYINDA','PROTOTIP',NOW(),NOW());
