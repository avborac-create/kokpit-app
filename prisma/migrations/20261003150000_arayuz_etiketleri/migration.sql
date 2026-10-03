-- CreateTable
CREATE TABLE "arayuz_etiketleri" (
    "anahtar" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "guncellemeTarihi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arayuz_etiketleri_pkey" PRIMARY KEY ("anahtar")
);
