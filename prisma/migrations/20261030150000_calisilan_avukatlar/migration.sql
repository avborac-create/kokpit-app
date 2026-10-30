-- Dis buro (calisilan) avukat listesi ve bunlarin dosyada UYAP vekili olarak isaretlenebilmesi. Mevcut kayitlar degismez.
CREATE TABLE "calisilan_avukatlar" (
    "id" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "buro" TEXT,
    "aktifMi" BOOLEAN NOT NULL DEFAULT true,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calisilan_avukatlar_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "dosya_uyap_vekilleri" ALTER COLUMN "kullaniciId" DROP NOT NULL;
ALTER TABLE "dosya_uyap_vekilleri" ADD COLUMN "calisilanAvukatId" TEXT;
CREATE UNIQUE INDEX "dosya_uyap_vekilleri_davaDosyasiId_calisilanAvukatId_key" ON "dosya_uyap_vekilleri"("davaDosyasiId", "calisilanAvukatId");
CREATE INDEX "dosya_uyap_vekilleri_calisilanAvukatId_idx" ON "dosya_uyap_vekilleri"("calisilanAvukatId");
ALTER TABLE "dosya_uyap_vekilleri" ADD CONSTRAINT "dosya_uyap_vekilleri_calisilanAvukatId_fkey" FOREIGN KEY ("calisilanAvukatId") REFERENCES "calisilan_avukatlar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
