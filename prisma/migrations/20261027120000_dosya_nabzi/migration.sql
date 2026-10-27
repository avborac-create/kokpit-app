-- Dosya nabzi: "su an bu dosyada baska biri var" uyarisi icin. Yalnizca yeni tablo ekler;
-- mevcut kayitlara dokunmaz. Satirlar kisa omurludur (nabiz kesilince eskir, silinir).
CREATE TABLE "dosya_nabizlari" (
    "dosyaId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "sonGorulme" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosya_nabizlari_pkey" PRIMARY KEY ("dosyaId","kullaniciId")
);

CREATE INDEX "dosya_nabizlari_sonGorulme_idx" ON "dosya_nabizlari"("sonGorulme");
