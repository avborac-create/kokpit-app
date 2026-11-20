-- Para Trafigi: "Inceleniyor" durumu icin iki yeni bos alan + yonetici "kullanici gozuyle calis" izi (yalniz ekleme; mevcut veriye dokunmaz)
ALTER TABLE "gelen_odeme_kayitlari" ADD COLUMN "incelemeyeAlanId" TEXT;
ALTER TABLE "gelen_odeme_kayitlari" ADD COLUMN "incelemeZamani" TIMESTAMP(3);

CREATE TABLE "adina_calisma_kayitlari" (
  "id" TEXT NOT NULL,
  "yoneticiId" TEXT NOT NULL,
  "hedefKullaniciId" TEXT NOT NULL,
  "baslangic" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bitis" TIMESTAMP(3),
  CONSTRAINT "adina_calisma_kayitlari_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "adina_calisma_kayitlari_yoneticiId_baslangic_idx" ON "adina_calisma_kayitlari"("yoneticiId", "baslangic");
