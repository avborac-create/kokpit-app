-- Kullanici gorunum tercihleri (tema modu, cam kademesi, renk paleti).
-- Yalnizca bos birakilabilir sutun ekler; mevcut kayitlara dokunmaz.
ALTER TABLE "kullanicilar"
  ADD COLUMN "gorunumTema" TEXT,
  ADD COLUMN "gorunumCam" TEXT,
  ADD COLUMN "gorunumPalet" TEXT;
