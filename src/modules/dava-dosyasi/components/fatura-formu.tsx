import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";

export type FaturaDuzenlemeVerisi = {
  tarih: string;
  turId: string;
  tutar: number;
  aciklama: string;
};

// Dosya Cari Hesabi'na (borc tarafi) yeni bir fatura satiri eklemek/
// duzenlemek icin - bkz. MasrafFormu ile ayni desen, ama cari kod YOK
// (fatura dogrudan musteriye kesilir, bir "havuzdan" dusulmez).
export async function FaturaFormu({
  action,
  duzenlemeVerisi,
}: {
  action: (formData: FormData) => void;
  duzenlemeVerisi?: FaturaDuzenlemeVerisi;
}) {
  const turler = await secenekleriGetir("fatura_turu");
  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="tarih">Tarih</Etiket>
        <Girdi id="tarih" name="tarih" type="date" required defaultValue={duzenlemeVerisi?.tarih ?? bugun} />
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
        <GonderButonu>{duzenlemeVerisi ? "Faturayı Güncelle" : "Fatura Ekle"}</GonderButonu>
      </div>
    </form>
  );
}
