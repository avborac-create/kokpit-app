import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { musterileriListele, avukatlariListele } from "@/modules/musteri/lib/queries";
import type { davaDosyasiGetir } from "@/modules/dava-dosyasi/lib/queries";
import { MuvekkilSecici } from "./muvekkil-secici";

type DosyaDetay = NonNullable<Awaited<ReturnType<typeof davaDosyasiGetir>>>;

type Props = {
  action: (formData: FormData) => void;
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
  const [durumlar, avukatlar, musteriler] = await Promise.all([
    secenekleriGetir("dava_dosyasi_durumu"),
    avukatlariListele(),
    musterileriListele(),
  ]);

  const seciliIdler =
    dosya?.muvekkiller.map((m) => m.musteriId) ?? (onSecilenMusteriId ? [onSecilenMusteriId] : []);
  const acilisVarsayilan = dosya
    ? dosya.acilisTarihi.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const kapanisVarsayilan = dosya?.kapanisTarihi ? dosya.kapanisTarihi.toISOString().slice(0, 10) : "";

  return (
    <form action={action} className="max-w-xl">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="dosyaNo">Dosya No</Etiket>
          <Girdi
            id="dosyaNo"
            name="dosyaNo"
            placeholder="Esas no vb."
            defaultValue={dosya?.dosyaNo ?? ""}
          />
        </Alan>
        <Alan>
          <Etiket htmlFor="durumId">Durum</Etiket>
          <Secim id="durumId" name="durumId" required defaultValue={dosya?.durumId ?? ""}>
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
      </div>

      <Alan>
        <Etiket htmlFor="konu">Konu</Etiket>
        <Girdi id="konu" name="konu" required defaultValue={dosya?.konu ?? ""} />
      </Alan>

      <MuvekkilSecici musteriler={musteriler} seciliIdler={seciliIdler} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="acilisTarihi">Açılış Tarihi</Etiket>
          <Girdi
            id="acilisTarihi"
            name="acilisTarihi"
            type="date"
            required
            defaultValue={acilisVarsayilan}
          />
        </Alan>
        <Alan>
          <Etiket htmlFor="kapanisTarihi">Kapanış Tarihi</Etiket>
          <Girdi id="kapanisTarihi" name="kapanisTarihi" type="date" defaultValue={kapanisVarsayilan} />
        </Alan>
      </div>

      <Alan>
        <Etiket htmlFor="sorumluAvukatId">Sorumlu Avukat</Etiket>
        <Secim id="sorumluAvukatId" name="sorumluAvukatId" defaultValue={dosya?.sorumluAvukatId ?? ""}>
          <option value="">Atanmadı</option>
          {avukatlar.map((avukat) => (
            <option key={avukat.id} value={avukat.id}>
              {avukat.adSoyad}
            </option>
          ))}
        </Secim>
      </Alan>

      <Alan>
        <Etiket htmlFor="aciklama">Açıklama</Etiket>
        <MetinAlani id="aciklama" name="aciklama" rows={3} defaultValue={dosya?.aciklama ?? ""} />
      </Alan>

      <Dugme type="submit">{gonderButonuMetni}</Dugme>
    </form>
  );
}
