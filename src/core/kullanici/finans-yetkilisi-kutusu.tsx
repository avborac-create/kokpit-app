"use client";

import { useState, useTransition } from "react";
import { OnayAdimi } from "@/core/ui/onay-adimi";
import { finansYetkilisiDegistir } from "./admin-actions";

// Kullanıcı panelinde "finans yetkilisi" işareti: işaretlenenler müvekkilden istenen para bildirimlerini alır.
export function FinansYetkilisiKutusu({ id, adSoyad, isaretli, degistirebilir }: { id: string; adSoyad: string; isaretli: boolean; degistirebilir: boolean }) {
  const [onayda, setOnayda] = useState(false);
  const [hata, setHata] = useState("");
  const [bekliyor, baslat] = useTransition();
  return (
    <div className="min-w-[8rem]">
      <label className="flex items-center gap-2 text-white/80">
        <input type="checkbox" className="onay-kutusu" checked={isaretli} disabled={!degistirebilir || bekliyor} onChange={() => setOnayda(true)} />
        {isaretli ? "Evet" : "—"}
      </label>
      {onayda && (
        <div className="mt-2">
          <OnayAdimi
            mesaj={isaretli ? `${adSoyad} finans yetkilisi olmaktan çıkarılacak.` : `${adSoyad} finans yetkilisi yapılacak.`}
            uyari="Müvekkilden istenen para bildirimleri bu kişiye gider (ya da gitmez). Onaylıyor musunuz?"
            bekliyor={bekliyor}
            onVazgec={() => setOnayda(false)}
            onOnay={() =>
              baslat(async () => {
                try {
                  await finansYetkilisiDegistir(id, !isaretli);
                  setOnayda(false);
                } catch (e) {
                  setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
                }
              })
            }
          />
          {hata && <p className="mt-1 text-xs text-red-300">{hata}</p>}
        </div>
      )}
    </div>
  );
}
