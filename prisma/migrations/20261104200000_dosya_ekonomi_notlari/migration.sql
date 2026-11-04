-- CreateTable
CREATE TABLE "dosya_ekonomi_notlari" (
    "id" TEXT NOT NULL,
    "dosyaId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL DEFAULT 'Yeni not',
    "icerik" TEXT NOT NULL DEFAULT '',
    "sira" INTEGER NOT NULL DEFAULT 0,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dosya_ekonomi_notlari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dosya_ekonomi_notlari_dosyaId_sira_idx" ON "dosya_ekonomi_notlari"("dosyaId", "sira");

-- AddForeignKey
ALTER TABLE "dosya_ekonomi_notlari" ADD CONSTRAINT "dosya_ekonomi_notlari_dosyaId_fkey" FOREIGN KEY ("dosyaId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

