import { Alan, Etiket, Girdi, MetinAlani } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";

export function IrtibatKisisiFormu({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      <Alan>
        <Etiket htmlFor="adSoyad">Ad Soyad</Etiket>
        <Girdi id="adSoyad" name="adSoyad" required />
      </Alan>
      <Alan>
        <Etiket htmlFor="unvanGorev">Unvan / Görev</Etiket>
        <Girdi id="unvanGorev" name="unvanGorev" placeholder="Genel Müdür, Muhasebe vb." />
      </Alan>
      <Alan>
        <Etiket htmlFor="telefon">Telefon</Etiket>
        <Girdi id="telefon" name="telefon" type="tel" />
      </Alan>
      <Alan>
        <Etiket htmlFor="eposta">E-posta</Etiket>
        <Girdi id="eposta" name="eposta" type="email" />
      </Alan>
      <div className="col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="konuBasligi">Hangi Konularda İrtibat Kurulmalı</Etiket>
          <Girdi
            id="konuBasligi"
            name="konuBasligi"
            placeholder="Sözleşme onayları, fatura/tahsilat vb."
          />
        </Alan>
      </div>
      <div className="col-span-2 md:col-span-4">
        <Alan>
          <Etiket htmlFor="notlar">Notlar</Etiket>
          <MetinAlani id="notlar" name="notlar" rows={2} />
        </Alan>
      </div>
      <div className="col-span-2 flex items-center gap-2 md:col-span-4">
        <input
          type="checkbox"
          id="birincilMi"
          name="birincilMi"
          className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--accent)]"
        />
        <label htmlFor="birincilMi" className="text-sm text-white/70">
          Birincil (ilk) irtibat kişisi
        </label>
      </div>
      <div className="col-span-2 md:col-span-4">
        <GonderButonu>Kişiyi Ekle</GonderButonu>
      </div>
    </form>
  );
}
