-- Isler (gorev/konu sistemi): yeni tablolar, mevcut veriye dokunmaz.
CREATE TABLE "isler" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'BASLATILMADI',
    "sorumluId" TEXT,
    "olusturanId" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tamamlanmaTarihi" TIMESTAMP(3),

    CONSTRAINT "isler_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "is_maddeleri" (
    "id" TEXT NOT NULL,
    "isId" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "tamam" BOOLEAN NOT NULL DEFAULT false,
    "sira" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "is_maddeleri_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "is_yorumlari" (
    "id" TEXT NOT NULL,
    "isId" TEXT NOT NULL,
    "yazanId" TEXT,
    "metin" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "is_yorumlari_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "isler_durum_idx" ON "isler"("durum");
CREATE INDEX "isler_sorumluId_durum_idx" ON "isler"("sorumluId", "durum");
CREATE INDEX "is_maddeleri_isId_idx" ON "is_maddeleri"("isId");
CREATE INDEX "is_yorumlari_isId_tarih_idx" ON "is_yorumlari"("isId", "tarih");

ALTER TABLE "is_maddeleri" ADD CONSTRAINT "is_maddeleri_isId_fkey" FOREIGN KEY ("isId") REFERENCES "isler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "is_yorumlari" ADD CONSTRAINT "is_yorumlari_isId_fkey" FOREIGN KEY ("isId") REFERENCES "isler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "is_ekleri" (
    "id" TEXT NOT NULL,
    "isId" TEXT NOT NULL,
    "yorumId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tur" TEXT NOT NULL,

    CONSTRAINT "is_ekleri_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "is_ekleri_isId_idx" ON "is_ekleri"("isId");
CREATE INDEX "is_ekleri_yorumId_idx" ON "is_ekleri"("yorumId");

ALTER TABLE "is_ekleri" ADD CONSTRAINT "is_ekleri_yorumId_fkey" FOREIGN KEY ("yorumId") REFERENCES "is_yorumlari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "is_yardimlari" (
    "id" TEXT NOT NULL,
    "isId" TEXT NOT NULL,
    "isteyenId" TEXT NOT NULL,
    "yardimciId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "is_yardimlari_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "is_yardimlari_isId_yardimciId_key" ON "is_yardimlari"("isId", "yardimciId");
CREATE INDEX "is_yardimlari_yardimciId_idx" ON "is_yardimlari"("yardimciId");

ALTER TABLE "is_yardimlari" ADD CONSTRAINT "is_yardimlari_isId_fkey" FOREIGN KEY ("isId") REFERENCES "isler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
