-- Ihtar dosyasi gonderim bilgileri (noter / KEP) - additive
CREATE TABLE "ihtar_gonderimleri" (
  "id" TEXT NOT NULL,
  "dosyaId" TEXT NOT NULL,
  "yol" TEXT,
  "noterlik" TEXT,
  "yevmiyeNo" TEXT,
  "kepAdresi" TEXT,
  "kepGonderimNo" TEXT,
  "gonderimTarihi" TIMESTAMP(3),
  "muhatap" TEXT,
  "tebligDurumu" TEXT,
  "tebligTarihi" TIMESTAMP(3),
  "cevapSuresiGun" INTEGER,
  "cevapGeldi" BOOLEAN NOT NULL DEFAULT false,
  "not" TEXT,
  "guncellemeTarihi" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ihtar_gonderimleri_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ihtar_gonderimleri_dosyaId_key" ON "ihtar_gonderimleri"("dosyaId");
ALTER TABLE "ihtar_gonderimleri" ADD CONSTRAINT "ihtar_gonderimleri_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;
