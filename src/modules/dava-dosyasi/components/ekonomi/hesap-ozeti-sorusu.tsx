"use client";

import { useState, useTransition } from "react";
import { hesapOzetiSonucuYaz } from "../../lib/hesap-ozeti-actions";
import { YOL_ADLARI } from "../../lib/hesap-ozeti-yollari";

type Kayit = { id: string; toplam: number; tarih: string };

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihi = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" });

// Daha önce oluşturulmuş ama "gönderildi mi?" sorusu cevaplanmamış hesap özetleri için uyarı.
export function HesapOzetiSorusu({ kayitlar }: { kayitlar: Kayit[] }) {
  const [cevaplanan, setCevaplanan] = useState<string[]>([]);
  const [hata, setHata] = useState("");
  const [yolSorulan, setYolSorulan] = useState<string | null>(null);
  const [, baslat] = useTransition();
  const gorunen = kayitlar.filter((k) => !cevaplanan.includes(k.id));
  if (gorunen.length === 0) return null;

  function cevapla(id: string, sonuc: "GONDERILDI" | "VAZGECILDI", yol?: string) {
    setHata("");
    baslat(async () => {
      try {
        await hesapOzetiSonucuYaz(id, sonuc, yol);
        setCevaplanan((l) => [...l, id]);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  return (
    <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
      <p className="mb-2 font-semibold text-amber-200">Daha önce oluşturulmuş hesap özeti var</p>
      <div className="space-y-3">
        {gorunen.map((k) => (
          <div key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-white/85">
              {tarihi.format(new Date(k.tarih))} tarihinde {para.format(k.toplam)} tutarında hesap özeti oluşturuldu.{" "}
              <strong>Müvekkile gönderdiniz mi?</strong>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setYolSorulan(k.id)} className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/35">
                Evet, gönderdim
              </button>
              <button type="button" onClick={() => cevapla(k.id, "VAZGECILDI")} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20">
                Göndermeyeceğim
              </button>
            </div>
            {yolSorulan === k.id && (
              <div className="flex w-full flex-wrap items-center gap-2 text-xs text-white/70">
                Hangi yoldan istendi?
                {Object.entries(YOL_ADLARI).map(([kod, ad]) => (
                  <button key={kod} type="button" onClick={() => cevapla(k.id, "GONDERILDI", kod)} className="rounded-full bg-emerald-500/25 px-3 py-1 font-medium text-emerald-200 hover:bg-emerald-500/35">
                    {ad}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/50">Henüz göndermediyseniz bu uyarı, siz cevaplayana kadar burada kalır.</p>
      {hata && <p className="mt-2 text-xs text-red-300">{hata}</p>}
    </div>
  );
}
