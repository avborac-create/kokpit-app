import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { etiketleriGetir } from "@/core/arayuz-etiketi/queries";
import { musterileriListele } from "@/modules/musteri/lib/queries";
import type { davaDosyasiGetir } from "@/modules/dava-dosyasi/lib/queries";
import type { DavaDosyasiSonucu } from "@/modules/dava-dosyasi/lib/actions";
import { formAlanDuzeniniGetir } from "@/core/form-duzeni/queries";
import { DAVA_DOSYASI_ALAN_ETIKETLERI } from "@/core/form-duzeni/dava-dosyasi-alanlari";
import { adliBirimleriListele } from "../lib/adli-birim";
import { DavaDosyasiFormIcerik } from "./dava-dosyasi-form-icerik";

type DosyaDetay = NonNullable<Awaited<ReturnType<typeof davaDosyasiGetir>>>;

type Props = {
  action: (oncekiDurum: DavaDosyasiSonucu, formData: FormData) => Promise<DavaDosyasiSonucu>;
  dosya?: DosyaDetay;
  gonderButonuMetni: string;
  onSecilenMusteriId?: string;
  // Alt dosya olarak aciliyorsa ana dosyanin bilgileri (bkz. yeni/page.tsx).
  anaDosyaOn?: { id: string; etiket: string; altOlabilir: boolean; ustOlabilir: boolean; musteriIdleri: string[]; karsiTaraflar: { id: string; ad: string; tc?: string | null; detsis?: string | null }[] };
};

export async function DavaDosyasiFormu({ action, dosya, gonderButonuMetni, onSecilenMusteriId, anaDosyaOn }: Props) {
  const [kullanici, hukukDallari, hukukiIliskiTurleri, muvekkilSifatlari, davaTurleri, dosyaTurleri, yargiKollari, musteriler, alanDuzeni, etiketler, birimler] = await Promise.all([
    mevcutKullanici(),
    secenekleriGetir("hukuk_dali"),
    secenekleriGetir("hukuki_iliski_turu"),
    secenekleriGetir("muvekkil_sifati"),
    secenekleriGetir("dava_turu"),
    secenekleriGetir("dosya_turu"),
    secenekleriGetir("yargi_kolu"),
    musterileriListele(),
    formAlanDuzeniniGetir("dava-dosyasi"),
    etiketleriGetir(),
    adliBirimleriListele(),
  ]);

  const seciliIdler =
    dosya?.muvekkiller.map((m) => m.musteriId) ?? anaDosyaOn?.musteriIdleri ?? (onSecilenMusteriId ? [onSecilenMusteriId] : []);
  const gizliAlanlar = new Set(alanDuzeni.filter((o) => o.gizliMi).map((o) => o.alanAnahtari));
  const kayitliAlanlar = alanDuzeni.map((o) => o.alanAnahtari).filter((a) => a in DAVA_DOSYASI_ALAN_ETIKETLERI);
  // Sonradan eklenen alanlar (ör. Büro No) seed koşana kadar DB'de satır
  // olarak bulunmaz - eksik olanlar sona eklenir, alan formdan kaybolmaz.
  const alanSirasi = [
    ...kayitliAlanlar,
    ...Object.keys(DAVA_DOSYASI_ALAN_ETIKETLERI).filter((a) => !kayitliAlanlar.includes(a)),
  ].filter((a) => a === "davaTuruId" || !gizliAlanlar.has(a));

  return (
    <DavaDosyasiFormIcerik
      action={action}
      gonderButonuMetni={gonderButonuMetni}
      musteriler={musteriler}
      seciliIdler={seciliIdler}
      hukukDallari={hukukDallari.map((d) => ({ id: d.id, etiket: d.etiket }))}
      hukukiIliskiTurleri={hukukiIliskiTurleri.map((t) => ({ id: t.id, etiket: t.etiket, ustId: t.ustId }))}
      muvekkilSifatlari={muvekkilSifatlari.map((x) => ({ id: x.id, etiket: x.etiket, kod: x.kod }))}
      davaTurleri={davaTurleri}
      dosyaTurleri={dosyaTurleri.map((t) => ({ id: t.id, etiket: t.etiket, kod: t.kod }))}
      yargiKollari={yargiKollari.map((y) => ({ id: y.id, etiket: y.etiket, kod: y.kod }))}
      dosya={dosya}
      dosyaId={dosya?.id}
      baslangicKarsiTaraflar={dosya?.karsiTaraflar.map((kt) => ({ id: kt.karsiTarafId, ad: kt.karsiTaraf.ad, tc: kt.karsiTaraf.tanimlayiciKod, detsis: kt.karsiTaraf.detsisNo })) ?? anaDosyaOn?.karsiTaraflar ?? []}
      anaDosyaBilgisi={anaDosyaOn ? { id: anaDosyaOn.id, etiket: anaDosyaOn.etiket, altOlabilir: anaDosyaOn.altOlabilir, ustOlabilir: anaDosyaOn.ustOlabilir } : undefined}
      alanSirasi={alanSirasi}
      etiketler={etiketler}
      birimler={birimler}
      yoneticiMi={!!kullanici && silebilirMi(kullanici.rol)}
    />
  );
}
