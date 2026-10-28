import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { formAlanDuzeniniGetir } from "@/core/form-duzeni/queries";
import {
  DAVA_DOSYASI_ALAN_ETIKETLERI,
  DAVA_DOSYASI_GIZLENEMEZ_ALANLAR,
} from "@/core/form-duzeni/dava-dosyasi-alanlari";
import { MUSTERI_ALAN_ETIKETLERI, MUSTERI_GIZLENEMEZ_ALANLAR } from "@/core/form-duzeni/musteri-alanlari";
import { FormAlanListesi, type FormAlanSatiri } from "@/core/form-duzeni/form-alan-listesi";

export default async function FormDuzeniSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const [davaDosyasiKayitlari, musteriKayitlari] = await Promise.all([
    formAlanDuzeniniGetir("dava-dosyasi"),
    formAlanDuzeniniGetir("musteri"),
  ]);
  // Form sadelestirmesi ile bircok eski alan (turId, konu, durumId vb.)
  // formda hic gorunmez oldu (bkz. dava-dosyasi-alanlari.ts) ama eski
  // form_alan_duzeni satirlari DB'de kalmis olabilir - bu ekranda hicbir
  // seye karsilik gelmeyen "hayalet" satirlar gostermemek icin filtrelenir.
  const kayitliDavaAlanlari = davaDosyasiKayitlari.filter((k) => k.alanAnahtari in DAVA_DOSYASI_ALAN_ETIKETLERI);
  // Sonradan eklenen alanlar (ör. Dosya Sınıfı) DB'de satır olmasa da burada
  // listelenir; ilk değişiklikte satır oluşturulur.
  const davaAlanKayitlari = [
    ...kayitliDavaAlanlari.map((k) => ({ anahtar: k.alanAnahtari, gizliMi: k.gizliMi })),
    ...Object.keys(DAVA_DOSYASI_ALAN_ETIKETLERI)
      .filter((a) => !kayitliDavaAlanlari.some((k) => k.alanAnahtari === a))
      .map((a) => ({ anahtar: a, gizliMi: false })),
  ];
  const ogeler: FormAlanSatiri[] = davaAlanKayitlari.map((k) => ({
    anahtar: k.anahtar,
    etiket: DAVA_DOSYASI_ALAN_ETIKETLERI[k.anahtar] ?? k.anahtar,
    gizliMi: k.gizliMi,
    gizlenebilirMi: !DAVA_DOSYASI_GIZLENEMEZ_ALANLAR.includes(k.anahtar),
  }));
  const musteriOgeleri: FormAlanSatiri[] = musteriKayitlari.map((k) => ({
    anahtar: k.alanAnahtari,
    etiket: MUSTERI_ALAN_ETIKETLERI[k.alanAnahtari] ?? k.alanAnahtari,
    gizliMi: k.gizliMi,
    gizlenebilirMi: !MUSTERI_GIZLENEMEZ_ALANLAR.includes(k.alanAnahtari),
  }));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Form Düzeni</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/50">
        Formlardaki alanların sırasını sürükleyerek değiştirin, ihtiyacınız olmayanları
        &quot;Gizli&quot; yapın. Gizlenen alanlar yeni kayıt formunda görünmez; dosya
        detayından sonradan girilebilir ve mevcut değerleri korunur.
      </p>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">
        Yeni Dosya Formu
      </h2>
      <div className="glass mb-2 flex flex-col gap-1 rounded-2xl p-2">
        <div className="flex items-center justify-between rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-white">Müvekkil</span>
          <span className="text-xs text-white/30">Sabit</span>
        </div>
        <div className="flex items-center justify-between rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-white">Karşı Taraf</span>
          <span className="text-xs text-white/30">Sabit</span>
        </div>
      </div>
      <p className="mb-3 text-xs text-white/35">
        Müvekkil ve Karşı Taraf her zaman en üstte, bu sırayla kalır — bunlar tekil
        bir alan değil, kendi ekleme akışı olan seçiciler.
      </p>

      <FormAlanListesi formAnahtari="dava-dosyasi" ogeler={ogeler} />

      <h2 className="mb-3 mt-10 text-sm font-medium uppercase tracking-wide text-white/40">
        Yeni Müvekkil Formu
      </h2>
      <FormAlanListesi formAnahtari="musteri" ogeler={musteriOgeleri} />
    </div>
  );
}
