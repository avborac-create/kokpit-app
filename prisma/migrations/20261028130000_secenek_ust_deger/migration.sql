-- Secenek degerlerine istege bagli ust deger (Hukuk Dali -> Dava Konusu). Yalniz yeni, bos sutun; mevcut kayitlar degismez.
ALTER TABLE "secenek_degerleri" ADD COLUMN "ustId" TEXT;
ALTER TABLE "secenek_degerleri" ADD CONSTRAINT "secenek_degerleri_ustId_fkey" FOREIGN KEY ("ustId") REFERENCES "secenek_degerleri"("id") ON DELETE SET NULL ON UPDATE CASCADE;
