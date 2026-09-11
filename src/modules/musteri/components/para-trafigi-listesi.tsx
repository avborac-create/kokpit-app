import type { Prisma } from "@prisma/client";
import { ParaTrafigiSilmeButonu } from "@/modules/musteri/components/para-trafigi-silme-butonu";

type Kayit = Prisma.MusteriParaTrafigiGetPayload<{
  include: { tip: true; durum: true; kaynak: true };
}>;

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

export function ParaTrafigiListesi({
  kayitlar,
  silmeYetkisiVar,
}: {
  kayitlar: Kayit[];
  silmeYetkisiVar: boolean;
}) {
  if (kayitlar.length === 0) {
    return <p className="text-sm text-black/50 dark:text-white/50">Henüz para trafiği kaydı yok.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60">
          <tr>
            <th className="px-4 py-2 font-medium">Tarih</th>
            <th className="px-4 py-2 font-medium">Tip</th>
            <th className="px-4 py-2 font-medium">Tutar</th>
            <th className="px-4 py-2 font-medium">Durum</th>
            <th className="px-4 py-2 font-medium">Kaynak</th>
            <th className="px-4 py-2 font-medium">Açıklama</th>
            {silmeYetkisiVar && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {kayitlar.map((kayit) => (
            <tr key={kayit.id} className="border-t border-black/5 dark:border-white/5">
              <td className="px-4 py-2 text-black/70 dark:text-white/70">
                {tarihFormatlayici.format(kayit.tarih)}
              </td>
              <td className="px-4 py-2">{kayit.tip.etiket}</td>
              <td className="px-4 py-2 font-medium">{paraFormatlayici.format(Number(kayit.tutar))}</td>
              <td className="px-4 py-2">
                <span className="rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                  {kayit.durum.etiket}
                </span>
              </td>
              <td className="px-4 py-2 text-black/70 dark:text-white/70">{kayit.kaynak.etiket}</td>
              <td className="px-4 py-2 text-black/70 dark:text-white/70">{kayit.aciklama ?? "—"}</td>
              {silmeYetkisiVar && (
                <td className="px-4 py-2 text-right">
                  <ParaTrafigiSilmeButonu musteriId={kayit.musteriId} kayitId={kayit.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
