-- Dosyada UYAP'ta vekil kayitli avukatlar. Yalniz yeni tablo; mevcut kayitlar degismez.
CREATE TABLE "dosya_uyap_vekilleri" (
    "id" TEXT NOT NULL,
    "davaDosyasiId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dosya_uyap_vekilleri_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dosya_uyap_vekilleri_davaDosyasiId_kullaniciId_key" ON "dosya_uyap_vekilleri"("davaDosyasiId", "kullaniciId");
CREATE INDEX "dosya_uyap_vekilleri_kullaniciId_idx" ON "dosya_uyap_vekilleri"("kullaniciId");
ALTER TABLE "dosya_uyap_vekilleri" ADD CONSTRAINT "dosya_uyap_vekilleri_davaDosyasiId_fkey" FOREIGN KEY ("davaDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dosya_uyap_vekilleri" ADD CONSTRAINT "dosya_uyap_vekilleri_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
