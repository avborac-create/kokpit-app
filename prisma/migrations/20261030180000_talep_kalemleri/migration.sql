-- Talep kalemleri: kalem/tur/kismi/artirim-islah bilgileri. Yalniz yeni bos sutun; mevcut kayitlar degismez.
ALTER TABLE "dava_dosyalari" ADD COLUMN "talepKalemleri" JSONB;
