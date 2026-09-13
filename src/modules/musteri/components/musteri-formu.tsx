import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { avukatlariListele } from "@/modules/musteri/lib/queries";
import type { Kullanici, Musteri } from "@prisma/client";

type Props = {
  action: (formData: FormData) => void;
  musteri?: Musteri;
  gonderButonuMetni: string;
};

export async function MusteriFormu({ action, musteri, gonderButonuMetni }: Props) {
  const [tipler, durumlar, avukatlar] = await Promise.all([
    secenekleriGetir("musteri_tipi"),
    secenekleriGetir("musteri_durumu"),
    avukatlariListele() as Promise<Kullanici[]>,
  ]);

  return (
    <form action={action} className="max-w-xl">
      <Alan>
        <Etiket htmlFor="adSoyadUnvan">Ad Soyad / Unvan</Etiket>
        <Girdi
          id="adSoyadUnvan"
          name="adSoyadUnvan"
          required
          defaultValue={musteri?.adSoyadUnvan}
        />
      </Alan>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="telefon">Telefon</Etiket>
          <Girdi id="telefon" name="telefon" type="tel" defaultValue={musteri?.telefon ?? ""} />
        </Alan>
        <Alan>
          <Etiket htmlFor="eposta">E-posta</Etiket>
          <Girdi id="eposta" name="eposta" type="email" defaultValue={musteri?.eposta ?? ""} />
        </Alan>
      </div>

      <Alan>
        <Etiket htmlFor="adres">Adres</Etiket>
        <MetinAlani id="adres" name="adres" rows={2} defaultValue={musteri?.adres ?? ""} />
      </Alan>

      <Alan>
        <Etiket htmlFor="sorumluAvukatId">Sorumlu Avukat</Etiket>
        <Secim
          id="sorumluAvukatId"
          name="sorumluAvukatId"
          defaultValue={musteri?.sorumluAvukatId ?? ""}
        >
          <option value="">Atanmadı</option>
          {avukatlar.map((avukat) => (
            <option key={avukat.id} value={avukat.id}>
              {avukat.adSoyad}
            </option>
          ))}
        </Secim>
      </Alan>

      <Alan>
        <Etiket htmlFor="notlar">Notlar</Etiket>
        <MetinAlani id="notlar" name="notlar" rows={4} defaultValue={musteri?.notlar ?? ""} />
      </Alan>

      <GonderButonu>{gonderButonuMetni}</GonderButonu>
    </form>
  );
}
