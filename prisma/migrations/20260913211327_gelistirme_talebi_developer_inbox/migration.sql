-- CreateTable
CREATE TABLE "gelistirme_talepleri" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "durumId" TEXT NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gelistirme_talepleri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gelistirme_talepleri_kullaniciId_idx" ON "gelistirme_talepleri"("kullaniciId");

-- CreateIndex
CREATE INDEX "gelistirme_talepleri_durumId_idx" ON "gelistirme_talepleri"("durumId");

-- AddForeignKey
ALTER TABLE "gelistirme_talepleri" ADD CONSTRAINT "gelistirme_talepleri_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanicilar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gelistirme_talepleri" ADD CONSTRAINT "gelistirme_talepleri_durumId_fkey" FOREIGN KEY ("durumId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
