-- CreateEnum
CREATE TYPE "cmk_dosya_durumu" AS ENUM ('AKTIF', 'DURUSMASI_BEKLENIYOR', 'ISTINAF_BASVURUSU', 'TEMYIZ', 'DERDEST', 'KARAR_VERILDI', 'KESINLESTI', 'KAPANDI');

-- CreateTable: CMK Dosyalari modulu (V1, basit) - bkz. ARCHITECTURE.md
CREATE TABLE "cmk_dosyalari" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT,
    "adSoyad" TEXT NOT NULL,
    "telefon" TEXT,
    "smsGonderilebilirMi" BOOLEAN NOT NULL DEFAULT false,
    "cmkGorevlendirmeVarMi" BOOLEAN NOT NULL DEFAULT true,
    "suc" TEXT NOT NULL,
    "birim" TEXT NOT NULL,
    "dosyaNo" TEXT NOT NULL,
    "durusmaTarihi" TIMESTAMP(3),
    "dosyaDurumu" "cmk_dosya_durumu" NOT NULL,
    "hukum" TEXT,
    "cezaMiktari" TEXT,
    "sonrakiKontrolTarihi" TIMESTAMP(3),
    "notlar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cmk_dosyalari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cmk_dosyalari_birim_dosyaNo_key" ON "cmk_dosyalari"("birim", "dosyaNo");

-- CreateIndex
CREATE INDEX "cmk_dosyalari_musteriId_idx" ON "cmk_dosyalari"("musteriId");

-- CreateIndex
CREATE INDEX "cmk_dosyalari_dosyaDurumu_idx" ON "cmk_dosyalari"("dosyaDurumu");

-- CreateIndex
CREATE INDEX "cmk_dosyalari_durusmaTarihi_idx" ON "cmk_dosyalari"("durusmaTarihi");

-- CreateIndex
CREATE INDEX "cmk_dosyalari_sonrakiKontrolTarihi_idx" ON "cmk_dosyalari"("sonrakiKontrolTarihi");

-- AddForeignKey
ALTER TABLE "cmk_dosyalari" ADD CONSTRAINT "cmk_dosyalari_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
