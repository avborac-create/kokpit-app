-- CreateTable
CREATE TABLE "para_trafigi_tasnif" (
    "id" TEXT NOT NULL,
    "paraTrafigiId" TEXT NOT NULL,
    "cariKodId" TEXT NOT NULL,
    "tutar" DECIMAL(14,2) NOT NULL,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "para_trafigi_tasnif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "para_trafigi_tasnif_paraTrafigiId_cariKodId_key" ON "para_trafigi_tasnif"("paraTrafigiId", "cariKodId");

-- CreateIndex
CREATE INDEX "para_trafigi_tasnif_cariKodId_idx" ON "para_trafigi_tasnif"("cariKodId");

-- AddForeignKey
ALTER TABLE "para_trafigi_tasnif" ADD CONSTRAINT "para_trafigi_tasnif_paraTrafigiId_fkey" FOREIGN KEY ("paraTrafigiId") REFERENCES "musteri_para_trafigi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_trafigi_tasnif" ADD CONSTRAINT "para_trafigi_tasnif_cariKodId_fkey" FOREIGN KEY ("cariKodId") REFERENCES "secenek_degerleri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
