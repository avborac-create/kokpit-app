import Link from "next/link";
import { hacizRaporlariniListele } from "@/modules/haciz-raporu/lib/queries";
import { Dugme } from "@/core/ui/button";

export default async function HacizRaporlariSayfasi() {
  const raporlar = await hacizRaporlariniListele();

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Haciz Raporları</h1>
        <Link href="/kokpit/haciz-raporlari/yeni">
          <Dugme>+ Yeni Haciz Raporu</Dugme>
        </Link>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">İcra Dosyası</th>
              <th className="px-4 py-3 font-medium">Borçlu</th>
              <th className="px-4 py-3 font-medium">Haciz Tarihi</th>
              <th className="px-4 py-3 font-medium">Muhafaza</th>
              <th className="px-4 py-3 font-medium">İstihkak</th>
              <th className="px-4 py-3 font-medium">Kıymet Takdiri</th>
            </tr>
          </thead>
          <tbody>
            {raporlar.map((rapor) => (
              <tr key={rapor.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <Link
                    href={`/kokpit/dava-dosyalari/${rapor.icraDosyasiId}`}
                    className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                  >
                    KP-{String(rapor.icraDosyasi.kayitNo).padStart(4, "0")}
                    {rapor.icraDosyasi.dosyaNo ? ` — ${rapor.icraDosyasi.dosyaNo}` : ""}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/60">
                  {rapor.icraDosyasi.karsiTaraflar.map((kt) => kt.karsiTaraf.ad).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-white/60">
                  {rapor.hacizTarihi.toLocaleDateString("tr-TR")}
                </td>
                <td className="px-4 py-3 text-white/60">{rapor.muhafaza?.etiket ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{rapor.istihkak?.etiket ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{rapor.kiymetTakdiri?.etiket ?? "—"}</td>
              </tr>
            ))}
            {raporlar.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
