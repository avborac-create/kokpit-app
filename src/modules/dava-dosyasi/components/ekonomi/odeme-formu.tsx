"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { SecenekDuzenleyiciPenceresi } from "@/core/secenek/secenek-duzenleyici-penceresi";
import type { DosyaSecenegi } from "@/modules/dava-dosyasi/components/ekonomi/formlar";

type Yontem = { id: string; etiket: string };
type Satir = { anahtar: number; yontemId: string };

const PARCALI = "__parcali__";
const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// Para geldi: Para Trafigi'ne ALACAK.
//  - "Odeme sekli": Nakit / Banka / (admin'in ekledigi diger yontemler) ya da
//  - "Parcali odeme": istenen sayida satir (yontem + tutar) - her satir ayri kayit olur.
// Muvekkil ekraninda dosya bos birakilabilir (muvekkil havuzu).
export function OdemeFormu({
  action,
  dosyalar,
  sabitDosyaId,
  yontemler,
  yontemListesi,
  hedefler,
  sabitHedefId,
}: {
  action: (formData: FormData) => void;
  dosyalar: DosyaSecenegi[];
  sabitDosyaId?: string;
  yontemler: Yontem[];
  // Odeme ayni anda bir cari hesaba virman edilebilsin (ayri virman yapmaya gerek kalmaz).
  hedefler?: { id: string; etiket: string }[];
  // Hesabin kendi sekmesinden girilirken hedef sabittir (dosya secimi zorunlu).
  sabitHedefId?: string;
  // Sadece yonetici: yontem listesini yerinde duzenleme penceresi
  yontemListesi?: {
    id: string;
    degerler: { id: string; kod: string; etiket: string; aktifMi: boolean; maktuTutar: number | null }[];
  };
}) {
  const [sekil, setSekil] = useState<string>(yontemler[0]?.id ?? PARCALI);
  const [satirlar, setSatirlar] = useState<Satir[]>([
    { anahtar: 1, yontemId: yontemler[0]?.id ?? "" },
    { anahtar: 2, yontemId: yontemler[1]?.id ?? yontemler[0]?.id ?? "" },
  ]);
  const [tutarlar, setTutarlar] = useState<Record<number, number>>({});
  const parcaliMi = sekil === PARCALI;
  const toplam = satirlar.reduce((t, s) => t + (tutarlar[s.anahtar] ?? 0), 0);
  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      {sabitHedefId && <input type="hidden" name="hedefHesapId" value={sabitHedefId} />}
      {sabitDosyaId ? (
        <input type="hidden" name="dosyaId" value={sabitDosyaId} />
      ) : (
        <Alan>
          <Etiket htmlFor="od-dosya">Dosya</Etiket>
          <Secim id="od-dosya" name="dosyaId" defaultValue="" required={Boolean(sabitHedefId)}>
            <option value="">{sabitHedefId ? "Dosya seçin" : "Dosyasız (müvekkil havuzu)"}</option>
            {dosyalar.map((d) => (
              <option key={d.id} value={d.id}>
                {d.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      )}
      <Alan>
        <Etiket htmlFor="od-tarih">Tarih</Etiket>
        <Girdi id="od-tarih" name="tarih" type="date" required defaultValue={bugun} />
      </Alan>
      <Alan>
        <div className="flex items-center justify-between gap-2">
          <Etiket htmlFor="od-sekil">Ödeme Şekli</Etiket>
          {yontemListesi && (
            <SecenekDuzenleyiciPenceresi listeId={yontemListesi.id} baslik="Ödeme Yöntemi" degerler={yontemListesi.degerler} />
          )}
        </div>
        <Secim id="od-sekil" value={sekil} onChange={(e) => setSekil(e.target.value)}>
          {yontemler.map((y) => (
            <option key={y.id} value={y.id}>
              {y.etiket}
            </option>
          ))}
          <option value={PARCALI}>Parçalı ödeme (birden fazla yöntem)</option>
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="od-kaynak">Para Kimden Geldi</Etiket>
        <Secim id="od-kaynak" name="paraKaynagi" defaultValue="muvekkil">
          <option value="muvekkil">Müvekkilden</option>
          <option value="borclu">Borçludan (karşı taraftan tahsilat)</option>
        </Secim>
      </Alan>
      {!sabitHedefId && hedefler && hedefler.length > 0 && (
        <Alan>
          <Etiket htmlFor="od-hedef">Ödemeyi Hemen Şu Hesaba Aktar</Etiket>
          <Secim id="od-hedef" name="hedefHesapId" defaultValue="">
            <option value="">Aktarma — Para Trafiğinde beklesin</option>
            {hedefler.map((h) => (
              <option key={h.id} value={h.id}>
                {h.etiket}
              </option>
            ))}
          </Secim>
          <p className="mt-1 text-[11px] text-white/40">Hesap seçerseniz dosya da seçmelisiniz; ayrıca virman yapmanız gerekmez.</p>
        </Alan>
      )}
      <Alan>
        <Etiket htmlFor="od-aciklama">Açıklama</Etiket>
        <Girdi id="od-aciklama" name="aciklama" defaultValue="GELEN ÖDEME" />
      </Alan>

      {parcaliMi ? (
        <div className="col-span-1 sm:col-span-2 md:col-span-4">
          <p className="mb-2 text-sm text-white/60">
            Her satıra ödeme yöntemini ve o yöntemle alınan tutarı girin (ör. bir kısmı nakit, bir kısmı banka).
          </p>
          <div className="space-y-2">
            {satirlar.map((s, i) => (
              <div key={s.anahtar} className="flex flex-wrap items-end gap-2">
                <div className="w-48">
                  {i === 0 && <Etiket>Yöntem</Etiket>}
                  <Secim
                    name="yontemId"
                    value={s.yontemId}
                    onChange={(e) =>
                      setSatirlar((onceki) => onceki.map((x) => (x.anahtar === s.anahtar ? { ...x, yontemId: e.target.value } : x)))
                    }
                  >
                    {yontemler.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.etiket}
                      </option>
                    ))}
                  </Secim>
                </div>
                <div className="w-48">
                  {i === 0 && <Etiket>Tutar</Etiket>}
                  <ParaGirdisi
                    name="tutar"
                    required
                    onDegerDegisti={(v) => setTutarlar((onceki) => ({ ...onceki, [s.anahtar]: Number(v) || 0 }))}
                  />
                </div>
                {satirlar.length > 2 && (
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
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() =>
                setSatirlar((onceki) => [
                  ...onceki,
                  { anahtar: Math.max(...onceki.map((x) => x.anahtar)) + 1, yontemId: yontemler[0]?.id ?? "" },
                ])
              }
              className="text-xs text-[#6db8ff] hover:underline"
            >
              + Yöntem satırı ekle
            </button>
            <span className="text-sm text-white/70">
              Toplam: <b className="text-white">{para.format(toplam)}</b>
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Tek yontem: secilen yontem gizli alanla gonderilir */}
          <input type="hidden" name="yontemId" value={sekil} />
          <Alan>
            <Etiket htmlFor="od-tutar">Tutar</Etiket>
            <ParaGirdisi key="tek" id="od-tutar" name="tutar" required />
          </Alan>
        </>
      )}

      <div className="flex items-end">
        <GonderButonu>{sabitHedefId ? "Ödemeyi Bu Hesaba İşle" : "Ödemeyi Ekle"}</GonderButonu>
      </div>
    </form>
  );
}
