import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { secenekleriGetir } from "@/core/secenek/secenek-service";

export async function MasrafFormu({ action }: { action: (formData: FormData) => void }) {
  const [cariKodlar, turler] = await Promise.all([
    secenekleriGetir("cari_kod"),
    secenekleriGetir("masraf_turu"),
  ]);

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="tarih">Tarih</Etiket>
        <Girdi id="tarih" name="tarih" type="date" required defaultValue={bugun} />
      </Alan>
      <Alan>
        <Etiket htmlFor="cariKodId">Cari Kod</Etiket>
        <Secim id="cariKodId" name="cariKodId" required defaultValue="">
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
        <Secim id="turId" name="turId" required defaultValue="">
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
        <Etiket htmlFor="tutar">Tutar (₺)</Etiket>
        <Girdi id="tutar" name="tutar" type="number" step="0.01" min="0" required />
      </Alan>
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="aciklama">Açıklama</Etiket>
          <MetinAlani id="aciklama" name="aciklama" rows={2} required />
        </Alan>
      </div>
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <Dugme type="submit">Masraf Ekle</Dugme>
      </div>
    </form>
  );
}
