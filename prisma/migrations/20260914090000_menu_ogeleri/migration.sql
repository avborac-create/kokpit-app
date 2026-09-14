-- CreateTable
CREATE TABLE "menu_ogeleri" (
    "id" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "siraNo" INTEGER NOT NULL DEFAULT 0,
    "gizliMi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "menu_ogeleri_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_ogeleri_anahtar_key" ON "menu_ogeleri"("anahtar");
