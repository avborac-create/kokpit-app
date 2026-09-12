import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { KokpitKabuk } from "./kokpit-kabuk";

export default async function KokpitLayout({ children }: { children: React.ReactNode }) {
  const kullanici = await mevcutKullanici();

  return (
    <KokpitKabuk kullaniciAdSoyad={kullanici?.adSoyad} kullaniciRol={kullanici?.rol}>
      {children}
    </KokpitKabuk>
  );
}
