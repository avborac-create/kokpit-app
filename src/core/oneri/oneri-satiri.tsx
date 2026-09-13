"use client";

import { useTransition } from "react";
import type { Kullanici, Oneri } from "@prisma/client";
import { oneriIslendiIsaretle, oneriSil } from "@/core/oneri/actions";
import { Dugme } from "@/core/ui/button";

type OneriSatiriProps = {
  oneri: Oneri & { kullanici: Kullanici };
};

export function OneriSatiri({ oneri }: OneriSatiriProps) {
  const [isaretlemePending, isaretle] = useTransition();
  const [silmePending, sil] = useTransition();

  return (
    <div className={`glass rounded-2xl p-5 ${oneri.islendiMi ? "opacity-60" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-white/60">
          <span className="font-medium text-white">{oneri.kullanici.adSoyad}</span>
          <span className="mx-2 text-white/25">·</span>
          {oneri.sayfaYolu}
          <span className="mx-2 text-white/25">·</span>
          {new Date(oneri.olusturmaTarihi).toLocaleString("tr-TR")}
        </div>
        <div className="flex gap-2">
          {!oneri.islendiMi && (
            <Dugme
              type="button"
              varyant="ikincil"
              disabled={isaretlemePending}
              onClick={() => isaretle(() => oneriIslendiIsaretle(oneri.id))}
            >
              İşlendi olarak işaretle
            </Dugme>
          )}
          <Dugme
            type="button"
            varyant="tehlike"
            disabled={silmePending}
            onClick={() => {
              if (window.confirm("Bu öneri silinsin mi?")) {
                sil(() => oneriSil(oneri.id));
              }
            }}
          >
            Sil
          </Dugme>
        </div>
      </div>
      <p className="mb-3 text-sm text-white/85 whitespace-pre-wrap">{oneri.metin}</p>
      {oneri.gorselVeri && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={oneri.gorselVeri}
          alt="Önerilen bölge"
          className="max-h-64 rounded-lg border border-white/10 object-contain"
        />
      )}
    </div>
  );
}
