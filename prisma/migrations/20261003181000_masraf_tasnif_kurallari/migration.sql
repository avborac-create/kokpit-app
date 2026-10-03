-- CreateTable
CREATE TABLE "masraf_tasnif_kurallari" (
    "id" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "turId" TEXT,
    "cariKodId" TEXT,
    "grupId" TEXT,
    "kalemId" TEXT,
    "yansitmaHedefi" "MasrafYansitmaHedefi" NOT NULL DEFAULT 'MUVEKKIL',
    "kullanimSayisi" INTEGER NOT NULL DEFAULT 1,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masraf_tasnif_kurallari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "masraf_tasnif_kurallari_anahtar_key" ON "masraf_tasnif_kurallari"("anahtar");
