import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { menuDuzeniniGetir } from "@/core/menu/queries";
import { MODUL_KAYIT_DEFTERI } from "@/core/modul-kayit-defteri";
import { MenuDuzeniListesi, type MenuOgesiSatiri } from "@/core/menu/menu-duzeni-listesi";

export default async function MenuDuzeniSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const menuDuzeni = await menuDuzeniniGetir();
  const modulHaritasi = new Map(MODUL_KAYIT_DEFTERI.map((m) => [m.anahtar, m]));

  const ogeler: MenuOgesiSatiri[] = menuDuzeni
    .map((oge) => {
      const modul = modulHaritasi.get(oge.anahtar);
      if (!modul) return null;
      return {
        anahtar: oge.anahtar,
        ad: modul.ad,
        gizliMi: oge.gizliMi,
        sabitMi: oge.anahtar === "ayarlar" || oge.anahtar === "ana-sayfa",
      };
    })
    .filter((oge): oge is MenuOgesiSatiri => oge !== null);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Menü Düzeni</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/50">
        Sol menünün bölüm/hiyerarşi yerleşimi (Ana Sayfa, Çalışma, Finans, Yönetim, Ayarlar)
        artık sabittir. Burada yalnızca ihtiyacınız olmayan bir öğeyi &quot;Gizli&quot; yaparak sol
        menüden kaldırabilirsiniz — bir öğenin adı/gittiği sayfa burada değişmez, o kod
        tarafında kalır.
      </p>

      <MenuDuzeniListesi ogeler={ogeler} />
    </div>
  );
}
