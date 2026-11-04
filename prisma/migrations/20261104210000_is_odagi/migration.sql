-- Odak Kutusu (additive): kullanicinin odaklandigi gorevler
CREATE TABLE "is_odaklari" (
    "id" TEXT NOT NULL,
    "isId" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "is_odaklari_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "is_odaklari_isId_kullaniciId_key" ON "is_odaklari"("isId", "kullaniciId");
CREATE INDEX "is_odaklari_kullaniciId_tarih_idx" ON "is_odaklari"("kullaniciId", "tarih");
ALTER TABLE "is_odaklari" ADD CONSTRAINT "is_odaklari_isId_fkey" FOREIGN KEY ("isId") REFERENCES "isler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
