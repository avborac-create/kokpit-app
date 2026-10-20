"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { MUVEKKILE_ODEME } from "@/modules/dava-dosyasi/lib/tasnif-sabitleri";
import type { DosyaSecenegi } from "@/modules/dava-dosyasi/components/ekonomi/formlar";

type Satir = { anahtar: number };
const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// TOPLU TASNIF: para trafigindeki bir parayi tek seferde birden fazla dosya ve hesaba boler.
// Her satir: hedef (bir cari hesap ya da "Muvekkile Odeme") + dosya + tutar + aciklama
// ("neye mahsup edildi"). Toplam, kaynaktaki bakiyeyi asamaz.
export function TopluTasnifFormu({
  action,
  hedefler,
  dosyalar,
  sabitDosyaId,
  kaynaklar,
  mevcutBakiye,
}: {
  action: (formData: FormData) => void;
  hedefler: { id: string; etiket: string }[];
  dosyalar: DosyaSecenegi[];
  sabitDosyaId?: string;
  // Dosya ekraninda: para muvekkil havuzundan mi, dosyanin kendi bakiyesinden mi
  kaynaklar?: { deger: string; etiket: string; bakiye: number }[];
  mevcutBakiye: number;
}) {
  const [satirlar, setSatirlar] = useState<Satir[]>([{ anahtar: 1 }, { anahtar: 2 }]);
  const [tutarlar, setTutarlar] = useState<Record<number, number>>({});
  const [kaynak, setKaynak] = useState(kaynaklar?.[0]?.deger ?? "havuz");
  const toplam = satirlar.reduce((t, s) => t + (tutarlar[s.anahtar] ?? 0), 0);
  const kullanilabilir = kaynaklar ? (kaynaklar.find((k) => k.deger === kaynak)?.bakiye ?? 0) : mevcutBakiye;
  const asildi = toplam > kullanilabilir + 0.001;
  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass rounded-2xl p-4">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kaynaklar && (
          <Alan>
            <Etiket htmlFor="tt-kaynak">Para Nereden</Etiket>
            <Secim id="tt-kaynak" name="kaynak" value={kaynak} onChange={(e) => setKaynak(e.target.value)}>
              {kaynaklar.map((k) => (
                <option key={k.deger} value={k.deger}>
                  {k.etiket}
                </option>
              ))}
            </Secim>
          </Alan>
        )}
        <Alan>
          <Etiket htmlFor="tt-tarih">Tarih</Etiket>
          <Girdi id="tt-tarih" name="tarih" type="date" required defaultValue={bugun} />
        </Alan>
      </div>

      <div className="space-y-2">
        {satirlar.map((s, i) => (
          <div key={s.anahtar} className="flex flex-wrap items-end gap-2">
            <div className="w-52">
              {i === 0 && <Etiket>Hedef</Etiket>}
              <Secim name="hedefHesapId" required defaultValue="">
                <option value="" disabled>
                  Seçiniz…
                </option>
                {hedefler.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.etiket}
                  </option>
                ))}
                <option value={MUVEKKILE_ODEME}>➜ Müvekkile Ödeme</option>
              </Secim>
            </div>
            {sabitDosyaId ? (
              <input type="hidden" name="dosyaId" value={sabitDosyaId} />
            ) : (
              <div className="w-56">
                {i === 0 && <Etiket>Dosya</Etiket>}
                <Secim name="dosyaId" required defaultValue="">
                  <option value="" disabled>
                    Seçiniz…
                  </option>
                  {dosyalar.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.etiket}
                    </option>
                  ))}
                </Secim>
              </div>
            )}
            <div className="w-40">
              {i === 0 && <Etiket>Tutar</Etiket>}
              <ParaGirdisi
                name="tutar"
                required
                onDegerDegisti={(v) => setTutarlar((onceki) => ({ ...onceki, [s.anahtar]: Number(v) || 0 }))}
              />
            </div>
            <div className="min-w-48 flex-1">
              {i === 0 && <Etiket>Neye mahsup / açıklama</Etiket>}
              <Girdi name="satirAciklama" placeholder="ör. masraf iadesi, vekalet ücreti kesintisi" />
            </div>
            {satirlar.length > 1 && (
              <button
                type="button"
                onClick={() => setSatirlar((onceki) => onceki.filter((x) => x.anahtar !== s.anahtar))}
                className="mb-1 rounded-full px-2 text-lg text-[#ff7a70] hover:bg-white/10"
                title="Satırı kaldır"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setSatirlar((onceki) => [...onceki, { anahtar: Math.max(...onceki.map((x) => x.anahtar)) + 1 }])}
          className="text-xs text-[#6db8ff] hover:underline"
        >
          + Satır ekle
        </button>
        <span className="text-sm text-white/70">
          Tasnif toplamı: <b className={asildi ? "text-[#ff7a70]" : "text-white"}>{para.format(toplam)}</b> / kullanılabilir{" "}
          <b className="text-white">{para.format(kullanilabilir)}</b>
          {asildi && <span className="ml-2 text-xs text-[#ff7a70]">kaynaktaki bakiyeyi aşıyor</span>}
        </span>
        <GonderButonu>Tasnif Et</GonderButonu>
      </div>
    </form>
  );
}
