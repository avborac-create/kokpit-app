"use client";

import { useState, useTransition } from "react";
import { uyariGorevOlustur, uyariTakvimeAktar } from "./actions";

// Her uyarının altına konabilen ortak eylem satırı:
//  - Takvime aktar: seçilen güne takvim öğesi yazar
//  - Görev oluştur: Görevler paneline (isteğe bağlı vadeli) görev açar
//  - Belli tarihe kadar beklet (onErtele verilirse): uyarıyı o güne kadar gizler ve takvime de yazar
export function UyariEylemleri({
  baslik,
  aciklama,
  onErtele,
}: {
  baslik: string;
  aciklama: string;
  onErtele?: (tarih: string) => Promise<void>;
}) {
  const [acik, setAcik] = useState<"takvim" | "gorev" | "beklet" | null>(null);
  const [tarih, setTarih] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [, baslat] = useTransition();

  function calistir(is: () => Promise<void>, tamam: string) {
    setMesaj("");
    baslat(async () => {
      try {
        await is();
        setMesaj(tamam);
        setAcik(null);
      } catch (e) {
        setMesaj(e instanceof Error ? e.message : "Yapılamadı.");
      }
    });
  }

  const dugme = "rounded-full bg-white/10 px-3 py-1 text-xs text-white/75 hover:bg-white/20";
  return (
    <div className="flex w-full flex-wrap items-center gap-2 text-xs text-white/70">
      <button type="button" className={dugme} onClick={() => setAcik("takvim")}>
        Takvime aktar
      </button>
      <button type="button" className={dugme} onClick={() => setAcik("gorev")}>
        Görev oluştur
      </button>
      {onErtele && (
        <button type="button" className={dugme} onClick={() => setAcik("beklet")}>
          Belli tarihe kadar beklet
        </button>
      )}
      {acik && (
        <span className="flex flex-wrap items-center gap-2">
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="rounded-lg border border-white/20 bg-white/[0.06] px-2 py-1 text-xs text-white [color-scheme:dark]" />
          <button
            type="button"
            className="rounded-full bg-[var(--accent)] px-3 py-1 font-medium text-white"
            onClick={() => {
              if (acik !== "gorev" && !tarih) return setMesaj("Önce bir tarih seçin.");
              if (acik === "takvim") calistir(() => uyariTakvimeAktar(baslik, tarih, aciklama), "Takvime yazıldı");
              else if (acik === "gorev") calistir(() => uyariGorevOlustur(baslik, aciklama, tarih || undefined), "Görev oluşturuldu");
              else calistir(async () => {
                await uyariTakvimeAktar(baslik, tarih, aciklama);
                await onErtele!(tarih);
              }, "Seçilen güne kadar bekletilecek, takvime de yazıldı");
            }}
          >
            Tamam
          </button>
          <button type="button" className="text-white/50 hover:text-white" onClick={() => setAcik(null)}>
            Vazgeç
          </button>
        </span>
      )}
      {mesaj && <span className="text-emerald-300">{mesaj}</span>}
    </div>
  );
}
