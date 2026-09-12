import Link from "next/link";
import type { Prisma } from "@prisma/client";

type Kayit = Prisma.MusteriParaTrafigiGetPayload<{
  include: { tip: true; durum: true; kaynak: true; musteri: true };
}>;

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

export function DosyaParaTrafigiListesi({ kayitlar }: { kayitlar: Kayit[] }) {
  if (kayitlar.length === 0) {
    return <p className="text-sm text-white/40">Bu dosyaya bağlı para trafiği kaydı yok.</p>;
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Tarih</th>
            <th className="px-4 py-3 font-medium">Müvekkil</th>
            <th className="px-4 py-3 font-medium">Tip</th>
            <th className="px-4 py-3 font-medium">Tutar</th>
            <th className="px-4 py-3 font-medium">Durum</th>
          </tr>
        </thead>
        <tbody>
          {kayitlar.map((kayit) => (
            <tr key={kayit.id} className="border-t border-white/[0.06]">
              <td className="px-4 py-3 text-white/60">{tarihFormatlayici.format(kayit.tarih)}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/kokpit/musteriler/${kayit.musteriId}`}
                  className="text-white hover:text-[#6db8ff] hover:underline"
                >
                  {kayit.musteri.adSoyadUnvan}
                </Link>
              </td>
              <td className="px-4 py-3 text-white/85">{kayit.tip.etiket}</td>
              <td className="px-4 py-3 font-medium text-white">
                {paraFormatlayici.format(Number(kayit.tutar))}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                  {kayit.durum.etiket}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
