-- CreateEnum
CREATE TYPE "dosya_evresi" AS ENUM ('ACILIS', 'DERDEST', 'KARAR_VERILDI', 'GEREKCELI_KARAR_BEKLENIYOR', 'GEREKCELI_KARAR_HAZIR', 'TEBLIG_BEKLENIYOR', 'KANUN_YOLU_DEGERLENDIRME', 'ISTINAFTA', 'BAM_KARARI_GELDI', 'TEMYIZ_DEGERLENDIRME', 'TEMYIZDE', 'KESINLESME_BEKLENIYOR', 'KESINLESTI');

-- CreateEnum
CREATE TYPE "hukuki_mudahale_durumu" AS ENUM ('BEKLEMEDE', 'DEVAM_EDIYOR', 'TAMAMLANDI', 'IPTAL_EDILDI');

-- AlterTable: DavaDosyasi -> Karar Sonrasi Takip alanlari (hepsi opsiyonel)
ALTER TABLE "dava_dosyalari" ADD COLUMN "dosyaEvresi" "dosya_evresi";
ALTER TABLE "dava_dosyalari" ADD COLUMN "evreDegisiklikTarihi" TIMESTAMP(3);
ALTER TABLE "dava_dosyalari" ADD COLUMN "sonrakiKontrolTarihi" TIMESTAMP(3);
ALTER TABLE "dava_dosyalari" ADD COLUMN "sonrakiKontrolSorusu" TEXT;
ALTER TABLE "dava_dosyalari" ADD COLUMN "sonKontrolTarihi" TIMESTAMP(3);
ALTER TABLE "dava_dosyalari" ADD COLUMN "sonKontrolSonucu" TEXT;

-- CreateIndex
CREATE INDEX "dava_dosyalari_dosyaEvresi_idx" ON "dava_dosyalari"("dosyaEvresi");

-- CreateTable: HukukiMudahale (Avukat Sapkasi) - bkz. ARCHITECTURE.md
CREATE TABLE "hukuki_mudahaleler" (
    "id" TEXT NOT NULL,
    "davaDosyasiId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "mudahaleTuruId" TEXT,
    "durum" "hukuki_mudahale_durumu" NOT NULL DEFAULT 'BEKLEMEDE',
    "oncelikId" TEXT,
    "sorumluAvukatId" TEXT,
    "sonTarih" TIMESTAMP(3),
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tamamlanmaTarihi" TIMESTAMP(3),

    CONSTRAINT "hukuki_mudahaleler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hukuki_mudahaleler_davaDosyasiId_idx" ON "hukuki_mudahaleler"("davaDosyasiId");

-- CreateIndex
CREATE INDEX "hukuki_mudahaleler_durum_idx" ON "hukuki_mudahaleler"("durum");

-- CreateIndex
CREATE INDEX "hukuki_mudahaleler_sorumluAvukatId_idx" ON "hukuki_mudahaleler"("sorumluAvukatId");

-- CreateIndex
CREATE INDEX "hukuki_mudahaleler_sonTarih_idx" ON "hukuki_mudahaleler"("sonTarih");

-- AddForeignKey
ALTER TABLE "hukuki_mudahaleler" ADD CONSTRAINT "hukuki_mudahaleler_davaDosyasiId_fkey" FOREIGN KEY ("davaDosyasiId") REFERENCES "dava_dosyalari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hukuki_mudahaleler" ADD CONSTRAINT "hukuki_mudahaleler_mudahaleTuruId_fkey" FOREIGN KEY ("mudahaleTuruId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hukuki_mudahaleler" ADD CONSTRAINT "hukuki_mudahaleler_oncelikId_fkey" FOREIGN KEY ("oncelikId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hukuki_mudahaleler" ADD CONSTRAINT "hukuki_mudahaleler_sorumluAvukatId_fkey" FOREIGN KEY ("sorumluAvukatId") REFERENCES "kullanicilar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
