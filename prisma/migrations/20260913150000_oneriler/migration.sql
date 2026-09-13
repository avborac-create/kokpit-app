-- CreateTable
CREATE TABLE "oneriler" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "sayfaYolu" TEXT NOT NULL,
    "gorselVeri" TEXT,
    "islendiMi" BOOLEAN NOT NULL DEFAULT false,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oneriler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oneriler_kullaniciId_idx" ON "oneriler"("kullaniciId");

-- AddForeignKey
ALTER TABLE "oneriler" ADD CONSTRAINT "oneriler_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
