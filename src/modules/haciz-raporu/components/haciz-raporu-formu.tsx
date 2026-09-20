import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { hacizRaporuOlustur } from "@/modules/haciz-raporu/lib/actions";
import { IcraDosyasiSecici } from "./icra-dosyasi-secici";

export async function HacizRaporuFormu() {
  const [muhafazaSecenekleri, istihkakSecenekleri, kiymetTakdiriSecenekleri] = await Promise.all([
    secenekleriGetir("haciz_muhafaza_durumu"),
    secenekleriGetir("haciz_istihkak_durumu"),
    secenekleriGetir("haciz_kiymet_takdiri_durumu"),
  ]);

  return (
    <form action={hacizRaporuOlustur} className="max-w-xl">
      <IcraDosyasiSecici />

      <Alan>
        <Etiket htmlFor="hacizTarihi">Haciz Tarihi</Etiket>
        <Girdi id="hacizTarihi" name="hacizTarihi" type="date" required />
      </Alan>

      <Alan>
        <Etiket htmlFor="islemYapan">İşlem Yapan</Etiket>
        <Girdi id="islemYapan" name="islemYapan" placeholder="Ad Soyad" />
      </Alan>

      <Alan>
        <Etiket htmlFor="irtibatNumarasi">İrtibat Numarası</Etiket>
        <Girdi id="irtibatNumarasi" name="irtibatNumarasi" type="tel" placeholder="05xx xxx xx xx" />
      </Alan>

      <Alan>
        <Etiket htmlFor="muhafazaId">Muhafaza</Etiket>
        <Secim id="muhafazaId" name="muhafazaId" defaultValue="">
          <option value="">Seçiniz…</option>
          {muhafazaSecenekleri.map((s) => (
            <option key={s.id} value={s.id}>
              {s.etiket}
            </option>
          ))}
        </Secim>
      </Alan>

      <Alan>
        <Etiket htmlFor="istihkakId">İstihkak</Etiket>
        <Secim id="istihkakId" name="istihkakId" defaultValue="">
          <option value="">Seçiniz…</option>
          {istihkakSecenekleri.map((s) => (
            <option key={s.id} value={s.id}>
              {s.etiket}
            </option>
          ))}
        </Secim>
      </Alan>

      <Alan>
        <Etiket htmlFor="kiymetTakdiriId">Kıymet Takdiri</Etiket>
        <Secim id="kiymetTakdiriId" name="kiymetTakdiriId" defaultValue="">
          <option value="">Seçiniz…</option>
          {kiymetTakdiriSecenekleri.map((s) => (
            <option key={s.id} value={s.id}>
              {s.etiket}
            </option>
          ))}
        </Secim>
      </Alan>

      <GonderButonu>Kaydet</GonderButonu>
    </form>
  );
}
