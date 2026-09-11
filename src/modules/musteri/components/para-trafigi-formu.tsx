import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { secenekleriGetir } from "@/core/secenek/secenek-service";

export async function ParaTrafigiFormu({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const [tipler, durumlar, kaynaklar] = await Promise.all([
    secenekleriGetir("para_trafigi_tipi"),
    secenekleriGetir("para_trafigi_durumu"),
    secenekleriGetir("kaynak"),
  ]);

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="grid grid-cols-2 gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="tarih">Tarih</Etiket>
        <Girdi id="tarih" name="tarih" type="date" required defaultValue={bugun} />
      </Alan>
      <Alan>
        <Etiket htmlFor="tipId">Tip</Etiket>
        <Secim id="tipId" name="tipId" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {tipler.map((tip) => (
            <option key={tip.id} value={tip.id}>
              {tip.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="tutar">Tutar (₺)</Etiket>
        <Girdi id="tutar" name="tutar" type="number" step="0.01" min="0" required />
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
      <Alan>
        <Etiket htmlFor="ilgiliDosyaId">İlgili Dosya (opsiyonel)</Etiket>
        <Girdi id="ilgiliDosyaId" name="ilgiliDosyaId" placeholder="UYAP esas no vb." />
      </Alan>
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
