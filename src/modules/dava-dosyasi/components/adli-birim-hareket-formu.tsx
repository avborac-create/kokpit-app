import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { GonderButonu } from "@/core/ui/gonder-butonu";

// Buro-Adli Birim cari hesabina yeni hareket eklemek icin - Masraf
// Formu'yla ayni yerlesim deseni (bkz. masraf-formu.tsx), sadece Cari
// Kod/Tur yerine tek bir "Yon" (Odeme/Tahsilat) secimi var.
export function AdliBirimHareketFormu({ action }: { action: (formData: FormData) => void }) {
  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="ab-tarih">Tarih</Etiket>
        <Girdi id="ab-tarih" name="tarih" type="date" required defaultValue={bugun} />
      </Alan>
      <Alan>
        <Etiket htmlFor="ab-yon">Yön</Etiket>
        <Secim id="ab-yon" name="yon" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          <option value="ODEME">Ödeme (Büro → Adli Birim, borç)</option>
          <option value="TAHSILAT">Tahsilat (Adli Birim → Büro, alacak)</option>
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="ab-tutar">Tutar</Etiket>
        <ParaGirdisi id="ab-tutar" name="tutar" required />
      </Alan>
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="ab-aciklama">Açıklama</Etiket>
          <MetinAlani id="ab-aciklama" name="aciklama" rows={2} required placeholder="ör. Harç yatırımı, tebligat gideri, iade edilen harç" />
        </Alan>
      </div>
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <GonderButonu>Hareket Ekle</GonderButonu>
      </div>
    </form>
  );
}
