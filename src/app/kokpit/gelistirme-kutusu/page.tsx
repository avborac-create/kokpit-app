import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { gelistirmeTalepleriniListele } from "@/core/gelistirme-kutusu/queries";
import { gelistirmeTalebiGonder } from "@/core/gelistirme-kutusu/actions";
import { GelistirmeTalebiSatiri } from "@/core/gelistirme-kutusu/gelistirme-talebi-satiri";
import { Alan, Etiket, MetinAlani } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";

export default async function GelistirmeKutusuSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const talepler = await gelistirmeTalepleriniListele();
  const beklemede = talepler.filter((t) => t.durum.kod === "beklemede");
  const yapiliyor = talepler.filter((t) => t.durum.kod === "yapiliyor");
  const tamamlandi = talepler.filter((t) => t.durum.kod === "tamamlandi");

  return (
    <div className="pt-3">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Geliştirme Kutusu</h1>
      <p className="mb-6 text-sm text-white/50">
        Konuşma sırasında aklımıza gelen her istek/fikir buraya düşer, sıra sıra işlenir.
      </p>

      <form action={gelistirmeTalebiGonder} className="glass mb-8 rounded-2xl p-4">
        <Alan>
          <Etiket htmlFor="metin">Yeni Talep</Etiket>
          <MetinAlani id="metin" name="metin" rows={2} required placeholder="Kısaca ne istendiğini yaz…" />
        </Alan>
        <GonderButonu>Kutuya Ekle</GonderButonu>
      </form>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">
          Beklemede {beklemede.length > 0 && `(${beklemede.length})`}
        </h2>
        {beklemede.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-white/40">
            Bekleyen talep yok.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {beklemede.map((talep) => (
              <GelistirmeTalebiSatiri key={talep.id} talep={talep} />
            ))}
          </div>
        )}
      </div>

      {yapiliyor.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">Yapılıyor</h2>
          <div className="flex flex-col gap-3">
            {yapiliyor.map((talep) => (
              <GelistirmeTalebiSatiri key={talep.id} talep={talep} />
            ))}
          </div>
        </div>
      )}

      {tamamlandi.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">Tamamlandı</h2>
          <div className="flex flex-col gap-3">
            {tamamlandi.map((talep) => (
              <GelistirmeTalebiSatiri key={talep.id} talep={talep} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
