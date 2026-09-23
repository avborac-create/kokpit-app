import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { musterileriListele } from "@/modules/musteri/lib/queries";
import type { davaDosyasiGetir } from "@/modules/dava-dosyasi/lib/queries";
import type { DavaDosyasiSonucu } from "@/modules/dava-dosyasi/lib/actions";
import { formAlanDuzeniniGetir } from "@/core/form-duzeni/queries";
import { DAVA_DOSYASI_ALAN_ETIKETLERI } from "@/core/form-duzeni/dava-dosyasi-alanlari";
import { DavaDosyasiFormIcerik } from "./dava-dosyasi-form-icerik";

type DosyaDetay = NonNullable<Awaited<ReturnType<typeof davaDosyasiGetir>>>;

type Props = {
  action: (oncekiDurum: DavaDosyasiSonucu, formData: FormData) => Promise<DavaDosyasiSonucu>;
  dosya?: DosyaDetay;
  gonderButonuMetni: string;
  onSecilenMusteriId?: string;
};

export async function DavaDosyasiFormu({ action, dosya, gonderButonuMetni, onSecilenMusteriId }: Props) {
  const [hukukiIliskiTurleri, davaTurleri, musteriler, alanDuzeni] = await Promise.all([
    secenekleriGetir("hukuki_iliski_turu"),
    secenekleriGetir("dava_turu"),
    musterileriListele(),
    formAlanDuzeniniGetir("dava-dosyasi"),
  ]);

  const seciliIdler =
    dosya?.muvekkiller.map((m) => m.musteriId) ?? (onSecilenMusteriId ? [onSecilenMusteriId] : []);
  const alanSirasi = alanDuzeni
    .map((o) => o.alanAnahtari)
    .filter((a) => a in DAVA_DOSYASI_ALAN_ETIKETLERI);

  return (
    <DavaDosyasiFormIcerik
      action={action}
      gonderButonuMetni={gonderButonuMetni}
      musteriler={musteriler}
      seciliIdler={seciliIdler}
      hukukiIliskiTurleri={hukukiIliskiTurleri}
      davaTurleri={davaTurleri}
      dosya={dosya}
      dosyaId={dosya?.id}
      baslangicKarsiTaraflar={dosya?.karsiTaraflar.map((kt) => ({ id: kt.karsiTarafId, ad: kt.karsiTaraf.ad })) ?? []}
      alanSirasi={alanSirasi}
    />
  );
}
