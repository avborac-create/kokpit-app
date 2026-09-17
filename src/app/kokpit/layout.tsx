import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { menuDuzeniniGetir } from "@/core/menu/queries";
import { cmkOzetSayilariniHesapla } from "@/modules/cmk-dosyalari/lib/queries";
import { KokpitKabuk } from "./kokpit-kabuk";

export default async function KokpitLayout({ children }: { children: React.ReactNode }) {
  const [kullanici, menuDuzeni, cmkOzet] = await Promise.all([
    mevcutKullanici(),
    menuDuzeniniGetir(),
    cmkOzetSayilariniHesapla(),
  ]);

  return (
    <KokpitKabuk
      kullaniciAdSoyad={kullanici?.adSoyad}
      kullaniciRol={kullanici?.rol}
      menuDuzeni={menuDuzeni.map((oge) => ({ anahtar: oge.anahtar, gizliMi: oge.gizliMi }))}
      cmkDikkatSayisi={cmkOzet.yaklasanDurusma + cmkOzet.gecikmisKontrol}
    >
      {children}
    </KokpitKabuk>
  );
}
