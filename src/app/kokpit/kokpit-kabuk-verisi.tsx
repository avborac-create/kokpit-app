import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { menuDuzeniniGetir } from "@/core/menu/queries";
import { cmkOzetSayilariniHesapla } from "@/modules/cmk-dosyalari/lib/queries";
import { KenarCubugu } from "./kenar-cubugu";
import { UstBilgiRozeti } from "./ust-bilgi-rozeti";

// Kokpit layout'unun kullaniciRol/menuDuzeni/cmkDikkatSayisi ihtiyaci -
// mevcutKullanici() cookies() kullandigindan RUNTIME veri sayilir (bkz.
// Next.js layout.js dokumantasyonu "Interaction with loading.js"): bu
// veriyi DOGRUDAN layout.tsx icinde await edersek, loading.tsx'in
// sagladigi Suspense siniri o veriye HIC uygulanmaz - navigasyon, layout
// tamamen render olana kadar TAMAMEN bloke olur (sayfa icerigi {children}
// bile beklemek zorunda kalir, o hazir olsa bile). Bu yuzden bu veriye
// bagli kucuk parcalar kendi ayri, kucuk <Suspense> sinirlarina alinir
// (bkz. layout.tsx) - {children} onlari beklemeden akmaya devam eder.
export async function KenarCubuguVerisi() {
  const [kullanici, menuDuzeni, cmkOzet] = await Promise.all([
    mevcutKullanici(),
    menuDuzeniniGetir(),
    cmkOzetSayilariniHesapla(),
  ]);

  return (
    <KenarCubugu
      kullaniciRol={kullanici?.rol}
      menuDuzeni={menuDuzeni.map((oge) => ({ anahtar: oge.anahtar, gizliMi: oge.gizliMi }))}
      cmkDikkatSayisi={cmkOzet.yaklasanDurusma + cmkOzet.gecikmisKontrol}
    />
  );
}

// mevcutKullanici() React `cache()` ile sarmali oldugu icin ayni istek
// icinde KenarCubuguVerisi'nin cagrisiyla DEDUPE edilir - burada ikinci
// bir cookie okuma/DB gidis-donusu OLMAZ, sadece render agacinda ayri bir
// Suspense sinirina (header vs sidebar) ihtiyac oldugu icin ayri bir
// bilesen.
export async function UstBilgiVerisi() {
  const kullanici = await mevcutKullanici();
  return <UstBilgiRozeti kullaniciAdSoyad={kullanici?.adSoyad} kullaniciRol={kullanici?.rol} />;
}
