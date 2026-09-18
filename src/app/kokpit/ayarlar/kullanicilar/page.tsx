import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { sistemYoneticisiMi } from "@/core/auth/yetki";
import { tumKullanicilariListele } from "@/core/kullanici/queries";
import { KullaniciSatiri } from "@/core/kullanici/kullanici-satiri";
import { KullaniciEklemeFormu } from "@/core/kullanici/kullanici-ekleme-formu";

export default async function KullanicilarSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !sistemYoneticisiMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const kullanicilar = await tumKullanicilariListele();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Kullanıcılar</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/50">
        Personele giriş bilgisi tanımlayın, rolünü değiştirin, şifresini sıfırlayın ya da işten
        ayrılan bir personeli pasife alın. Pasife alınan kullanıcı giriş yapamaz ama geçmiş
        kayıtları (sorumlu olduğu dosyalar, müşteriler vb.) bozulmasın diye silinmez.
      </p>

      <div className="glass mb-6 rounded-2xl p-5">
        <h2 className="mb-3 text-base font-semibold text-white">Yeni Kullanıcı</h2>
        <KullaniciEklemeFormu />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
        <table className="w-full text-left text-sm">
          <thead className="text-white/40">
            <tr>
              <th className="px-4 py-2 font-medium">Ad Soyad</th>
              <th className="px-4 py-2 font-medium">E-posta</th>
              <th className="px-4 py-2 font-medium">Rol</th>
              <th className="px-4 py-2 font-medium">Durum</th>
              <th className="px-4 py-2 font-medium">Şifre</th>
            </tr>
          </thead>
          <tbody>
            {kullanicilar.map((k) => (
              <KullaniciSatiri key={k.id} kullanici={k} kendisiMi={k.id === kullanici.kullaniciId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
