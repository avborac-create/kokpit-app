-- CreateTable
CREATE TABLE "tablo_sutun_duzeni" (
    "id" TEXT NOT NULL,
    "tabloAnahtari" TEXT NOT NULL,
    "sutunAnahtari" TEXT NOT NULL,
    "siraNo" INTEGER NOT NULL DEFAULT 0,
    "gizliMi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tablo_sutun_duzeni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tablo_sutun_duzeni_tabloAnahtari_sutunAnahtari_key" ON "tablo_sutun_duzeni"("tabloAnahtari", "sutunAnahtari");
