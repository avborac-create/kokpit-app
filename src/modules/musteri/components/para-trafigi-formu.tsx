import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { musterininDosyalari, uyusmazlikGruplariniListele } from "@/modules/dava-dosyasi/lib/queries";
import { DosyaSecici } from "@/modules/musteri/components/dosya-secici";
import { TipSeciciVeTasnif } from "@/modules/musteri/components/tip-secici-ve-tasnif";
import { UyusmazlikGrubuSecici } from "@/modules/musteri/components/uyusmazlik-grubu-secici";

export type ParaTrafigiDuzenlemeVerisi = {
  tarih: string;
  tipId: string;
  tutar: number;
  durumId: string;
  kaynakId: string;
  aciklama: string | null;
  seciliDosyaIdler: string[];
  tasnifVarsayilan: Record<string, number>;
  uyusmazlikGrubuId: string | null;
};

export async function ParaTrafigiFormu({
  action,
  musteriId,
  duzenlemeVerisi,
}: {
  action: (formData: FormData) => void;
  musteriId: string;
  duzenlemeVerisi?: ParaTrafigiDuzenlemeVerisi;
}) {
  const [tipler, durumlar, kaynaklar, dosyalar, cariKodlar, gruplar] = await Promise.all([
    secenekleriGetir("para_trafigi_tipi"),
    secenekleriGetir("para_trafigi_durumu"),
    secenekleriGetir("kaynak"),
    musterininDosyalari(musteriId),
    secenekleriGetir("cari_kod"),
    uyusmazlikGruplariniListele([musteriId]),
  ]);

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="tarih">Tarih</Etiket>
        <Girdi id="tarih" name="tarih" type="date" required defaultValue={duzenlemeVerisi?.tarih ?? bugun} />
      </Alan>
      <TipSeciciVeTasnif
        tipler={tipler}
        cariKodlar={cariKodlar}
        varsayilanTipId={duzenlemeVerisi?.tipId}
        varsayilanTasnif={duzenlemeVerisi?.tasnifVarsayilan}
      />
      <Alan>
        <Etiket htmlFor="tutar">Tutar</Etiket>
        <ParaGirdisi id="tutar" name="tutar" required defaultValue={duzenlemeVerisi?.tutar} />
      </Alan>
      <Alan>
        <Etiket htmlFor="durumId">Durum</Etiket>
        <Secim id="durumId" name="durumId" required defaultValue={duzenlemeVerisi?.durumId ?? ""}>
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
        <Secim id="kaynakId" name="kaynakId" required defaultValue={duzenlemeVerisi?.kaynakId ?? ""}>
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
      <DosyaSecici dosyalar={dosyalar} seciliDosyaIdler={duzenlemeVerisi?.seciliDosyaIdler} />
      <UyusmazlikGrubuSecici gruplar={gruplar} varsayilanGrubuId={duzenlemeVerisi?.uyusmazlikGrubuId ?? ""} />
      <div className="col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="aciklama">Açıklama</Etiket>
          <MetinAlani id="aciklama" name="aciklama" rows={2} defaultValue={duzenlemeVerisi?.aciklama ?? ""} />
        </Alan>
      </div>
      <div className="col-span-2 md:col-span-4">
        <Dugme type="submit">{duzenlemeVerisi ? "Kaydı Güncelle" : "Kaydı Ekle"}</Dugme>
      </div>
    </form>
  );
}
