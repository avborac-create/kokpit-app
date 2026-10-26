import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { DosyaSecici } from "@/core/ui/dosya-secici";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { MasrafYansitmaSecici } from "@/modules/dava-dosyasi/components/masraf-yansitma-secici";
import { MasrafTuruTutarAlani } from "@/modules/dava-dosyasi/components/masraf-turu-tutar-alani";

export type MasrafDuzenlemeVerisi = {
  tarih: string;
  cariKodId: string;
  turId: string;
  tutar: number;
  aciklama: string;
  yansitmaHedefi?: "MUVEKKIL" | "BURO" | "BORCLU";
  karsiTarafId?: string | null;
};

export async function MasrafFormu({
  action,
  duzenlemeVerisi,
  turDuzenleyici,
  varsayilanCariKod,
  dosyaSecimi,
  karsiTaraflar = [],
}: {
  action: (formData: FormData) => void;
  duzenlemeVerisi?: MasrafDuzenlemeVerisi;
  turDuzenleyici?: React.ReactNode;
  // Yeni masrafta on secili gelecek cari kodun `kod` degeri (ör. masraf_hesabi).
  varsayilanCariKod?: string;
  // Muvekkil ekraninda masrafin hangi dosyaya ait oldugu secilir; dosya ekraninda sabit.
  dosyaSecimi?: { sabitDosyaId?: string; dosyalar?: { id: string; etiket: string; ayrinti?: string }[] };
  // "Karsi Tarafa / Borcluya" secilince opsiyonel secilebilecek karsi taraflar.
  karsiTaraflar?: { id: string; ad: string }[];
}) {
  const [cariKodlar, turler] = await Promise.all([
    secenekleriGetir("cari_kod"),
    secenekleriGetir("masraf_turu"),
  ]);

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      {dosyaSecimi?.sabitDosyaId && <input type="hidden" name="dosyaId" value={dosyaSecimi.sabitDosyaId} />}
      {dosyaSecimi && !dosyaSecimi.sabitDosyaId && (
        <Alan>
          <Etiket htmlFor="dosyaId">Dosya</Etiket>
          <DosyaSecici id="dosyaId" name="dosyaId" dosyalar={dosyaSecimi.dosyalar ?? []} required />
        </Alan>
      )}
      <Alan>
        <Etiket htmlFor="tarih">Tarih</Etiket>
        <Girdi id="tarih" name="tarih" type="date" required defaultValue={duzenlemeVerisi?.tarih ?? bugun} />
      </Alan>
      <Alan>
        <Etiket htmlFor="cariKodId">Cari Kod</Etiket>
        <Secim id="cariKodId" name="cariKodId" required defaultValue={duzenlemeVerisi?.cariKodId ?? cariKodlar.find((k) => k.kod === varsayilanCariKod)?.id ?? ""}>
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
      <MasrafTuruTutarAlani
        turler={turler}
        defaultTurId={duzenlemeVerisi?.turId}
        defaultTutar={duzenlemeVerisi?.tutar}
        turDuzenleyici={turDuzenleyici}
      />
      <MasrafYansitmaSecici
        varsayilanHedef={duzenlemeVerisi?.yansitmaHedefi ?? "MUVEKKIL"}
        karsiTaraflar={karsiTaraflar}
        varsayilanKarsiTarafId={duzenlemeVerisi?.karsiTarafId}
      />
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="aciklama">Açıklama</Etiket>
          <MetinAlani id="aciklama" name="aciklama" rows={2} required defaultValue={duzenlemeVerisi?.aciklama ?? ""} />
        </Alan>
      </div>
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <GonderButonu>{duzenlemeVerisi ? "Masrafı Güncelle" : "Masraf Ekle"}</GonderButonu>
      </div>
    </form>
  );
}
