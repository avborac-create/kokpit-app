"use client";

import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { avukatlariListele } from "@/modules/musteri/lib/queries";
import {
  uyusmazlikGruplariniListele,
  musterininDosyalari,
  type davaDosyasiGetir,
} from "@/modules/dava-dosyasi/lib/queries";
import { formAlanDuzeniniGetir } from "@/core/form-duzeni/queries";
import { DAVA_DOSYASI_GIZLENEMEZ_ALANLAR } from "@/core/form-duzeni/dava-dosyasi-alanlari";

type DosyaDetay = NonNullable<Awaited<ReturnType<typeof davaDosyasiGetir>>>;
type SecenekListesi = Awaited<ReturnType<typeof secenekleriGetir>>;
type AlanDuzeni = Awaited<ReturnType<typeof formAlanDuzeniniGetir>>;

// DavaDosyasiFormu'nun (async Server Component) DB'den okudugu secenek
// listelerini gercek <input>/<select> elemanlarina cevirir. BILEREK bir
// "use client" bileseni: davaDosyasiOlustur/Guncelle useActionState ile
// cagrildiginda, ebeveyn Server Component (DavaDosyasiFormu) her gonderimde
// yeniden calisir - dogrudan onun icinde render edilen duz HTML alanlari
// (Server Component agacinin bir parcasi oldugundan) her seferinde SIFIRDAN
// gelir ve kullanicinin yazdigi deger kaybolur. Bu alanlari ayri bir
// istemci bileseninde tutmak, React'in onu (ayni konum/tipte) ayni fiber
// olarak koruyup DOM'daki yazilmis degerlere dokunmamasini saglar - tipki
// KarsiTarafEkleyici/MuvekkilSecici'nin zaten korundugu gibi (bkz. kullanici
// geri bildirimi: "İşlem tamamlanamadı" hatasindan sonra girilen veri siliniyordu).
export function DavaDosyasiFormAlanlari({
  dosya,
  durumlar,
  turler,
  icraAltTurleri,
  yargiKollari,
  hukukiIliskiTurleri,
  avukatlar,
  uyusmazlikGruplari,
  esasDosyaAdaylari,
  alanDuzeni,
  acilisVarsayilan,
  kapanisVarsayilan,
  varsayilanDurumId,
}: {
  dosya?: DosyaDetay;
  durumlar: SecenekListesi;
  turler: SecenekListesi;
  icraAltTurleri: SecenekListesi;
  yargiKollari: SecenekListesi;
  hukukiIliskiTurleri: SecenekListesi;
  avukatlar: Awaited<ReturnType<typeof avukatlariListele>>;
  uyusmazlikGruplari: Awaited<ReturnType<typeof uyusmazlikGruplariniListele>>;
  esasDosyaAdaylari: Awaited<ReturnType<typeof musterininDosyalari>>;
  alanDuzeni: AlanDuzeni;
  acilisVarsayilan: string;
  kapanisVarsayilan: string;
  varsayilanDurumId: string;
}) {
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
    icraAltTuruId: (gizli) =>
      gizli ? (
        <input type="hidden" name="icraAltTuruId" value={dosya?.icraAltTuruId ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="icraAltTuruId">İcra Dosyası Alt Türü (Dosya Türü “İcra Dosyası” ise)</Etiket>
          <Secim id="icraAltTuruId" name="icraAltTuruId" defaultValue={dosya?.icraAltTuruId ?? ""}>
            <option value="">—</option>
            {icraAltTurleri.map((t) => (
              <option key={t.id} value={t.id}>
                {t.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      ),
    yargiKoluId: (gizli) =>
      gizli ? (
        <input type="hidden" name="yargiKoluId" value={dosya?.yargiKoluId ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="yargiKoluId">Yargı Kolu (Dosya Türü “Dava Dosyası” ise)</Etiket>
          <Secim id="yargiKoluId" name="yargiKoluId" defaultValue={dosya?.yargiKoluId ?? ""}>
            <option value="">—</option>
            {yargiKollari.map((y) => (
              <option key={y.id} value={y.id}>
                {y.etiket}
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
    <>
      {alanDuzeni.map((oge) => {
        const gizli = DAVA_DOSYASI_GIZLENEMEZ_ALANLAR.includes(oge.alanAnahtari) ? false : oge.gizliMi;
        const render = alanRenderHaritasi[oge.alanAnahtari];
        return render ? <div key={oge.alanAnahtari}>{render(gizli)}</div> : null;
      })}
    </>
  );
}
