-- CreateTable
CREATE TABLE "irtibat_kisileri" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "unvanGorev" TEXT,
    "konuBasligi" TEXT,
    "telefon" TEXT,
    "eposta" TEXT,
    "birincilMi" BOOLEAN NOT NULL DEFAULT false,
    "notlar" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "irtibat_kisileri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "irtibat_kisileri_musteriId_idx" ON "irtibat_kisileri"("musteriId");

-- AddForeignKey
ALTER TABLE "irtibat_kisileri" ADD CONSTRAINT "irtibat_kisileri_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
