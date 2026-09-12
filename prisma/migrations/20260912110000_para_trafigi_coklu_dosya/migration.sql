-- DropForeignKey
ALTER TABLE "musteri_para_trafigi" DROP CONSTRAINT "musteri_para_trafigi_dosyaId_fkey";

-- DropIndex
DROP INDEX "musteri_para_trafigi_dosyaId_idx";

-- AlterTable
ALTER TABLE "musteri_para_trafigi" DROP COLUMN "ilgiliDosyaId",
DROP COLUMN "dosyaId";

-- CreateTable
CREATE TABLE "para_trafigi_dosyalari" (
    "id" TEXT NOT NULL,
    "paraTrafigiId" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "para_trafigi_dosyalari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "para_trafigi_dosyalari_paraTrafigiId_dosyaId_key" ON "para_trafigi_dosyalari"("paraTrafigiId", "dosyaId");

-- CreateIndex
CREATE INDEX "para_trafigi_dosyalari_dosyaId_idx" ON "para_trafigi_dosyalari"("dosyaId");

-- AddForeignKey
ALTER TABLE "para_trafigi_dosyalari" ADD CONSTRAINT "para_trafigi_dosyalari_paraTrafigiId_fkey" FOREIGN KEY ("paraTrafigiId") REFERENCES "musteri_para_trafigi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_trafigi_dosyalari" ADD CONSTRAINT "para_trafigi_dosyalari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
