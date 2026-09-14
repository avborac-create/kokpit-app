import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import {
  MUVEKKIL_FINANS_ISLEM_TURLERI,
  MUVEKKIL_FINANS_PARA_AMACLARI,
} from "@/modules/muvekkil-finans/lib/sabitler";

// Yalnizca istenen 7 alan: Muvekkil (gizli - sayfa zaten bir muvekkile
// gore filtreli), Dosya (opsiyonel), Islem Turu, Para Amaci, Tutar, Tarih,
// Aciklama. Baska hicbir alan yok - bkz. ARCHITECTURE.md "Muvekkil Finans V1".
export function YeniHareketFormu({
  action,
  musteriId,
  dosyalar,
}: {
  action: (formData: FormData) => void;
  musteriId: string;
  dosyalar: { id: string; konu: string }[];
}) {
  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <input type="hidden" name="musteriId" value={musteriId} />
      <Alan>
        <Etiket htmlFor="islemTuru">İşlem Türü</Etiket>
        <Secim id="islemTuru" name="islemTuru" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {MUVEKKIL_FINANS_ISLEM_TURLERI.map((s) => (
            <option key={s.deger} value={s.deger}>
              {s.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="paraAmaci">Para Amacı</Etiket>
        <Secim id="paraAmaci" name="paraAmaci" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {MUVEKKIL_FINANS_PARA_AMACLARI.map((s) => (
            <option key={s.deger} value={s.deger}>
              {s.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="tutar">Tutar</Etiket>
        <ParaGirdisi id="tutar" name="tutar" required />
      </Alan>
      <Alan>
        <Etiket htmlFor="tarih">Tarih</Etiket>
        <Girdi id="tarih" name="tarih" type="date" required defaultValue={bugun} />
      </Alan>
      <Alan>
        <Etiket htmlFor="davaDosyasiId">Dosya (opsiyonel)</Etiket>
        <Secim id="davaDosyasiId" name="davaDosyasiId" defaultValue="">
          <option value="">— Seçilmedi —</option>
          {dosyalar.map((d) => (
            <option key={d.id} value={d.id}>
              {d.konu}
            </option>
          ))}
        </Secim>
      </Alan>
      <div className="col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="aciklama">Açıklama (opsiyonel)</Etiket>
          <MetinAlani id="aciklama" name="aciklama" rows={2} />
        </Alan>
      </div>
      <div className="col-span-2 md:col-span-4">
        <GonderButonu>Kaydet</GonderButonu>
      </div>
    </form>
  );
}
