import { Alan, Etiket, Girdi } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { ParaGirdisi } from "@/core/ui/para-girdisi";

const bugun = () => new Date().toISOString().slice(0, 10);

// Muvekkilden gelen para: cari kod SORULMAZ, havuza girer.
export type ParaGirisiVerisi = { tarih: string; tutar: number; aciklama: string };

export function ParaGirisiFormu({
  action,
  duzenlemeVerisi,
}: {
  action: (formData: FormData) => void;
  duzenlemeVerisi?: ParaGirisiVerisi;
}) {
  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="pg-tarih">Geliş Tarihi</Etiket>
        <Girdi id="pg-tarih" name="tarih" type="date" required defaultValue={duzenlemeVerisi?.tarih ?? bugun()} />
      </Alan>
      <Alan>
        <Etiket htmlFor="pg-tutar">Tutar</Etiket>
        <ParaGirdisi id="pg-tutar" name="tutar" required defaultValue={duzenlemeVerisi?.tutar} />
      </Alan>
      <Alan>
        <Etiket htmlFor="pg-aciklama">Açıklama (isteğe bağlı)</Etiket>
        <Girdi id="pg-aciklama" name="aciklama" placeholder="ör. havale / EFT" defaultValue={duzenlemeVerisi?.aciklama ?? ""} />
      </Alan>
      <div className="flex items-end">
        <GonderButonu>{duzenlemeVerisi ? "Kaydet" : "Havuza Ekle"}</GonderButonu>
      </div>
    </form>
  );
}

// Cari kodun BORC hanesi: tutar + neye istinaden.
export type TahakkukVerisi = { tarih: string; tutar: number; dayanak: string };

export function TahakkukFormu({
  action,
  cariKodId,
  dayanakIpucu,
  duzenlemeVerisi,
}: {
  action: (formData: FormData) => void;
  cariKodId: string;
  dayanakIpucu?: string;
  duzenlemeVerisi?: TahakkukVerisi;
}) {
  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <input type="hidden" name="cariKodId" value={cariKodId} />
      <Alan>
        <Etiket htmlFor="th-tarih">Tarih</Etiket>
        <Girdi id="th-tarih" name="tarih" type="date" required defaultValue={duzenlemeVerisi?.tarih ?? bugun()} />
      </Alan>
      <Alan>
        <Etiket htmlFor="th-tutar">Borç Tutarı</Etiket>
        <ParaGirdisi id="th-tutar" name="tutar" required defaultValue={duzenlemeVerisi?.tutar} />
      </Alan>
      <Alan>
        <Etiket htmlFor="th-dayanak">Neye İstinaden</Etiket>
        <Girdi
          id="th-dayanak"
          name="dayanak"
          required
          placeholder={dayanakIpucu ?? "ör. dosyanın hizmet bedeli"}
          defaultValue={duzenlemeVerisi?.dayanak ?? ""}
        />
      </Alan>
      <div className="flex items-end">
        <GonderButonu>{duzenlemeVerisi ? "Kaydet" : "Borç Ekle"}</GonderButonu>
      </div>
    </form>
  );
}
