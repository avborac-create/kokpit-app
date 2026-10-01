import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { GonderButonu } from "@/core/ui/gonder-butonu";

type Hedef = {
  id: string;
  kayitNo: number;
  buroNo: string | null;
  dosyaNo: string | null;
  birimAdi: string | null;
  bakiye: number;
};

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export function dosyaEtiketi(d: { kayitNo: number; buroNo: string | null; dosyaNo: string | null; birimAdi?: string | null }) {
  const parcalar = [
    d.buroNo ? `Büro ${d.buroNo}` : `KP-${String(d.kayitNo).padStart(4, "0")}`,
    d.birimAdi,
    d.dosyaNo,
  ].filter(Boolean);
  return parcalar.join(" · ");
}

// Ayni muvekkilin iki dosyasi arasinda avans aktarimi. Bu dosya KAYNAK
// olarak sabittir; para hedef dosyanin cari hesabina gecer (bkz.
// DosyaAvansAktarimi). Ters yonde (baska bir dosyadan bu dosyaya) aktarim
// icin o dosyanin sayfasindan ayni form kullanilir.
export function AvansAktarimFormu({
  action,
  hedefler,
  cariKodlar,
  kaynakBakiye,
}: {
  action: (formData: FormData) => void;
  hedefler: Hedef[];
  cariKodlar: { id: string; kod: string; etiket: string }[];
  kaynakBakiye: number;
}) {
  const bugun = new Date().toISOString().slice(0, 10);
  const varsayilanCariKod = cariKodlar.find((k) => k.kod === "masraf_hesabi")?.id ?? "";

  if (hedefler.length === 0) {
    return (
      <p className="text-sm text-white/40">
        Bu müvekkilin avans aktarılabilecek başka bir dosyası yok.
      </p>
    );
  }

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2">
      <div className="col-span-1 sm:col-span-2">
        <p className="text-sm text-white/60">
          Bu dosyadan aynı müvekkilin başka bir dosyasına avans aktarın. Bu dosyanın aktarılabilir bakiyesi:{" "}
          <span className={kaynakBakiye > 0 ? "font-medium text-[#32d74b]" : "font-medium text-[#ff7a70]"}>
            {paraFormatlayici.format(kaynakBakiye)}
          </span>
        </p>
      </div>
      <Alan>
        <Etiket htmlFor="av-hedef">Hedef Dosya (Aktarılan Dosya)</Etiket>
        <Secim id="av-hedef" name="hedefDosyaId" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {hedefler.map((h) => (
            <option key={h.id} value={h.id}>
              {dosyaEtiketi(h)} — bakiye {paraFormatlayici.format(h.bakiye)}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="av-cari">Cari Kod</Etiket>
        <Secim id="av-cari" name="cariKodId" required defaultValue={varsayilanCariKod}>
          {cariKodlar.map((k) => (
            <option key={k.id} value={k.id}>
              {k.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="av-tarih">Tarih</Etiket>
        <Girdi id="av-tarih" name="tarih" type="date" required defaultValue={bugun} />
      </Alan>
      <Alan>
        <Etiket htmlFor="av-tutar">Tutar</Etiket>
        <ParaGirdisi id="av-tutar" name="tutar" required />
      </Alan>
      <div className="col-span-1 sm:col-span-2">
        <Alan>
          <Etiket htmlFor="av-aciklama">Açıklama</Etiket>
          <MetinAlani
            id="av-aciklama"
            name="aciklama"
            rows={2}
            required
            placeholder="ör. Feragat edilen dosyanın harcanmamış avansı yeni açılan dosyaya aktarıldı"
          />
        </Alan>
      </div>
      <div className="col-span-1 sm:col-span-2">
        <GonderButonu>Avansı Aktar</GonderButonu>
      </div>
    </form>
  );
}
