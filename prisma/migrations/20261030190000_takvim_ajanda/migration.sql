-- Ajanda alanlari: yalniz yeni sutunlar (varsayilanli); mevcut takvim ogeleri degismez.
ALTER TABLE "takvim_ogeleri" ADD COLUMN "takvim" TEXT NOT NULL DEFAULT 'IS',
ADD COLUMN "bitisTarihi" DATE,
ADD COLUMN "bitisSaati" TEXT,
ADD COLUMN "yer" TEXT,
ADD COLUMN "meetBaglantisi" TEXT,
ADD COLUMN "sorumluId" TEXT,
ADD COLUMN "etiketler" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "durum" TEXT NOT NULL DEFAULT 'BEKLIYOR',
ADD COLUMN "icerik" TEXT,
ADD COLUMN "tekrar" TEXT,
ADD COLUMN "tekrarBitis" DATE;
ALTER TABLE "takvim_ogeleri" ADD CONSTRAINT "takvim_ogeleri_sorumluId_fkey" FOREIGN KEY ("sorumluId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
