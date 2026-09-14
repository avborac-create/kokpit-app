import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { menuDuzeniniGetir } from "@/core/menu/queries";
import { KokpitKabuk } from "./kokpit-kabuk";

export default async function KokpitLayout({ children }: { children: React.ReactNode }) {
  const [kullanici, menuDuzeni] = await Promise.all([mevcutKullanici(), menuDuzeniniGetir()]);

  return (
    <KokpitKabuk
      kullaniciAdSoyad={kullanici?.adSoyad}
      kullaniciRol={kullanici?.rol}
      menuDuzeni={menuDuzeni.map((oge) => ({ anahtar: oge.anahtar, gizliMi: oge.gizliMi }))}
    >
      {children}
    </KokpitKabuk>
  );
}
