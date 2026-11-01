-- Web Push: yeni tablolar, mevcut veriye dokunmaz.
CREATE TABLE "push_anahtarlari" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,

    CONSTRAINT "push_anahtarlari_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "push_abonelikleri" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "cihaz" TEXT,
    "olusturmaTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_abonelikleri_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_abonelikleri_endpoint_key" ON "push_abonelikleri"("endpoint");
CREATE INDEX "push_abonelikleri_kullaniciId_idx" ON "push_abonelikleri"("kullaniciId");
