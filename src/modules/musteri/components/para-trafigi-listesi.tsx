import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ParaTrafigiSilmeButonu } from "@/modules/musteri/components/para-trafigi-silme-butonu";

type Kayit = Prisma.MusteriParaTrafigiGetPayload<{
  include: {
    tip: true;
    durum: true;
    kaynak: true;
    dosyalar: { include: { dosya: true } };
    tasnif: { include: { cariKod: true } };
    uyusmazlikGrubu: true;
  };
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
    return <p className="text-sm text-white/40">Henüz para trafiği kaydı yok.</p>;
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Tarih</th>
            <th className="px-4 py-3 font-medium">Tip</th>
            <th className="px-4 py-3 font-medium">Tutar</th>
            <th className="px-4 py-3 font-medium">Durum</th>
            <th className="px-4 py-3 font-medium">Kaynak</th>
            <th className="px-4 py-3 font-medium">Dosya(lar)</th>
            <th className="px-4 py-3 font-medium">Tasnif</th>
            <th className="px-4 py-3 font-medium">Açıklama</th>
            <th className="px-4 py-3" />
            {silmeYetkisiVar && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {kayitlar.map((kayit) => (
            <tr key={kayit.id} className="border-t border-white/[0.06]">
              <td className="px-4 py-3 text-white/60">{tarihFormatlayici.format(kayit.tarih)}</td>
              <td className="px-4 py-3 text-white/85">{kayit.tip.etiket}</td>
              <td className="px-4 py-3 font-medium text-white">
                {paraFormatlayici.format(Number(kayit.tutar))}
              </td>
              <td className="px-4 py-3">
                <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                  {kayit.durum.etiket}
                </span>
              </td>
              <td className="px-4 py-3 text-white/60">{kayit.kaynak.etiket}</td>
              <td className="px-4 py-3 text-white/60">
                {kayit.dosyalar.length > 0 ? (
                  kayit.dosyalar.map((bag, i) => (
                    <span key={bag.id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/kokpit/dava-dosyalari/${bag.dosya.id}`}
                        className="hover:text-[#6db8ff] hover:underline"
                      >
                        {bag.dosya.dosyaNo ?? bag.dosya.konu}
                      </Link>
                    </span>
                  ))
                ) : kayit.uyusmazlikGrubu ? (
                  <Link
                    href={`/kokpit/dava-dosyalari/gruplar/${kayit.uyusmazlikGrubu.id}`}
                    className="hover:text-[#6db8ff] hover:underline"
                  >
                    {kayit.uyusmazlikGrubu.ad} (grup geneli)
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-white/60">
                {kayit.tasnif.length === 0 ? (
                  "—"
                ) : (
                  <div>
                    <div className="flex flex-wrap gap-1">
                      {kayit.tasnif.map((satir) => (
                        <span
                          key={satir.id}
                          className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/70"
                        >
                          {satir.cariKod.etiket}: {paraFormatlayici.format(Number(satir.tutar))}
                        </span>
                      ))}
                    </div>
                    {(() => {
                      const tasnifToplam = kayit.tasnif.reduce((t, s) => t + Number(s.tutar), 0);
                      const fark = Number(kayit.tutar) - tasnifToplam;
                      const mutabik = Math.abs(fark) < 0.01;
                      return (
                        <p className={`mt-1 text-xs ${mutabik ? "text-[#30d158]" : "text-[#ff7a70]"}`}>
                          {mutabik
                            ? "✓ Mutabık"
                            : `⚠ Fark: ${paraFormatlayici.format(fark)}`}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-white/60">{kayit.aciklama ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/kokpit/finans/musteri-iliskileri/${kayit.musteriId}/cari-hesap/${kayit.id}/duzenle`}
                  className="text-xs text-[#6db8ff] hover:underline"
                >
                  Düzenle
                </Link>
              </td>
              {silmeYetkisiVar && (
                <td className="px-4 py-3 text-right">
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
