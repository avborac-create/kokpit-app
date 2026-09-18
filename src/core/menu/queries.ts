import { unstable_cache } from "next/cache";
import { prisma } from "@/core/db/prisma";

// Kokpit layout'u HER navigasyonda calisir (cookies() kullanan bir alt
// bileseni oldugu icin dinamik) - menu duzeni ise sadece Ayarlar > Menu
// Duzeni'nden degistirilir. Gereksiz DB gidis-donusunu onlemek icin
// sonsuza kadar (revalidate verilmez) cache'lenir; degisiklik aninda
// menuYenidenSirala/menuGorunurlukDegistir zaten revalidatePath("/kokpit",
// "layout") cagiriyor, bu da bu cache'i de gecersiz kilar.
export const menuDuzeniniGetir = unstable_cache(
  async () => prisma.menuOgesi.findMany({ orderBy: { siraNo: "asc" } }),
  ["menu-duzeni"],
);
