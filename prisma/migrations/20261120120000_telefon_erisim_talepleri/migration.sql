-- Muvekkil telefon erisim talepleri. Yalniz yeni tablo; mevcut veriye dokunmaz.
CREATE TABLE "telefon_erisim_talepleri" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "talepEdenId" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'BEKLIYOR',
    "talepZamani" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kararVerenId" TEXT,
    "kararZamani" TIMESTAMP(3),
    "bitisZamani" TIMESTAMP(3),

    CONSTRAINT "telefon_erisim_talepleri_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "telefon_erisim_talepleri_musteriId_talepEdenId_idx" ON "telefon_erisim_talepleri"("musteriId", "talepEdenId");
CREATE INDEX "telefon_erisim_talepleri_durum_idx" ON "telefon_erisim_talepleri"("durum");

ALTER TABLE "telefon_erisim_talepleri" ADD CONSTRAINT "telefon_erisim_talepleri_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "musteriler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
