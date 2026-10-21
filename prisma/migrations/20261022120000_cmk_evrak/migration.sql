-- CreateTable
CREATE TABLE "cmk_evraklari" (
    "id" TEXT NOT NULL,
    "cmkDosyasiId" TEXT NOT NULL,
    "klasor" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "evrakTarihi" TIMESTAMP(3),
    "mimeTipi" TEXT NOT NULL,
    "boyutBayt" INTEGER NOT NULL,
    "onizlemeTuru" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cmk_evraklari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cmk_evrak_icerikleri" (
    "evrakId" TEXT NOT NULL,
    "orijinalAd" TEXT NOT NULL,
    "orijinal" BYTEA NOT NULL,
    "onizleme" BYTEA,
    "onizlemeMime" TEXT,
    "metin" TEXT,

    CONSTRAINT "cmk_evrak_icerikleri_pkey" PRIMARY KEY ("evrakId")
);

-- CreateIndex
CREATE INDEX "cmk_evraklari_cmkDosyasiId_idx" ON "cmk_evraklari"("cmkDosyasiId");

-- AddForeignKey
ALTER TABLE "cmk_evraklari" ADD CONSTRAINT "cmk_evraklari_cmkDosyasiId_fkey" FOREIGN KEY ("cmkDosyasiId") REFERENCES "cmk_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cmk_evrak_icerikleri" ADD CONSTRAINT "cmk_evrak_icerikleri_evrakId_fkey" FOREIGN KEY ("evrakId") REFERENCES "cmk_evraklari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
