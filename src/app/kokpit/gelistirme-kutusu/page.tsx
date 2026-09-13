import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { gelistirmeTalepleriniListele } from "@/core/gelistirme-kutusu/queries";
import { gelistirmeTalebiGonder } from "@/core/gelistirme-kutusu/actions";
import { GelistirmeKutusuPanosu, type PanoKarti } from "@/core/gelistirme-kutusu/gelistirme-kutusu-panosu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { Alan, Etiket, MetinAlani } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";

export default async function GelistirmeKutusuSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const [talepler, durumlar] = await Promise.all([
    gelistirmeTalepleriniListele(),
    secenekleriGetir("gelistirme_talebi_durumu"),
  ]);

  const kartlar: PanoKarti[] = talepler.map((talep) => ({
    id: talep.id,
    metin: talep.metin,
    durumKodu: talep.durum.kod,
    kullaniciAdi: talep.kullanici.adSoyad,
    olusturmaTarihi: talep.olusturmaTarihi.toISOString(),
  }));
  const sutunlar = durumlar.map((d) => ({ kod: d.kod, etiket: d.etiket }));

  return (
    <div className="pt-3">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Geliştirme Kutusu</h1>
      <p className="mb-6 text-sm text-white/50">
        Konuşma sırasında aklımıza gelen her istek/fikir buraya düşer. Kartları sürükleyerek
        durumunu değiştirebilirsiniz.
      </p>

      <form action={gelistirmeTalebiGonder} className="glass mb-6 rounded-2xl p-4">
        <Alan>
          <Etiket htmlFor="metin">Yeni Kart</Etiket>
          <MetinAlani id="metin" name="metin" rows={2} required placeholder="Kısaca ne istendiğini yaz…" />
        </Alan>
        <GonderButonu>Kutuya Ekle</GonderButonu>
      </form>

      <GelistirmeKutusuPanosu kartlar={kartlar} sutunlar={sutunlar} />
    </div>
  );
}
