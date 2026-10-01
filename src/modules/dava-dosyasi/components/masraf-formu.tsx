import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { MasrafTuruTutarAlani } from "@/modules/dava-dosyasi/components/masraf-turu-tutar-alani";

export type MasrafDuzenlemeVerisi = {
  tarih: string;
  cariKodId: string;
  turId: string;
  tutar: number;
  aciklama: string;
  yansitmaHedefi?: "MUVEKKIL" | "BURO" | "BORCLU";
};

const YANSITMA_SECENEKLERI = [
  { deger: "MUVEKKIL", etiket: "Müvekkile" },
  { deger: "BURO", etiket: "Büroya" },
  { deger: "BORCLU", etiket: "Borçluya" },
] as const;

export async function MasrafFormu({
  action,
  duzenlemeVerisi,
}: {
  action: (formData: FormData) => void;
  duzenlemeVerisi?: MasrafDuzenlemeVerisi;
}) {
  const [cariKodlar, turler] = await Promise.all([
    secenekleriGetir("cari_kod"),
    secenekleriGetir("masraf_turu"),
  ]);

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="tarih">Tarih</Etiket>
        <Girdi id="tarih" name="tarih" type="date" required defaultValue={duzenlemeVerisi?.tarih ?? bugun} />
      </Alan>
      <Alan>
        <Etiket htmlFor="cariKodId">Cari Kod</Etiket>
        <Secim id="cariKodId" name="cariKodId" required defaultValue={duzenlemeVerisi?.cariKodId ?? ""}>
          <option value="" disabled>
            Seçiniz…
          </option>
          {cariKodlar.map((kod) => (
            <option key={kod.id} value={kod.id}>
              {kod.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <MasrafTuruTutarAlani
        turler={turler}
        defaultTurId={duzenlemeVerisi?.turId}
        defaultTutar={duzenlemeVerisi?.tutar}
      />
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <Etiket>Masraf Kime Yansıtılsın?</Etiket>
        <div className="flex flex-wrap gap-2">
          {YANSITMA_SECENEKLERI.map((secenek) => (
            <label key={secenek.deger} className="cursor-pointer">
              <input
                type="radio"
                name="yansitmaHedefi"
                value={secenek.deger}
                defaultChecked={(duzenlemeVerisi?.yansitmaHedefi ?? "MUVEKKIL") === secenek.deger}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/60 transition-colors peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent-soft)] peer-checked:text-[#6db8ff] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]">
                {secenek.etiket}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-white/35">
          Yalnızca &quot;Müvekkile&quot; yansıtılan masraflar müvekkil cari hesabından düşer. Büro ustlenirse ya da
          borçludan tahsil edilecekse müvekkil bakiyesini etkilemez.
        </p>
      </div>
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="aciklama">Açıklama</Etiket>
          <MetinAlani id="aciklama" name="aciklama" rows={2} required defaultValue={duzenlemeVerisi?.aciklama ?? ""} />
        </Alan>
      </div>
      <div className="col-span-1 sm:col-span-2 md:col-span-4">
        <GonderButonu>{duzenlemeVerisi ? "Masrafı Güncelle" : "Masraf Ekle"}</GonderButonu>
      </div>
    </form>
  );
}
