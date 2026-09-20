import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { kullanicilariListele } from "@/core/kullanici/queries";
import { atanabilirRoller, ROL_ETIKETLERI } from "@/core/kullanici/rol-etiketleri";
import { KullaniciFormu } from "@/core/kullanici/kullanici-formu";
import { KullaniciDurumButonu } from "@/core/kullanici/kullanici-durum-butonu";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function KullanicilarSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const kullanicilar = await kullanicilariListele();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Kullanıcılar</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/50">
        Büro personeli/avukatları için giriş hesabı oluşturun. Oluşturulan kişi, buradaki
        e-posta ve geçici şifreyle giriş yapıp Ayarlar üzerinden şifresini kendisi
        değiştiremez — şifre değişikliği için şimdilik yeniden buradan bir hesap oluşturulması
        gerekir.
      </p>

      <div className="glass mb-8 overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Ad Soyad</th>
              <th className="px-4 py-3 font-medium">E-posta</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Katılım</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {kullanicilar.map((k) => (
              <tr key={k.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                <td className="px-4 py-3 font-medium text-white">{k.adSoyad}</td>
                <td className="px-4 py-3 text-white/60">{k.eposta}</td>
                <td className="px-4 py-3 text-white/60">{ROL_ETIKETLERI[k.rol]}</td>
                <td className="px-4 py-3 text-white/60">{tarihFormatlayici.format(k.olusturmaTarihi)}</td>
                <td className="px-4 py-3">
                  {k.aktifMi ? (
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[#6db8ff]">
                      Aktif
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/45">
                      Pasif
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {k.id !== kullanici.kullaniciId && (
                    <KullaniciDurumButonu id={k.id} adSoyad={k.adSoyad} aktifMi={k.aktifMi} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">Yeni Kullanıcı</h2>
      <KullaniciFormu rolSecenekleri={atanabilirRoller(kullanici.rol)} />
    </div>
  );
}
