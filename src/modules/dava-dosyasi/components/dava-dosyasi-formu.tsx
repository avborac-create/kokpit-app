import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { musterileriListele, avukatlariListele } from "@/modules/musteri/lib/queries";
import {
  uyusmazlikGruplariniListele,
  musterininDosyalari,
  type davaDosyasiGetir,
} from "@/modules/dava-dosyasi/lib/queries";
import { formAlanDuzeniniGetir } from "@/core/form-duzeni/queries";
import { DAVA_DOSYASI_GIZLENEMEZ_ALANLAR } from "@/core/form-duzeni/dava-dosyasi-alanlari";
import { MuvekkilSecici } from "./muvekkil-secici";
import { KarsiTarafEkleyici } from "./karsi-taraf-ekleyici";

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
  const [durumlar, turler, hukukiIliskiTurleri, avukatlar, musteriler, alanDuzeni] = await Promise.all([
    secenekleriGetir("dava_dosyasi_durumu"),
    secenekleriGetir("dosya_turu"),
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

  // Her alan icin: gorunurken tam etkilesimli JSX, gizliyken (admin
  // "Gizli" yaptiysa) mevcut degeri tasiyan bir <input type="hidden">.
  // Bu ikincisi kritik: alan DOM'dan tamamen kalkarsa, duzenleme modunda
  // formData'da hic gelmez ve sunucu tarafi onu null'a cevirip VAR OLAN
  // veriyi siler - hidden input bunu engeller (bkz. plan).
  const alanRenderHaritasi: Record<string, (gizli: boolean) => React.ReactNode> = {
    hukukiIliskiTuruId: (gizli) =>
      gizli ? (
        <input type="hidden" name="hukukiIliskiTuruId" value={dosya?.hukukiIliskiTuruId ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="hukukiIliskiTuruId">Hukuki İlişki Türü (opsiyonel)</Etiket>
          <Secim
            id="hukukiIliskiTuruId"
            name="hukukiIliskiTuruId"
            defaultValue={dosya?.hukukiIliskiTuruId ?? ""}
          >
            <option value="">Seçiniz…</option>
            {hukukiIliskiTurleri.map((t) => (
              <option key={t.id} value={t.id}>
                {t.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      ),
    turId: () => (
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
    ),
    dosyaNo: (gizli) =>
      gizli ? (
        <input type="hidden" name="dosyaNo" value={dosya?.dosyaNo ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="dosyaNo">Dosya No (opsiyonel)</Etiket>
          <Girdi id="dosyaNo" name="dosyaNo" placeholder="Esas no vb." defaultValue={dosya?.dosyaNo ?? ""} />
        </Alan>
      ),
    konu: () => (
      <Alan>
        <Etiket htmlFor="konu">Konu</Etiket>
        <Girdi id="konu" name="konu" required defaultValue={dosya?.konu ?? ""} />
      </Alan>
    ),
    durumId: () => (
      <Alan>
        <Etiket htmlFor="durumId">Durum</Etiket>
        <Secim id="durumId" name="durumId" required defaultValue={varsayilanDurumId}>
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
    ),
    birimAdi: (gizli) =>
      gizli ? (
        <input type="hidden" name="birimAdi" value={dosya?.birimAdi ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="birimAdi">Birim Adı (Mahkeme/İcra Dairesi, varsa)</Etiket>
          <Girdi
            id="birimAdi"
            name="birimAdi"
            placeholder="İstanbul 19. İcra Dairesi vb."
            defaultValue={dosya?.birimAdi ?? ""}
          />
        </Alan>
      ),
    uyusmazlikGrubuId: (gizli) =>
      gizli ? (
        <input type="hidden" name="uyusmazlikGrubuId" value={dosya?.uyusmazlikGrubuId ?? ""} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Alan>
              <Etiket htmlFor="uyusmazlikGrubuId">
                Dosya Kümesi (müvekkil bakımından ayırt edici unsur)
              </Etiket>
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
              <Etiket htmlFor="yeniUyusmazlikGrubuAdi">veya Yeni Dosya Kümesi Ekle</Etiket>
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
        </>
      ),
    bagliOlduguDosyaId: (gizli) =>
      gizli ? (
        <input type="hidden" name="bagliOlduguDosyaId" value={dosya?.bagliOlduguDosyaId ?? ""} />
      ) : (
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
      ),
    acilisTarihi: () => (
      <Alan>
        <Etiket htmlFor="acilisTarihi">Açılış Tarihi</Etiket>
        <Girdi id="acilisTarihi" name="acilisTarihi" type="date" required defaultValue={acilisVarsayilan} />
      </Alan>
    ),
    kapanisTarihi: (gizli) =>
      gizli ? (
        <input type="hidden" name="kapanisTarihi" value={kapanisVarsayilan} />
      ) : (
        <Alan>
          <Etiket htmlFor="kapanisTarihi">Kapanış Tarihi</Etiket>
          <Girdi id="kapanisTarihi" name="kapanisTarihi" type="date" defaultValue={kapanisVarsayilan} />
        </Alan>
      ),
    sorumluAvukatId: (gizli) =>
      gizli ? (
        <input type="hidden" name="sorumluAvukatId" value={dosya?.sorumluAvukatId ?? ""} />
      ) : (
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
      ),
    aciklama: (gizli) =>
      gizli ? (
        <input type="hidden" name="aciklama" value={dosya?.aciklama ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="aciklama">Açıklama</Etiket>
          <MetinAlani id="aciklama" name="aciklama" rows={3} defaultValue={dosya?.aciklama ?? ""} />
        </Alan>
      ),
  };

  return (
    <form action={action} className="max-w-xl">
      <MuvekkilSecici musteriler={musteriler} seciliIdler={seciliIdler} />

      <KarsiTarafEkleyici
        baslangicKarsiTaraflar={
          dosya?.karsiTaraflar.map((kt) => ({ id: kt.karsiTarafId, ad: kt.karsiTaraf.ad })) ?? []
        }
      />

      {alanDuzeni.map((oge) => {
        const gizli = DAVA_DOSYASI_GIZLENEMEZ_ALANLAR.includes(oge.alanAnahtari) ? false : oge.gizliMi;
        const render = alanRenderHaritasi[oge.alanAnahtari];
        return render ? <div key={oge.alanAnahtari}>{render(gizli)}</div> : null;
      })}

      <GonderButonu>{gonderButonuMetni}</GonderButonu>
    </form>
  );
}
