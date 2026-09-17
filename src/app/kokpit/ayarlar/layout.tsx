import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { AyarlarSekmeleri } from "./ayarlar-sekmeleri";

export default async function AyarlarLayout({ children }: { children: React.ReactNode }) {
  const kullanici = await mevcutKullanici();

  return <AyarlarSekmeleri kullaniciRol={kullanici?.rol}>{children}</AyarlarSekmeleri>;
}
