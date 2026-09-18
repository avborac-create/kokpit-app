import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";

type SecenekOgesi = { id: string; etiket: string };
type Avukat = { id: string; adSoyad: string };

// Avukat Sapkasi'na "+ Yeni Is" ile yeni bir HukukiMudahale eklemek icin -
// yalnizca zorunlu olan baslik disinda hepsi opsiyonel (bkz.
// ARCHITECTURE.md "Gerekli Minimum Alanlar").
export function HukukiMudahaleFormu({
  action,
  mudahaleTurleri,
  oncelikler,
  avukatlar,
  varsayilanBaslik,
  varsayilanMudahaleTuruId,
  varsayilanOncelikId,
}: {
  action: (formData: FormData) => void;
  mudahaleTurleri: SecenekOgesi[];
  oncelikler: SecenekOgesi[];
  avukatlar: Avukat[];
  varsayilanBaslik?: string;
  varsayilanMudahaleTuruId?: string;
  varsayilanOncelikId?: string;
}) {
  return (
    <form action={action} className="glass mb-3 grid grid-cols-1 gap-3 rounded-xl p-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Alan>
          <Etiket htmlFor="baslik">Müdahale Başlığı</Etiket>
          <Girdi
            id="baslik"
            name="baslik"
            required
            placeholder="ör. İstinaf dilekçesini hazırla"
            defaultValue={varsayilanBaslik}
          />
        </Alan>
      </div>
      <Alan>
        <Etiket htmlFor="mudahaleTuruId">Müdahale Türü (opsiyonel)</Etiket>
        <Secim id="mudahaleTuruId" name="mudahaleTuruId" defaultValue={varsayilanMudahaleTuruId ?? ""}>
          <option value="">— Seçilmedi —</option>
          {mudahaleTurleri.map((t) => (
            <option key={t.id} value={t.id}>
              {t.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="oncelikId">Öncelik</Etiket>
        <Secim id="oncelikId" name="oncelikId" defaultValue={varsayilanOncelikId ?? ""}>
          <option value="">— Seçilmedi —</option>
          {oncelikler.map((o) => (
            <option key={o.id} value={o.id}>
              {o.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="sorumluAvukatId">Sorumlu Avukat</Etiket>
        <Secim id="sorumluAvukatId" name="sorumluAvukatId" defaultValue="">
          <option value="">— Seçilmedi —</option>
          {avukatlar.map((a) => (
            <option key={a.id} value={a.id}>
              {a.adSoyad}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="sonTarih">Son Tarih</Etiket>
        <Girdi id="sonTarih" name="sonTarih" type="date" />
      </Alan>
      <div className="sm:col-span-2">
        <Alan>
          <Etiket htmlFor="aciklama">Açıklama (opsiyonel)</Etiket>
          <MetinAlani id="aciklama" name="aciklama" rows={2} />
        </Alan>
      </div>
      <div className="sm:col-span-2">
        <GonderButonu bekleyenMetin="Ekleniyor…">Ekle</GonderButonu>
      </div>
    </form>
  );
}
