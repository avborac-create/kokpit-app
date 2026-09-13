"use client";

import { useTransition } from "react";
import type { Kullanici, GelistirmeTalebi, SecenekDegeri } from "@prisma/client";
import { gelistirmeTalebiDurumIlerlet, gelistirmeTalebiSil } from "@/core/gelistirme-kutusu/actions";
import { Dugme } from "@/core/ui/button";

type GelistirmeTalebiSatiriProps = {
  talep: GelistirmeTalebi & { kullanici: Kullanici; durum: SecenekDegeri };
};

const SONRAKI_DURUM_METNI: Record<string, string> = {
  beklemede: "Yapılıyor olarak işaretle",
  yapiliyor: "Tamamlandı olarak işaretle",
};

export function GelistirmeTalebiSatiri({ talep }: GelistirmeTalebiSatiriProps) {
  const [ilerletmePending, ilerlet] = useTransition();
  const [silmePending, sil] = useTransition();

  const tamamlandiMi = talep.durum.kod === "tamamlandi";
  const sonrakiMetin = SONRAKI_DURUM_METNI[talep.durum.kod];

  return (
    <div className={`glass rounded-2xl p-5 ${tamamlandiMi ? "opacity-60" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-white/60">
          <span className="font-medium text-white">{talep.kullanici.adSoyad}</span>
          <span className="mx-2 text-white/25">·</span>
          <span
            className={
              tamamlandiMi
                ? "text-emerald-400/80"
                : talep.durum.kod === "yapiliyor"
                  ? "text-amber-400/80"
                  : "text-white/50"
            }
          >
            {talep.durum.etiket}
          </span>
          <span className="mx-2 text-white/25">·</span>
          {new Date(talep.olusturmaTarihi).toLocaleString("tr-TR")}
        </div>
        <div className="flex gap-2">
          {sonrakiMetin && (
            <Dugme
              type="button"
              varyant="ikincil"
              disabled={ilerletmePending}
              onClick={() => ilerlet(() => gelistirmeTalebiDurumIlerlet(talep.id, talep.durum.kod))}
            >
              {sonrakiMetin}
            </Dugme>
          )}
          <Dugme
            type="button"
            varyant="tehlike"
            disabled={silmePending}
            onClick={() => {
              if (window.confirm("Bu talep silinsin mi?")) {
                sil(() => gelistirmeTalebiSil(talep.id));
              }
            }}
          >
            Sil
          </Dugme>
        </div>
      </div>
      <p className="text-sm text-white/85 whitespace-pre-wrap">{talep.metin}</p>
    </div>
  );
}
