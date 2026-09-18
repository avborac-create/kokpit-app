-- CreateTable: MuvekkilKumesi - ayni aile/holdinge bagli birden fazla
-- Musteri kaydini (ör. "KUCUKDEMIRLER" kumesi altinda "SALT KIMYASAL",
-- "TEKIMSAN PAZARLAMA") ust bir grup altinda toplar.
CREATE TABLE "muvekkil_kumeleri" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "notlar" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "muvekkil_kumeleri_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Musteri - opsiyonel kume baglantisi
ALTER TABLE "musteriler" ADD COLUMN "kumeId" TEXT;

-- CreateIndex
CREATE INDEX "musteriler_kumeId_idx" ON "musteriler"("kumeId");

-- AddForeignKey
ALTER TABLE "musteriler" ADD CONSTRAINT "musteriler_kumeId_fkey" FOREIGN KEY ("kumeId") REFERENCES "muvekkil_kumeleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
