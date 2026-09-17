import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { CMK_DOSYA_DURUMLARI } from "@/modules/cmk-dosyalari/lib/sabitler";
import type { cmkDosyasiGetir } from "@/modules/cmk-dosyalari/lib/queries";

type CMKDosyasi = Awaited<ReturnType<typeof cmkDosyasiGetir>>;

// datetime-local input'u "YYYY-MM-DDTHH:mm" bekler.
function datetimeLocalDegeri(tarih: Date | null | undefined): string {
  if (!tarih) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${tarih.getFullYear()}-${pad(tarih.getMonth() + 1)}-${pad(tarih.getDate())}T${pad(tarih.getHours())}:${pad(tarih.getMinutes())}`;
}

function tarihDegeri(tarih: Date | null | undefined): string {
  if (!tarih) return "";
  return tarih.toISOString().slice(0, 10);
}

// Yalnizca istenen alanlar - bkz. ARCHITECTURE.md "CMK Dosyalari". Musteri
// secilirse Ad Soyad/Telefon sunucu tarafinda otomatik doldurulur (bos
// birakilabilir); secilmezse Ad Soyad zorunludur (bkz. actions.ts).
export function CMKFormu({
  action,
  dosya,
  musteriler,
  birimOnerileri,
  gonderButonuMetni = "Kaydet",
}: {
  action: (formData: FormData) => void;
  dosya?: CMKDosyasi;
  musteriler: { id: string; adSoyadUnvan: string }[];
  birimOnerileri: string[];
  gonderButonuMetni?: string;
}) {
  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="musteriId">Müvekkil (varsa)</Etiket>
        <Secim id="musteriId" name="musteriId" defaultValue={dosya?.musteriId ?? ""}>
          <option value="">— Müvekkil fihristinde yok —</option>
          {musteriler.map((musteri) => (
            <option key={musteri.id} value={musteri.id}>
              {musteri.adSoyadUnvan}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="adSoyad">Ad Soyad</Etiket>
        <Girdi
          id="adSoyad"
          name="adSoyad"
          placeholder="Müvekkil seçilmediyse zorunlu"
          defaultValue={dosya?.adSoyad ?? ""}
        />
      </Alan>
      <Alan>
        <Etiket htmlFor="telefon">Telefon</Etiket>
        <Girdi id="telefon" name="telefon" type="tel" defaultValue={dosya?.telefon ?? ""} />
      </Alan>
      <div className="flex flex-col justify-end gap-2 pb-4">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            name="smsGonderilebilirMi"
            defaultChecked={dosya?.smsGonderilebilirMi ?? false}
            className="h-4 w-4 rounded [accent-color:var(--accent)]"
          />
          SMS gönderilebilir
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            name="cmkGorevlendirmeVarMi"
            defaultChecked={dosya?.cmkGorevlendirmeVarMi ?? true}
            className="h-4 w-4 rounded [accent-color:var(--accent)]"
          />
          CMK görevlendirmesi var
        </label>
      </div>

      <Alan>
        <Etiket htmlFor="suc">Suç</Etiket>
        <Girdi
          id="suc"
          name="suc"
          required
          placeholder="ör. Bina İçi Hırsızlık"
          defaultValue={dosya?.suc ?? ""}
        />
      </Alan>
      <Alan>
        <Etiket htmlFor="birim">Birim</Etiket>
        <Girdi
          id="birim"
          name="birim"
          required
          list="birim-onerileri"
          placeholder="ör. AND 86 ASCM"
          defaultValue={dosya?.birim ?? ""}
        />
        <datalist id="birim-onerileri">
          {birimOnerileri.map((birim) => (
            <option key={birim} value={birim} />
          ))}
        </datalist>
      </Alan>
      <Alan>
        <Etiket htmlFor="dosyaNo">Dosya No</Etiket>
        <Girdi id="dosyaNo" name="dosyaNo" required placeholder="ör. 2026/404" defaultValue={dosya?.dosyaNo ?? ""} />
      </Alan>
      <Alan>
        <Etiket htmlFor="dosyaDurumu">Dosya Durumu</Etiket>
        <Secim id="dosyaDurumu" name="dosyaDurumu" required defaultValue={dosya?.dosyaDurumu ?? ""}>
          <option value="" disabled>
            Seçiniz…
          </option>
          {CMK_DOSYA_DURUMLARI.map((s) => (
            <option key={s.deger} value={s.deger}>
              {s.etiket}
            </option>
          ))}
        </Secim>
      </Alan>

      <Alan>
        <Etiket htmlFor="durusmaTarihi">Duruşma Tarihi</Etiket>
        <Girdi
          id="durusmaTarihi"
          name="durusmaTarihi"
          type="datetime-local"
          defaultValue={datetimeLocalDegeri(dosya?.durusmaTarihi)}
        />
      </Alan>
      <Alan>
        <Etiket htmlFor="sonrakiKontrolTarihi">Sonraki Kontrol Tarihi</Etiket>
        <Girdi
          id="sonrakiKontrolTarihi"
          name="sonrakiKontrolTarihi"
          type="date"
          defaultValue={tarihDegeri(dosya?.sonrakiKontrolTarihi)}
        />
      </Alan>
      <Alan>
        <Etiket htmlFor="hukum">Hüküm</Etiket>
        <Girdi id="hukum" name="hukum" placeholder="ör. Beraat" defaultValue={dosya?.hukum ?? ""} />
      </Alan>
      <Alan>
        <Etiket htmlFor="cezaMiktari">Ceza Miktarı</Etiket>
        <Girdi
          id="cezaMiktari"
          name="cezaMiktari"
          placeholder="ör. 5 Yıl 2 Ay Hapis"
          defaultValue={dosya?.cezaMiktari ?? ""}
        />
      </Alan>

      <div className="col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="notlar">Notlar</Etiket>
          <MetinAlani id="notlar" name="notlar" rows={2} defaultValue={dosya?.notlar ?? ""} />
        </Alan>
      </div>
      <div className="col-span-2 md:col-span-4">
        <GonderButonu>{gonderButonuMetni}</GonderButonu>
      </div>
    </form>
  );
}
