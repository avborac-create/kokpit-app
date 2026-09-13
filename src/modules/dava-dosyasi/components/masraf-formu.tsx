import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";
import { secenekleriGetir } from "@/core/secenek/secenek-service";

export type MasrafDuzenlemeVerisi = {
  tarih: string;
  cariKodId: string;
  turId: string;
  tutar: number;
  aciklama: string;
};

export async function MasrafFormu({
  action,
  duzenlemeVerisi,
}: {
  action: (formData: FormData) => void;
  duzenlemeVerisi?: MasrafDuzenlemeVerisi;
}) {
  const [cariKodlar, turler] = await Promise.all([
    secenekleriGetir("cari_kod"),
    secenekleriGetir("masraf_turu"),
  ]);

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="tarih">Tarih</Etiket>
        <Girdi id="tarih" name="tarih" type="date" required defaultValue={duzenlemeVerisi?.tarih ?? bugun} />
      </Alan>
      <Alan>
        <Etiket htmlFor="cariKodId">Cari Kod</Etiket>
        <Secim id="cariKodId" name="cariKodId" required defaultValue={duzenlemeVerisi?.cariKodId ?? ""}>
          <option value="" disabled>
            Seçiniz…
          </option>
          {cariKodlar.map((kod) => (
            <option key={kod.id} value={kod.id}>
              {kod.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="turId">Tür</Etiket>
        <Secim id="turId" name="turId" required defaultValue={duzenlemeVerisi?.turId ?? ""}>
          <option value="" disabled>
            Seçiniz…
          </option>
          {turler.map((tur) => (
            <option key={tur.id} value={tur.id}>
              {tur.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="tutar">Tutar</Etiket>
        <ParaGirdisi id="tutar" name="tutar" required defaultValue={duzenlemeVerisi?.tutar} />
      </Alan>
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="aciklama">Açıklama</Etiket>
          <MetinAlani id="aciklama" name="aciklama" rows={2} required defaultValue={duzenlemeVerisi?.aciklama ?? ""} />
        </Alan>
      </div>
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <Dugme type="submit">{duzenlemeVerisi ? "Masrafı Güncelle" : "Masraf Ekle"}</Dugme>
      </div>
    </form>
  );
}
