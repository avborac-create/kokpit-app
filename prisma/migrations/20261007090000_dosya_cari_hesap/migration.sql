-- CreateTable
CREATE TABLE "dosya_para_girisleri" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "aciklama" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosya_para_girisleri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dosya_cari_tahakkuklari" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "cariKodId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "dayanak" TEXT NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosya_cari_tahakkuklari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dosya_cari_dagitimlari" (
    "id" TEXT NOT NULL,
    "paraGirisiId" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "cariKodId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "aciklama" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosya_cari_dagitimlari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dosya_para_girisleri_dosyaId_idx" ON "dosya_para_girisleri"("dosyaId");
CREATE INDEX "dosya_cari_tahakkuklari_dosyaId_idx" ON "dosya_cari_tahakkuklari"("dosyaId");
CREATE INDEX "dosya_cari_tahakkuklari_cariKodId_idx" ON "dosya_cari_tahakkuklari"("cariKodId");
CREATE INDEX "dosya_cari_dagitimlari_paraGirisiId_idx" ON "dosya_cari_dagitimlari"("paraGirisiId");
CREATE INDEX "dosya_cari_dagitimlari_dosyaId_idx" ON "dosya_cari_dagitimlari"("dosyaId");
CREATE INDEX "dosya_cari_dagitimlari_cariKodId_idx" ON "dosya_cari_dagitimlari"("cariKodId");

-- AddForeignKey
ALTER TABLE "dosya_para_girisleri" ADD CONSTRAINT "dosya_para_girisleri_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dosya_cari_tahakkuklari" ADD CONSTRAINT "dosya_cari_tahakkuklari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dosya_cari_tahakkuklari" ADD CONSTRAINT "dosya_cari_tahakkuklari_cariKodId_fkey" FOREIGN KEY ("cariKodId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dosya_cari_dagitimlari" ADD CONSTRAINT "dosya_cari_dagitimlari_paraGirisiId_fkey" FOREIGN KEY ("paraGirisiId") REFERENCES "dosya_para_girisleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dosya_cari_dagitimlari" ADD CONSTRAINT "dosya_cari_dagitimlari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dosya_cari_dagitimlari" ADD CONSTRAINT "dosya_cari_dagitimlari_cariKodId_fkey" FOREIGN KEY ("cariKodId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
