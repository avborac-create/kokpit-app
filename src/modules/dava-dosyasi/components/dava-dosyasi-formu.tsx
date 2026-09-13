import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { musterileriListele, avukatlariListele } from "@/modules/musteri/lib/queries";
import {
  karsiTaraflariListele,
  uyusmazlikGruplariniListele,
  musterininDosyalari,
  type davaDosyasiGetir,
} from "@/modules/dava-dosyasi/lib/queries";
import { MuvekkilSecici } from "./muvekkil-secici";
import { KarsiTarafSecici } from "./karsi-taraf-secici";

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
  const [durumlar, turler, avukatlar, musteriler] = await Promise.all([
    secenekleriGetir("dava_dosyasi_durumu"),
    secenekleriGetir("dosya_turu"),
    avukatlariListele(),
    musterileriListele(),
  ]);

  const seciliIdler =
    dosya?.muvekkiller.map((m) => m.musteriId) ?? (onSecilenMusteriId ? [onSecilenMusteriId] : []);
  const [karsiTaraflar, uyusmazlikGruplari, muvekkilinDosyalari] = await Promise.all([
    karsiTaraflariListele(seciliIdler),
    uyusmazlikGruplariniListele(seciliIdler),
    seciliIdler[0] ? musterininDosyalari(seciliIdler[0]) : Promise.resolve([]),
  ]);
  const esasDosyaAdaylari = muvekkilinDosyalari.filter((d) => d.id !== dosya?.id);
  const acilisVarsayilan = dosya
    ? dosya.acilisTarihi.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const kapanisVarsayilan = dosya?.kapanisTarihi ? dosya.kapanisTarihi.toISOString().slice(0, 10) : "";

  return (
    <form action={action} className="max-w-xl">
      <MuvekkilSecici musteriler={musteriler} seciliIdler={seciliIdler} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="uyusmazlikGrubuId">Uyuşmazlık Grubu (müvekkil bakımından ayırt edici unsur)</Etiket>
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
        Bütün yargısal/icra dosyaları buradan doğar — önce bu işin kiminle/hangi ilişkiyle ilgili
        olduğunu belirleyin (ör. &quot;Asya Park Ticareti&quot;, &quot;Hicret Kırtay&quot;), tür ve karşı taraf seçimi
        ondan sonra gelir. Aynı alacağın/uyuşmazlığın tahsili için birden fazla dosya açılırsa
        (örn. asıl borçlu ve sonradan devreye giren kefil), bu dosyaları aynı grup altında toplayın.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="turId">Dosya Türü</Etiket>
          <Secim id="turId" name="turId" required defaultValue={dosya?.turId ?? ""}>
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

      <KarsiTarafSecici
        karsiTaraflar={karsiTaraflar}
        seciliIdler={dosya?.karsiTaraflar.map((kt) => kt.karsiTarafId) ?? []}
      />
      <Alan>
        <Etiket htmlFor="yeniKarsiTarafAdi">veya Yeni Karşı Taraf Ekle</Etiket>
        <Girdi id="yeniKarsiTarafAdi" name="yeniKarsiTarafAdi" placeholder="Koz Gıda vb." />
      </Alan>

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
          <Etiket htmlFor="birimAdi">Birim Adı (Mahkeme/İcra Dairesi, varsa)</Etiket>
          <Girdi
            id="birimAdi"
            name="birimAdi"
            placeholder="İstanbul 19. İcra Dairesi vb."
            defaultValue={dosya?.birimAdi ?? ""}
          />
        </Alan>
      </div>

      <Alan>
        <Etiket htmlFor="konu">Konu</Etiket>
        <Girdi id="konu" name="konu" required defaultValue={dosya?.konu ?? ""} />
      </Alan>

      <Alan>
        <Etiket htmlFor="bagliOlduguDosyaId">Bağlı Olduğu Esas Dosya (opsiyonel)</Etiket>
        <Secim
          id="bagliOlduguDosyaId"
          name="bagliOlduguDosyaId"
          defaultValue={dosya?.bagliOlduguDosyaId ?? ""}
        >
          <option value="">— (bağımsız/esas dosya) —</option>
          {esasDosyaAdaylari.map((d) => (
            <option key={d.id} value={d.id}>
              {d.dosyaNo ? `${d.dosyaNo} — ` : ""}
              {d.konu}
            </option>
          ))}
        </Secim>
        <p className="mt-1 text-xs text-white/35">
          Talimat dosyası gibi başka bir dosyanın uzantısı olan dosyalar için: hangi esas dosyaya
          bağlı olduğunu seçin (örn. bir icra dosyasının haciz için başka bir icra dairesine
          gönderilen talimat dosyası).
        </p>
      </Alan>

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
