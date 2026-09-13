import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { musterininDosyalari } from "@/modules/dava-dosyasi/lib/queries";
import { DosyaSecici } from "@/modules/musteri/components/dosya-secici";
import { TipSeciciVeTasnif } from "@/modules/musteri/components/tip-secici-ve-tasnif";

export async function ParaTrafigiFormu({
  action,
  musteriId,
}: {
  action: (formData: FormData) => void;
  musteriId: string;
}) {
  const [tipler, durumlar, kaynaklar, dosyalar, cariKodlar] = await Promise.all([
    secenekleriGetir("para_trafigi_tipi"),
    secenekleriGetir("para_trafigi_durumu"),
    secenekleriGetir("kaynak"),
    musterininDosyalari(musteriId),
    secenekleriGetir("cari_kod"),
  ]);

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="tarih">Tarih</Etiket>
        <Girdi id="tarih" name="tarih" type="date" required defaultValue={bugun} />
      </Alan>
      <TipSeciciVeTasnif tipler={tipler} cariKodlar={cariKodlar} />
      <Alan>
        <Etiket htmlFor="tutar">Tutar</Etiket>
        <ParaGirdisi id="tutar" name="tutar" required />
      </Alan>
      <Alan>
        <Etiket htmlFor="durumId">Durum</Etiket>
        <Secim id="durumId" name="durumId" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {durumlar.map((durum) => (
            <option key={durum.id} value={durum.id}>
              {durum.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="kaynakId">Kaynak</Etiket>
        <Secim id="kaynakId" name="kaynakId" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {kaynaklar.map((kaynak) => (
            <option key={kaynak.id} value={kaynak.id}>
              {kaynak.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <DosyaSecici dosyalar={dosyalar} />
      <div className="col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="aciklama">Açıklama</Etiket>
          <MetinAlani id="aciklama" name="aciklama" rows={2} />
        </Alan>
      </div>
      <div className="col-span-2 md:col-span-4">
        <Dugme type="submit">Kaydı Ekle</Dugme>
      </div>
    </form>
  );
}
