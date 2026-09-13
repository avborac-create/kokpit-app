import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { musterileriListele, avukatlariListele } from "@/modules/musteri/lib/queries";
import {
  karsiTaraflariListele,
  uyusmazlikGruplariniListele,
  type davaDosyasiGetir,
} from "@/modules/dava-dosyasi/lib/queries";
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
  const [karsiTaraflar, uyusmazlikGruplari] = await Promise.all([
    karsiTaraflariListele(seciliIdler),
    uyusmazlikGruplariniListele(seciliIdler),
  ]);
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
        <Etiket htmlFor="birimAdi">Birim Adı (Mahkeme/İcra Dairesi)</Etiket>
        <Girdi
          id="birimAdi"
          name="birimAdi"
          required
          placeholder="İstanbul 19. İcra Dairesi vb."
          defaultValue={dosya?.birimAdi ?? ""}
        />
      </Alan>

      <Alan>
        <Etiket htmlFor="konu">Konu</Etiket>
        <Girdi id="konu" name="konu" required defaultValue={dosya?.konu ?? ""} />
      </Alan>

      <MuvekkilSecici musteriler={musteriler} seciliIdler={seciliIdler} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="karsiTarafId">Karşı Taraf</Etiket>
          <Secim id="karsiTarafId" name="karsiTarafId" defaultValue={dosya?.karsiTarafId ?? ""}>
            <option value="">Seçiniz…</option>
            {karsiTaraflar.map((kt) => (
              <option key={kt.id} value={kt.id}>
                {kt.ad}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="yeniKarsiTarafAdi">veya Yeni Karşı Taraf Ekle</Etiket>
          <Girdi id="yeniKarsiTarafAdi" name="yeniKarsiTarafAdi" placeholder="Koz Gıda vb." />
        </Alan>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="uyusmazlikGrubuId">Uyuşmazlık Grubu</Etiket>
          <Secim
            id="uyusmazlikGrubuId"
            name="uyusmazlikGrubuId"
            defaultValue={dosya?.uyusmazlikGrubuId ?? ""}
          >
            <option value="">Seçiniz…</option>
            {uyusmazlikGruplari.map((grup) => (
              <option key={grup.id} value={grup.id}>
                {grup.ad}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="yeniUyusmazlikGrubuAdi">veya Yeni Uyuşmazlık Grubu Ekle</Etiket>
          <Girdi
            id="yeniUyusmazlikGrubuAdi"
            name="yeniUyusmazlikGrubuAdi"
            placeholder="Asya Park Ticareti vb."
          />
        </Alan>
      </div>
      <p className="mb-4 -mt-3 text-xs text-white/35">
        Aynı alacağın/uyuşmazlığın tahsili için birden fazla dosya açılırsa (örn. asıl borçlu ve
        sonradan devreye giren kefil), bu dosyaları aynı grup altında toplayın.
      </p>

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
