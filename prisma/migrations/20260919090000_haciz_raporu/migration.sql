-- Haciz Raporu modulu: su ana kadar Google Form + Drive uzerinden
-- yurutulen sureci Kokpit'e tasir (bkz. ARCHITECTURE.md). Yeni tablolar,
-- geriye donuk backfill gerektiren bir veri migrasyonu yok.

-- CreateEnum
CREATE TYPE "haciz_islemi_durumu" AS ENUM ('VAR', 'YOK', 'KISMEN_VAR', 'UYGULANMADI');

-- CreateEnum
CREATE TYPE "teminat_muvafakat_durumu" AS ENUM ('VAR', 'YOK', 'ALINAMADI', 'IHTIYATI_ASAMASINDA_DEGIL');

-- CreateEnum
CREATE TYPE "belge_turu" AS ENUM ('HACIZ_TUTANAGI', 'PROTOKOL', 'FOTOGRAF');

-- CreateTable
CREATE TABLE "haciz_raporlari" (
    "id" TEXT NOT NULL,
    "davaDosyasiId" TEXT NOT NULL,
    "avukatId" TEXT NOT NULL,
    "hacizTarihi" TIMESTAMP(3) NOT NULL,
    "islemYapilanBorclular" TEXT NOT NULL,
    "irtibatNumaralari" TEXT[],
    "muhafazaDurumu" "haciz_islemi_durumu" NOT NULL,
    "istihkakDurumu" "haciz_islemi_durumu" NOT NULL,
    "kiymetTakdiriDurumu" "haciz_islemi_durumu" NOT NULL,
    "teminatIadesineMuvafakat" "teminat_muvafakat_durumu" NOT NULL,
    "tahsilatMiktari" DECIMAL(14,2) NOT NULL,
    "tahsilatKanaliId" TEXT,
    "avukatGorusu" TEXT,
    "protokolYapildiMi" BOOLEAN NOT NULL DEFAULT true,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "haciz_raporlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "belgeler" (
    "id" TEXT NOT NULL,
    "hacizRaporuId" TEXT NOT NULL,
    "tur" "belge_turu" NOT NULL,
    "adOnerisi" TEXT NOT NULL,
    "depoUrl" TEXT NOT NULL,
    "mimeTipi" TEXT NOT NULL,
    "boyutBayt" INTEGER NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "belgeler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "haciz_raporlari_davaDosyasiId_idx" ON "haciz_raporlari"("davaDosyasiId");

-- CreateIndex
CREATE INDEX "haciz_raporlari_avukatId_idx" ON "haciz_raporlari"("avukatId");

-- CreateIndex
CREATE INDEX "haciz_raporlari_tahsilatKanaliId_idx" ON "haciz_raporlari"("tahsilatKanaliId");

-- CreateIndex
CREATE INDEX "belgeler_hacizRaporuId_idx" ON "belgeler"("hacizRaporuId");

-- AddForeignKey
ALTER TABLE "haciz_raporlari" ADD CONSTRAINT "haciz_raporlari_davaDosyasiId_fkey" FOREIGN KEY ("davaDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haciz_raporlari" ADD CONSTRAINT "haciz_raporlari_avukatId_fkey" FOREIGN KEY ("avukatId") REFERENCES "kullanicilar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haciz_raporlari" ADD CONSTRAINT "haciz_raporlari_tahsilatKanaliId_fkey" FOREIGN KEY ("tahsilatKanaliId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "belgeler" ADD CONSTRAINT "belgeler_hacizRaporuId_fkey" FOREIGN KEY ("hacizRaporuId") REFERENCES "haciz_raporlari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
