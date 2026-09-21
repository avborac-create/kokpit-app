import { GonderButonu } from "@/core/ui/gonder-butonu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { musterileriListele, avukatlariListele } from "@/modules/musteri/lib/queries";
import {
  uyusmazlikGruplariniListele,
  musterininDosyalari,
  type davaDosyasiGetir,
} from "@/modules/dava-dosyasi/lib/queries";
import type { DavaDosyasiFormDurumu } from "@/modules/dava-dosyasi/lib/actions";
import { formAlanDuzeniniGetir } from "@/core/form-duzeni/queries";
import { MuvekkilSecici } from "./muvekkil-secici";
import { KarsiTarafEkleyici } from "./karsi-taraf-ekleyici";
import { DavaDosyasiFormKabugu } from "./dava-dosyasi-form-kabugu";
import { DavaDosyasiFormAlanlari } from "./dava-dosyasi-form-alanlar";

type DosyaDetay = NonNullable<Awaited<ReturnType<typeof davaDosyasiGetir>>>;

type Props = {
  action: (
    durum: DavaDosyasiFormDurumu,
    formData: FormData,
  ) => DavaDosyasiFormDurumu | Promise<DavaDosyasiFormDurumu>;
  dosya?: DosyaDetay;
  gonderButonuMetni: string;
  onSecilenMusteriId?: string;
};

export async function DavaDosyasiFormu({
  action,
  dosya,
  gonderButonuMetni,
  onSecilenMusteriId,
}: Props) {
  const [durumlar, turler, icraAltTurleri, yargiKollari, hukukiIliskiTurleri, avukatlar, musteriler, alanDuzeni] =
    await Promise.all([
      secenekleriGetir("dava_dosyasi_durumu"),
      secenekleriGetir("dosya_turu"),
      secenekleriGetir("icra_dosyasi_alt_turu"),
      secenekleriGetir("yargi_kolu"),
      secenekleriGetir("hukuki_iliski_turu"),
      avukatlariListele(),
      musterileriListele(),
      formAlanDuzeniniGetir("dava-dosyasi"),
    ]);

  const seciliIdler =
    dosya?.muvekkiller.map((m) => m.musteriId) ?? (onSecilenMusteriId ? [onSecilenMusteriId] : []);
  const [uyusmazlikGruplari, muvekkilinDosyalari] = await Promise.all([
    uyusmazlikGruplariniListele(seciliIdler),
    seciliIdler[0] ? musterininDosyalari(seciliIdler[0]) : Promise.resolve([]),
  ]);
  const esasDosyaAdaylari = muvekkilinDosyalari.filter((d) => d.id !== dosya?.id);
  const acilisVarsayilan = dosya
    ? dosya.acilisTarihi.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const kapanisVarsayilan = dosya?.kapanisTarihi ? dosya.kapanisTarihi.toISOString().slice(0, 10) : "";
  const varsayilanDurumId =
    dosya?.durumId ?? durumlar.find((d) => d.kod === "acik")?.id ?? "";

  return (
    <DavaDosyasiFormKabugu action={action}>
      <MuvekkilSecici musteriler={musteriler} seciliIdler={seciliIdler} />

      <KarsiTarafEkleyici
        baslangicKarsiTaraflar={
          dosya?.karsiTaraflar.map((kt) => ({ id: kt.karsiTarafId, ad: kt.karsiTaraf.ad })) ?? []
        }
      />

      <DavaDosyasiFormAlanlari
        dosya={dosya}
        durumlar={durumlar}
        turler={turler}
        icraAltTurleri={icraAltTurleri}
        yargiKollari={yargiKollari}
        hukukiIliskiTurleri={hukukiIliskiTurleri}
        avukatlar={avukatlar}
        uyusmazlikGruplari={uyusmazlikGruplari}
        esasDosyaAdaylari={esasDosyaAdaylari}
        alanDuzeni={alanDuzeni}
        acilisVarsayilan={acilisVarsayilan}
        kapanisVarsayilan={kapanisVarsayilan}
        varsayilanDurumId={varsayilanDurumId}
      />

      <GonderButonu>{gonderButonuMetni}</GonderButonu>
    </DavaDosyasiFormKabugu>
  );
}
