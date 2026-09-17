"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  abone,
  aktifYoluSenkronla,
  anlikGoruntuAl,
  depoyuYukle,
  sekmeKapat as sekmeKapatDepo,
  sekmeyeGec as sekmeyeGecDepo,
  sunucuAnlikGoruntusuAl,
  yeniSekmeAc as yeniSekmeAcDepo,
} from "./sekme-deposu";
import { varsayilanSekmeBasligi } from "./varsayilan-baslik";

// Sekme depousunu (bkz. sekme-deposu.ts) React'e baglayan tek hook -
// <SekmeCubugu> bunu okumak/tiklama olaylarini yonlendirmek icin
// kullanir. Sayfa icinde ozel baslik ayarlamak icin ise <SekmeBasligi>
// depoyu dogrudan (bu hook'a gerek kalmadan) kullanir.
export function useSekmeler() {
  const pathname = usePathname();
  const router = useRouter();
  const durum = useSyncExternalStore(abone, anlikGoruntuAl, sunucuAnlikGoruntusuAl);

  useEffect(() => {
    depoyuYukle(pathname, varsayilanSekmeBasligi(pathname));
  }, [pathname]);

  useEffect(() => {
    aktifYoluSenkronla(pathname, varsayilanSekmeBasligi(pathname));
  }, [pathname]);

  const sekmeyeGec = useCallback(
    (id: string) => {
      const yol = sekmeyeGecDepo(id);
      if (yol && yol !== pathname) router.push(yol);
    },
    [pathname, router],
  );

  const sekmeKapat = useCallback(
    (id: string) => {
      const yol = sekmeKapatDepo(id);
      if (yol && yol !== pathname) router.push(yol);
    },
    [pathname, router],
  );

  const yeniSekmeAc = useCallback(() => {
    const yol = yeniSekmeAcDepo();
    if (yol !== pathname) router.push(yol);
  }, [pathname, router]);

  return { sekmeler: durum.sekmeler, aktifId: durum.aktifId, sekmeyeGec, sekmeKapat, yeniSekmeAc };
}
