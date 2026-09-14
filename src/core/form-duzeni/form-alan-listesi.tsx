"use client";

import { SiralanabilirListe, type SiralanabilirOge } from "@/core/ui/siralanabilir-liste";
import { formAlanlariniYenidenSirala, formAlanGorunurlukDegistir } from "@/core/form-duzeni/actions";

export type FormAlanSatiri = { anahtar: string; etiket: string; gizliMi: boolean; gizlenebilirMi: boolean };

export function FormAlanListesi({
  formAnahtari,
  ogeler,
}: {
  formAnahtari: string;
  ogeler: FormAlanSatiri[];
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
      onSirala={(anahtarlar) => formAlanlariniYenidenSirala(formAnahtari, anahtarlar)}
      onGorunurlukDegistir={(anahtar, gizliMi) => formAlanGorunurlukDegistir(formAnahtari, anahtar, gizliMi)}
    />
  );
}
