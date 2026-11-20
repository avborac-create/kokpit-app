import type { HesapSecenegi } from "@/core/hesap/hesaplar";

const TUR_ETIKETI: Record<string, string> = { BURO: "büro", NAKIT: "nakit", AVUKAT: "avukat", DIGER: "kişisel" };

// Paranin hangi hesaptan ciktigi / hangi hesaba geldigi. Kisisel hesaplar (ör. sigortali avukat) buro ile alacak-borc dogurur.
export function HesapSecici({
  hesaplar,
  name = "hesapId",
  id,
  defaultValue,
  bosSecenek,
  required = false,
}: {
  hesaplar: HesapSecenegi[];
  name?: string;
  id?: string;
  defaultValue?: string | null;
  bosSecenek?: string;
  required?: boolean;
}) {
  const varsayilan = defaultValue ?? (bosSecenek ? "" : (hesaplar.find((h) => h.varsayilanMi) ?? hesaplar[0])?.id ?? "");
  return (
    <select id={id} name={name} defaultValue={varsayilan} required={required} className="w-full rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]">
      {bosSecenek && <option value="">{bosSecenek}</option>}
      {hesaplar.map((h) => (
        <option key={h.id} value={h.id}>
          {h.ad}
          {h.sahipAdi ? ` — ${h.sahipAdi}` : ""} ({TUR_ETIKETI[h.tur] ?? h.tur})
        </option>
      ))}
    </select>
  );
}
