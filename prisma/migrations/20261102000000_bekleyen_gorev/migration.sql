-- Bekleyen Gorevler: yeni tablo, mevcut veriye dokunmaz.
CREATE TABLE "bekleyen_gorevler" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "kaynak" TEXT,
    "sorumluId" TEXT,
    "olusturanId" TEXT,
    "tamamlandiMi" BOOLEAN NOT NULL DEFAULT false,
    "tamamlanmaTarihi" TIMESTAMP(3),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bekleyen_gorevler_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bekleyen_gorevler_sorumluId_tamamlandiMi_idx" ON "bekleyen_gorevler"("sorumluId", "tamamlandiMi");
CREATE INDEX "bekleyen_gorevler_kaynak_idx" ON "bekleyen_gorevler"("kaynak");
