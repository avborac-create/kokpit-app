-- CreateTable
CREATE TABLE "form_alan_duzeni" (
    "id" TEXT NOT NULL,
    "formAnahtari" TEXT NOT NULL,
    "alanAnahtari" TEXT NOT NULL,
    "siraNo" INTEGER NOT NULL DEFAULT 0,
    "gizliMi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "form_alan_duzeni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_alan_duzeni_formAnahtari_alanAnahtari_key" ON "form_alan_duzeni"("formAnahtari", "alanAnahtari");
