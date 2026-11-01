-- Adli birim katalogu: yeni tablo, mevcut veriye dokunmaz.
CREATE TABLE "adli_birimler" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "adliye" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "sira" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adli_birimler_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "adli_birimler_ad_key" ON "adli_birimler"("ad");
