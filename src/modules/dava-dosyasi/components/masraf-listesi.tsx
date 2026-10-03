"use client";

import { OnayliButon } from "@/core/ui/onayli-buton";
import { useTransition } from "react";
import Link from "next/link";
import type { davaDosyasiGetir } from "@/modules/dava-dosyasi/lib/queries";
import { dosyaMasrafiSil, dosyaMasrafiYansitmaDegistir } from "@/modules/dava-dosyasi/lib/actions";

type DosyaDetay = NonNullable<Awaited<ReturnType<typeof davaDosyasiGetir>>>;
// Prisma'nin Decimal tipi Server->Client Component sinirini gecemez;
// bu yuzden tutar burada duz number olarak kabul edilir (page.tsx'te
// Number(...) ile donusturulup gecirilir).
type Masraf = Omit<DosyaDetay["masraflar"][number], "tutar"> & { tutar: number };

const YANSITMA_ETIKETLERI = { MUVEKKIL: "Müvekkil", BURO: "Büro", BORCLU: "Borçlu" } as const;
const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

export function MasrafListesi({
  masraflar,
  dosyaId,
  silmeYetkisiVar,
}: {
  masraflar: Masraf[];
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  if (masraflar.length === 0) {
    return <p className="text-sm text-white/40">Bu dosyaya işlenmiş masraf kaydı yok.</p>;
  }

  const cariKoduBazindaToplam = new Map<string, number>();
  for (const masraf of masraflar) {
    const mevcut = cariKoduBazindaToplam.get(masraf.cariKod.etiket) ?? 0;
    cariKoduBazindaToplam.set(masraf.cariKod.etiket, mevcut + Number(masraf.tutar));
  }
  const genelToplam = masraflar.reduce((toplam, m) => toplam + Number(m.tutar), 0);
  const yansitmaToplami = (hedef: keyof typeof YANSITMA_ETIKETLERI) =>
    masraflar.filter((m) => m.yansitmaHedefi === hedef).reduce((t, m) => t + Number(m.tutar), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {Array.from(cariKoduBazindaToplam.entries()).map(([etiket, tutar]) => (
          <span
            key={etiket}
            className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/70"
          >
            {etiket}: {paraFormatlayici.format(tutar)}
          </span>
        ))}
        <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[#6db8ff]">
          Toplam: {paraFormatlayici.format(genelToplam)}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(YANSITMA_ETIKETLERI) as (keyof typeof YANSITMA_ETIKETLERI)[]).map((hedef) => (
          <span key={hedef} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
            {YANSITMA_ETIKETLERI[hedef]}&apos;e yansıtılan: {paraFormatlayici.format(yansitmaToplami(hedef))}
          </span>
        ))}
      </div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">Cari Kod</th>
              <th className="px-4 py-3 font-medium">Tür</th>
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 font-medium">Tutar</th>
              <th className="px-4 py-3 font-medium">Yansıtılan</th>
              <th className="px-4 py-3 font-medium" />
              {silmeYetkisiVar && <th className="px-4 py-3 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {masraflar.map((masraf) => (
              <MasrafSatiri
                key={masraf.id}
                masraf={masraf}
                dosyaId={dosyaId}
                silmeYetkisiVar={silmeYetkisiVar}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MasrafSatiri({
  masraf,
  dosyaId,
  silmeYetkisiVar,
}: {
  masraf: Masraf;
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  const [yansitmaPending, yansit] = useTransition();

  return (
    <tr className="border-t border-white/[0.06]">
      <td className="px-4 py-3 text-white/60">{tarihFormatlayici.format(masraf.tarih)}</td>
      <td className="px-4 py-3">
        <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/70">
          {masraf.cariKod.etiket}
        </span>
      </td>
      <td className="px-4 py-3 text-white/60">{masraf.tur.etiket}</td>
      <td className="px-4 py-3 text-white/85">{masraf.aciklama}</td>
      <td className="px-4 py-3 font-medium text-white">{paraFormatlayici.format(Number(masraf.tutar))}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {(Object.keys(YANSITMA_ETIKETLERI) as (keyof typeof YANSITMA_ETIKETLERI)[]).map((hedef) => (
            <button
              key={hedef}
              type="button"
              disabled={yansitmaPending || masraf.yansitmaHedefi === hedef}
              onClick={() => yansit(() => dosyaMasrafiYansitmaDegistir(masraf.id, dosyaId, hedef))}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                masraf.yansitmaHedefi === hedef
                  ? "bg-[var(--accent-soft)] text-[#6db8ff]"
                  : "bg-white/[0.04] text-white/40 hover:bg-white/[0.1] hover:text-white/80"
              }`}
            >
              {YANSITMA_ETIKETLERI[hedef]}
            </button>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/kokpit/dava-dosyalari/${dosyaId}/masraflar/${masraf.id}/duzenle`}
          className="text-xs text-[#6db8ff] hover:underline"
        >
          Düzenle
        </Link>
      </td>
      {silmeYetkisiVar && (
        <td className="px-4 py-3">
          <OnayliButon
 sifreIste
 eylem={(sifre) => dosyaMasrafiSil(masraf.id, dosyaId, sifre)}
 mesaj="Bu masraf kaydı silinsin mi?"
 >
 Sil
 </OnayliButon>
        </td>
      )}
    </tr>
  );
}
