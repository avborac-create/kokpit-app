import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { etiketleriGetir } from "@/core/arayuz-etiketi/queries";
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
  const [hukukiIliskiTurleri, davaTurleri, dosyaTurleri, yargiKollari, musteriler, alanDuzeni, etiketler] = await Promise.all([
    secenekleriGetir("hukuki_iliski_turu"),
    secenekleriGetir("dava_turu"),
    secenekleriGetir("dosya_turu"),
    secenekleriGetir("yargi_kolu"),
    musterileriListele(),
    formAlanDuzeniniGetir("dava-dosyasi"),
    etiketleriGetir(),
  ]);

  const seciliIdler =
    dosya?.muvekkiller.map((m) => m.musteriId) ?? (onSecilenMusteriId ? [onSecilenMusteriId] : []);
  const kayitliAlanlar = alanDuzeni.map((o) => o.alanAnahtari).filter((a) => a in DAVA_DOSYASI_ALAN_ETIKETLERI);
  // Sonradan eklenen alanlar (ör. Büro No) seed koşana kadar DB'de satır
  // olarak bulunmaz - eksik olanlar sona eklenir, alan formdan kaybolmaz.
  const alanSirasi = [
    ...kayitliAlanlar,
    ...Object.keys(DAVA_DOSYASI_ALAN_ETIKETLERI).filter((a) => !kayitliAlanlar.includes(a)),
  ];

  return (
    <DavaDosyasiFormIcerik
      action={action}
      gonderButonuMetni={gonderButonuMetni}
      musteriler={musteriler}
      seciliIdler={seciliIdler}
      hukukiIliskiTurleri={hukukiIliskiTurleri}
      davaTurleri={davaTurleri}
      dosyaTurleri={dosyaTurleri.map((t) => ({ id: t.id, etiket: t.etiket, kod: t.kod }))}
      yargiKollari={yargiKollari.map((y) => ({ id: y.id, etiket: y.etiket, kod: y.kod }))}
      dosya={dosya}
      dosyaId={dosya?.id}
      baslangicKarsiTaraflar={dosya?.karsiTaraflar.map((kt) => ({ id: kt.karsiTarafId, ad: kt.karsiTaraf.ad, tc: kt.karsiTaraf.tanimlayiciKod })) ?? []}
      alanSirasi={alanSirasi}
      etiketler={etiketler}
    />
  );
}
