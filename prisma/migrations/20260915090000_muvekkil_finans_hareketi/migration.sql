-- CreateEnum
CREATE TYPE "musteri_finans_islem_turu" AS ENUM ('PARA_GIRISI', 'MASRAF', 'DIS_KURUMA_AKTARIM', 'DIS_KURUMDAN_IADE', 'MUSTERIYE_IADE');

-- CreateEnum
CREATE TYPE "musteri_finans_para_amaci" AS ENUM ('MASRAF_AVANSI', 'TEMINAT', 'VEKALET_UCRETI', 'TAHSILAT', 'DIGER');

-- CreateTable: Muvekkil Finans modulu (V1, basit) - bkz. ARCHITECTURE.md
CREATE TABLE "musteri_finans_hareketleri" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "davaDosyasiId" TEXT,
    "islemTuru" "musteri_finans_islem_turu" NOT NULL,
    "paraAmaci" "musteri_finans_para_amaci" NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "aciklama" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "musteri_finans_hareketleri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "musteri_finans_hareketleri_musteriId_idx" ON "musteri_finans_hareketleri"("musteriId");

-- CreateIndex
CREATE INDEX "musteri_finans_hareketleri_davaDosyasiId_idx" ON "musteri_finans_hareketleri"("davaDosyasiId");

-- AddForeignKey
ALTER TABLE "musteri_finans_hareketleri" ADD CONSTRAINT "musteri_finans_hareketleri_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "musteri_finans_hareketleri" ADD CONSTRAINT "musteri_finans_hareketleri_davaDosyasiId_fkey" FOREIGN KEY ("davaDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
