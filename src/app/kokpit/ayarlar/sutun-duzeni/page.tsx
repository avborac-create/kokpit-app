import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { tabloSutunDuzeniniGetir } from "@/core/tablo-duzeni/queries";
import {
  DAVA_DOSYALARI_SUTUN_ETIKETLERI,
  DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR,
} from "@/core/tablo-duzeni/dava-dosyalari-sutunlari";
import { TabloSutunListesi, type TabloSutunSatiri } from "@/core/tablo-duzeni/tablo-sutun-listesi";

export default async function SutunDuzeniSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const kayitlar = await tabloSutunDuzeniniGetir("dava-dosyalari");
  const ogeler: TabloSutunSatiri[] = kayitlar.map((k) => ({
    anahtar: k.sutunAnahtari,
    etiket: DAVA_DOSYALARI_SUTUN_ETIKETLERI[k.sutunAnahtari] ?? k.sutunAnahtari,
    gizliMi: k.gizliMi,
    gizlenebilirMi: !DAVA_DOSYALARI_GIZLENEMEZ_SUTUNLAR.includes(k.sutunAnahtari),
  }));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Sütun Düzeni</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/50">
        Dosyalar tablosundaki sütunların sırasını sürükleyerek değiştirin, ihtiyacınız
        olmayanları &quot;Gizli&quot; yapın. &quot;Zorunlu&quot; rozetli sütun (dosya
        detayına giden tek bağlantı olduğu için) gizlenemez, sadece sırası değişebilir.
        &quot;İşlemler&quot; (Düzenle/Sil) sütunu bir veri sütunu olmadığı için her zaman
        en sonda sabit kalır.
      </p>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">
        Dosyalar Tablosu
      </h2>
      <TabloSutunListesi tabloAnahtari="dava-dosyalari" ogeler={ogeler} />
    </div>
  );
}
