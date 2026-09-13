-- AlterTable
ALTER TABLE "gelistirme_talepleri" ADD COLUMN "anahtar" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "gelistirme_talepleri_anahtar_key" ON "gelistirme_talepleri"("anahtar");
