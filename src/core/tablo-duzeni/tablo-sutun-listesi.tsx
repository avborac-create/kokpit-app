"use client";

import { SiralanabilirListe, type SiralanabilirOge } from "@/core/ui/siralanabilir-liste";
import { sutunlariYenidenSirala, sutunGorunurlukDegistir } from "@/core/tablo-duzeni/actions";

export type TabloSutunSatiri = { anahtar: string; etiket: string; gizliMi: boolean; gizlenebilirMi: boolean };

export function TabloSutunListesi({
  tabloAnahtari,
  ogeler,
}: {
  tabloAnahtari: string;
  ogeler: TabloSutunSatiri[];
}) {
  const listeOgeleri: SiralanabilirOge[] = ogeler.map((o) => ({
    anahtar: o.anahtar,
    etiket: o.etiket,
    gizliMi: o.gizliMi,
    sabitMi: !o.gizlenebilirMi,
    sabitRozetMetni: "Zorunlu",
  }));

  return (
    <SiralanabilirListe
      ogeler={listeOgeleri}
      onSirala={(anahtarlar) => sutunlariYenidenSirala(tabloAnahtari, anahtarlar)}
      onGorunurlukDegistir={(anahtar, gizliMi) => sutunGorunurlukDegistir(tabloAnahtari, anahtar, gizliMi)}
    />
  );
}
