import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { avukatlariListele } from "@/modules/musteri/lib/queries";
import { formAlanDuzeniniGetir } from "@/core/form-duzeni/queries";
import { MUSTERI_GIZLENEMEZ_ALANLAR } from "@/core/form-duzeni/musteri-alanlari";
import type { Kullanici, Musteri } from "@prisma/client";

type Props = {
  action: (formData: FormData) => void;
  musteri?: Musteri;
  gonderButonuMetni: string;
};

export async function MusteriFormu({ action, musteri, gonderButonuMetni }: Props) {
  const [tipler, durumlar, avukatlar, alanDuzeni] = await Promise.all([
    secenekleriGetir("musteri_tipi"),
    secenekleriGetir("musteri_durumu"),
    avukatlariListele() as Promise<Kullanici[]>,
    formAlanDuzeniniGetir("musteri"),
  ]);

  // Her alan icin: gorunurken tam etkilesimli JSX, gizliyken (admin
  // "Gizli" yaptiysa) mevcut degeri tasiyan bir <input type="hidden">
  // (bkz. dava-dosyasi-formu.tsx - ayni kritik veri butunlugu mekanizmasi:
  // aksi halde duzenleme modunda gizlenen bir alanin mevcut degeri
  // formData'da hic gelmez, sunucu tarafi bunu null'a cevirip siler).
  const alanRenderHaritasi: Record<string, (gizli: boolean) => React.ReactNode> = {
    adSoyadUnvan: () => (
      <Alan>
        <Etiket htmlFor="adSoyadUnvan">Ad Soyad / Unvan</Etiket>
        <Girdi id="adSoyadUnvan" name="adSoyadUnvan" required defaultValue={musteri?.adSoyadUnvan} />
      </Alan>
    ),
    tipId: () => (
      <Alan>
        <Etiket htmlFor="tipId">Tip</Etiket>
        <Secim id="tipId" name="tipId" required defaultValue={musteri?.tipId ?? ""}>
          <option value="" disabled>
            Seçiniz…
          </option>
          {tipler.map((tip) => (
            <option key={tip.id} value={tip.id}>
              {tip.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
    ),
    durumId: () => (
      <Alan>
        <Etiket htmlFor="durumId">Durum</Etiket>
        <Secim id="durumId" name="durumId" required defaultValue={musteri?.durumId ?? ""}>
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
    telefon: (gizli) =>
      gizli ? (
        <input type="hidden" name="telefon" value={musteri?.telefon ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="telefon">Telefon</Etiket>
          <Girdi id="telefon" name="telefon" type="tel" defaultValue={musteri?.telefon ?? ""} />
        </Alan>
      ),
    eposta: (gizli) =>
      gizli ? (
        <input type="hidden" name="eposta" value={musteri?.eposta ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="eposta">E-posta</Etiket>
          <Girdi id="eposta" name="eposta" type="email" defaultValue={musteri?.eposta ?? ""} />
        </Alan>
      ),
    adres: (gizli) =>
      gizli ? (
        <input type="hidden" name="adres" value={musteri?.adres ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="adres">Adres</Etiket>
          <MetinAlani id="adres" name="adres" rows={2} defaultValue={musteri?.adres ?? ""} />
        </Alan>
      ),
    sorumluAvukatId: (gizli) =>
      gizli ? (
        <input type="hidden" name="sorumluAvukatId" value={musteri?.sorumluAvukatId ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="sorumluAvukatId">Sorumlu Avukat</Etiket>
          <Secim id="sorumluAvukatId" name="sorumluAvukatId" defaultValue={musteri?.sorumluAvukatId ?? ""}>
            <option value="">Atanmadı</option>
            {avukatlar.map((avukat) => (
              <option key={avukat.id} value={avukat.id}>
                {avukat.adSoyad}
              </option>
            ))}
          </Secim>
        </Alan>
      ),
    notlar: (gizli) =>
      gizli ? (
        <input type="hidden" name="notlar" value={musteri?.notlar ?? ""} />
      ) : (
        <Alan>
          <Etiket htmlFor="notlar">Notlar</Etiket>
          <MetinAlani id="notlar" name="notlar" rows={4} defaultValue={musteri?.notlar ?? ""} />
        </Alan>
      ),
  };

  return (
    <form action={action} className="max-w-xl">
      {alanDuzeni.map((oge) => {
        const gizli = MUSTERI_GIZLENEMEZ_ALANLAR.includes(oge.alanAnahtari) ? false : oge.gizliMi;
        const render = alanRenderHaritasi[oge.alanAnahtari];
        return render ? <div key={oge.alanAnahtari}>{render(gizli)}</div> : null;
      })}

      <GonderButonu>{gonderButonuMetni}</GonderButonu>
    </form>
  );
}
