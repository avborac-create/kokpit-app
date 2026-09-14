"use client";

import { SiralanabilirListe, type SiralanabilirOge } from "@/core/ui/siralanabilir-liste";
import { menuYenidenSirala, menuGorunurlukDegistir } from "@/core/menu/actions";

export type MenuOgesiSatiri = { anahtar: string; ad: string; gizliMi: boolean; sabitMi: boolean };

export function MenuDuzeniListesi({ ogeler }: { ogeler: MenuOgesiSatiri[] }) {
  const listeOgeleri: SiralanabilirOge[] = ogeler.map((o) => ({
    anahtar: o.anahtar,
    etiket: o.ad,
    gizliMi: o.gizliMi,
    sabitMi: o.sabitMi,
  }));

  return (
    <SiralanabilirListe
      ogeler={listeOgeleri}
      onSirala={(anahtarlar) => menuYenidenSirala(anahtarlar)}
      onGorunurlukDegistir={(anahtar, gizliMi) => menuGorunurlukDegistir(anahtar, gizliMi)}
    />
  );
}
