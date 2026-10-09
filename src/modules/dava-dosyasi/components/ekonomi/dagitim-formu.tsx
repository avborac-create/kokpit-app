"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { ParaGirdisi } from "@/core/ui/para-girdisi";

type Giris = { id: string; etiket: string; kalan: number };
type Kod = { id: string; etiket: string };

// Havuzdaki bir para girisinden (kismen de olabilir) bir cari kodun ALACAK
// hanesine aktarim. Giris secilince tutar otomatik kalanla dolar.
export function DagitimFormu({
  action,
  girisler,
  cariKodlar,
  varsayilanKodId,
}: {
  action: (formData: FormData) => void;
  girisler: Giris[];
  cariKodlar: Kod[];
  varsayilanKodId?: string;
}) {
  const bekleyenler = girisler.filter((g) => g.kalan > 0);
  const [girisId, setGirisId] = useState(bekleyenler[0]?.id ?? "");
  const kalan = bekleyenler.find((g) => g.id === girisId)?.kalan ?? 0;

  if (bekleyenler.length === 0) {
    return (
      <p className="text-sm text-white/45">
        Havuzda dağıtılacak para yok. Önce “Havuz” menüsünden para girişi yapın.
      </p>
    );
  }

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-5">
      <Alan>
        <Etiket htmlFor="dg-giris">Havuzdaki Para</Etiket>
        <Secim id="dg-giris" name="paraGirisiId" required value={girisId} onChange={(e) => setGirisId(e.target.value)}>
          {bekleyenler.map((g) => (
            <option key={g.id} value={g.id}>
              {g.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="dg-kod">Cari Kod</Etiket>
        <Secim id="dg-kod" name="cariKodId" required defaultValue={varsayilanKodId ?? ""}>
          <option value="" disabled>
            Seçiniz…
          </option>
          {cariKodlar.map((k) => (
            <option key={k.id} value={k.id}>
              {k.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="dg-tutar">Aktarılacak Tutar</Etiket>
        <ParaGirdisi key={girisId} id="dg-tutar" name="tutar" required defaultValue={kalan} />
      </Alan>
      <Alan>
        <Etiket htmlFor="dg-tarih">Tarih</Etiket>
        <Girdi id="dg-tarih" name="tarih" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </Alan>
      <div className="flex items-end">
        <GonderButonu>Aktar</GonderButonu>
      </div>
    </form>
  );
}
