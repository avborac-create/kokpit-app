import { cookies } from "next/headers";
import { cache } from "react";
import { OTURUM_COOKIE_ADI, oturumTokeniDogrula, type OturumVerisi } from "./session";

// Server Component/Action agaci icinde ayni istek suresince tekrar tekrar
// cookie okuyup JWT dogrulamamak icin React `cache` ile sarmalanir.
export const mevcutKullanici = cache(async (): Promise<OturumVerisi | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(OTURUM_COOKIE_ADI)?.value;
  return oturumTokeniDogrula(token);
});
