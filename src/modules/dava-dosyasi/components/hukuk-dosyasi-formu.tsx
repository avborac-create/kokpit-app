import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { musterileriListele, avukatlariListele } from "@/modules/musteri/lib/queries";
import { uyusmazlikGruplariniListele, musterininDosyalari, type davaDosyasiGetir } from "@/modules/dava-dosyasi/lib/queries";
import { KarsiTarafEkleyici } from "./karsi-taraf-ekleyici";
import { DigerBilgilerAcici } from "./diger-bilgiler-acici";

type DosyaDetay = NonNullable<Awaited<ReturnType<typeof davaDosyasiGetir>>>;

type Props = {
  action: (formData: FormData) => void;
  dosya?: DosyaDetay;
  gonderButonuMetni: string;
  onSecilenMusteriId?: string;
};

// Hukuk Dosyasi kayit formu - CMK disi TUM yargi dosyalari icin tek ve
// sade form (bkz. GELISTIRME_KUTUSU.md gecmisi "Hukuk Dosyalari
// sadelestirmesi"). Kullaniciya varsayilan olarak SADECE 7 alan gosterilir:
// Muvekkil, Karsi Taraf, Konu, Birim Adi, Dosya No, Objekt Buro No, Durum.
// Eski/zengin alanlar (Dosya Turu, Dosya Kumesi, Sorumlu Avukat, Acilis/
// Kapanis Tarihi vb.) "Diger Bilgiler" altinda kapali kalir - silinmedi,
// sadece varsayilan olarak gizli (bkz. hukukDosyasiOlustur/Guncelle,
// actions.ts - bu alanlar hepsi opsiyoneldir).
export async function HukukDosyasiFormu({ action, dosya, gonderButonuMetni, onSecilenMusteriId }: Props) {
  const [durumlarTumu, turler, hukukiIliskiTurleri, avukatlar, musteriler] = await Promise.all([
    secenekleriGetir("dava_dosyasi_durumu"),
    secenekleriGetir("dosya_turu"),
    secenekleriGetir("hukuki_iliski_turu"),
    avukatlariListele(),
    musterileriListele(),
  ]);

  // Sade formda SADECE 3 deger secilebilir: Açılacak / Derdest / Kapalı
  // (bkz. plan). Eski "acik"/"arsiv" degerleri listeye bilerek dahil
  // edilmez - onlar sadece eski zengin ekranlarda anlamli kalir.
  const SADE_DURUM_KODLARI = ["acilacak", "derdest", "kapali"];
  const durumlar = durumlarTumu.filter((d) => SADE_DURUM_KODLARI.includes(d.kod));

  const seciliMusteriId = dosya?.muvekkiller[0]?.musteriId ?? onSecilenMusteriId ?? "";
  const digerMuvekkiller = dosya ? dosya.muvekkiller.filter((m) => m.musteriId !== seciliMusteriId) : [];

  const [uyusmazlikGruplari, muvekkilinDosyalari] = await Promise.all([
    seciliMusteriId ? uyusmazlikGruplariniListele([seciliMusteriId]) : Promise.resolve([]),
    seciliMusteriId ? musterininDosyalari(seciliMusteriId) : Promise.resolve([]),
  ]);
  const esasDosyaAdaylari = muvekkilinDosyalari.filter((d) => d.id !== dosya?.id);

  const varsayilanDurumId = dosya?.durumId ?? durumlar.find((d) => d.kod === "acilacak")?.id ?? "";
  const acilisVarsayilan = dosya
    ? dosya.acilisTarihi.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const kapanisVarsayilan = dosya?.kapanisTarihi ? dosya.kapanisTarihi.toISOString().slice(0, 10) : "";

  return (
    <form action={action} className="max-w-xl">
      <Alan>
        <Etiket htmlFor="musteriId">Müvekkil Ünvanı</Etiket>
        <Secim id="musteriId" name="musteriId" required defaultValue={seciliMusteriId}>
          <option value="" disabled>
            Seçiniz…
          </option>
          {musteriler.map((musteri) => (
            <option key={musteri.id} value={musteri.id}>
              {musteri.adSoyadUnvan}
            </option>
          ))}
        </Secim>
        {digerMuvekkiller.length > 0 && (
          <p className="mt-1 text-xs text-white/35">
            Bu dosyaya ayrıca bağlı: {digerMuvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ")} (bu
            formdan kaldırılamaz).
          </p>
        )}
      </Alan>

      <KarsiTarafEkleyici
        baslangicKarsiTaraflar={dosya?.karsiTaraflar.map((kt) => ({ id: kt.karsiTarafId, ad: kt.karsiTaraf.ad })) ?? []}
      />

      <Alan>
        <Etiket htmlFor="konu">Davanın / Takibin Konusu</Etiket>
        <Girdi
          id="konu"
          name="konu"
          required
          placeholder="İşçilik Alacağı Davası, İlamsız İcra Takibi…"
          defaultValue={dosya?.konu ?? ""}
        />
      </Alan>

      <Alan>
        <Etiket htmlFor="birimAdi">Birim Adı (opsiyonel)</Etiket>
        <Girdi
          id="birimAdi"
          name="birimAdi"
          placeholder="İstanbul 29. İş Mahkemesi, İstanbul 19. İcra Dairesi…"
          defaultValue={dosya?.birimAdi ?? ""}
        />
      </Alan>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="dosyaNo">Dosya Numarası (opsiyonel)</Etiket>
          <Girdi
            id="dosyaNo"
            name="dosyaNo"
            placeholder="Esas/takip no — açılacak dosyalarda boş bırakılabilir"
            defaultValue={dosya?.dosyaNo ?? ""}
          />
        </Alan>
        <Alan>
          <Etiket htmlFor="objektBuroNo">Objekt Büro No (opsiyonel)</Etiket>
          <Girdi
            id="objektBuroNo"
            name="objektBuroNo"
            placeholder="Eski Objekt yazılımındaki büro no"
            defaultValue={dosya?.objektBuroNo ?? ""}
          />
        </Alan>
      </div>

      <Alan>
        <Etiket htmlFor="durumId">Dosya Durumu</Etiket>
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

      <DigerBilgilerAcici>
        <Alan>
          <Etiket htmlFor="turId">Dosya Türü</Etiket>
          <Secim id="turId" name="turId" defaultValue={dosya?.turId ?? ""}>
            <option value="">Seçilmedi</option>
            {turler.map((tur) => (
              <option key={tur.id} value={tur.id}>
                {tur.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="hukukiIliskiTuruId">Hukuki İlişki Türü</Etiket>
          <Secim id="hukukiIliskiTuruId" name="hukukiIliskiTuruId" defaultValue={dosya?.hukukiIliskiTuruId ?? ""}>
            <option value="">Seçilmedi</option>
            {hukukiIliskiTurleri.map((t) => (
              <option key={t.id} value={t.id}>
                {t.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="uyusmazlikGrubuId">Dosya Kümesi</Etiket>
          <Secim id="uyusmazlikGrubuId" name="uyusmazlikGrubuId" defaultValue={dosya?.uyusmazlikGrubuId ?? ""}>
            <option value="">Seçilmedi</option>
            {uyusmazlikGruplari.map((grup) => (
              <option key={grup.id} value={grup.id}>
                {grup.ad}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="yeniUyusmazlikGrubuAdi">veya Yeni Dosya Kümesi Ekle</Etiket>
          <Girdi id="yeniUyusmazlikGrubuAdi" name="yeniUyusmazlikGrubuAdi" placeholder="Asya Park Ticareti vb." />
        </Alan>
        <Alan>
          <Etiket htmlFor="bagliOlduguDosyaId">Bağlı Olduğu Esas Dosya</Etiket>
          <Secim id="bagliOlduguDosyaId" name="bagliOlduguDosyaId" defaultValue={dosya?.bagliOlduguDosyaId ?? ""}>
            <option value="">— (bağımsız/esas dosya) —</option>
            {esasDosyaAdaylari.map((d) => (
              <option key={d.id} value={d.id}>
                {d.dosyaNo ? `${d.dosyaNo} — ` : ""}
                {d.konu}
              </option>
            ))}
          </Secim>
        </Alan>
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
          <Etiket htmlFor="acilisTarihi">Açılış Tarihi</Etiket>
          <Girdi id="acilisTarihi" name="acilisTarihi" type="date" defaultValue={acilisVarsayilan} />
        </Alan>
        <Alan>
          <Etiket htmlFor="kapanisTarihi">Kapanış Tarihi</Etiket>
          <Girdi id="kapanisTarihi" name="kapanisTarihi" type="date" defaultValue={kapanisVarsayilan} />
        </Alan>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor="aciklama">Açıklama</Etiket>
            <MetinAlani id="aciklama" name="aciklama" rows={3} defaultValue={dosya?.aciklama ?? ""} />
          </Alan>
        </div>
      </DigerBilgilerAcici>

      <GonderButonu>{gonderButonuMetni}</GonderButonu>
    </form>
  );
}
