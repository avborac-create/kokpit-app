import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { tumSecenekListeleriniListele } from "@/core/secenek/admin-queries";
import { SecenekListesiKarti } from "@/core/secenek/secenek-listesi-karti";

export default async function SecenekListeleriSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const listeler = await tumSecenekListeleriniListele();

  return (
    <div className="pt-3">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Seçenek Listeleri</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/50">
        Uygulama genelindeki açılır listeler (cari kod, masraf türü, tip, durum vb.) burada
        yönetilir — yeni değer ekleyebilir, mevcut bir değerin adını değiştirebilir, sırasını
        değiştirebilir ya da pasife alabilirsiniz. Bir değer hiçbir zaman tamamen silinmez;
        geçmiş kayıtlar bozulmasın diye yalnızca pasife alınır ve yeni girişte seçilemez.
      </p>

      <div className="flex flex-col gap-5">
        {listeler.map((liste) => (
          <SecenekListesiKarti key={liste.id} liste={liste} />
        ))}
      </div>
    </div>
  );
}
