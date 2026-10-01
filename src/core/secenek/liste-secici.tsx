"use client";

import { useRouter } from "next/navigation";
import { Secim } from "@/core/ui/form";

// Seçenek Listeleri ekranında tek bir listeyi açılır menüden seçip yalnızca
// onu göstermek için - tüm listeler alt alta yığılınca sayfa karmaşıklaşıyordu.
export function ListeSecici({
  listeler,
  secili,
}: {
  listeler: { anahtar: string; ad: string }[];
  secili: string;
}) {
  const router = useRouter();
  return (
    <Secim
      value={secili}
      onChange={(e) => router.replace(`/kokpit/ayarlar/secenekler?liste=${encodeURIComponent(e.target.value)}`)}
      className="max-w-sm"
      aria-label="Liste seçin"
    >
      {listeler.map((l) => (
        <option key={l.anahtar} value={l.anahtar}>
          {l.ad}
        </option>
      ))}
    </Secim>
  );
}
