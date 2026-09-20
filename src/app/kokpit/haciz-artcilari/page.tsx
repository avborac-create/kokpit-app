import Link from "next/link";
import { hacizRaporlariniListele } from "@/modules/haciz-raporu/lib/queries";
import { Dugme } from "@/core/ui/button";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { hacizAvukatiMi } from "@/core/auth/yetki";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function HacizArtcilariSayfasi() {
  const [raporlar, kullanici] = await Promise.all([hacizRaporlariniListele(), mevcutKullanici()]);
  const yeniRaporYetkisiVar = Boolean(kullanici && hacizAvukatiMi(kullanici.rol));

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Haciz Artçıları</h1>
        {yeniRaporYetkisiVar && (
          <Link href="/kokpit/haciz-artcilari/yeni">
            <Dugme>+ Yeni Haciz Raporu</Dugme>
          </Link>
        )}
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Haciz Tarihi</th>
              <th className="px-4 py-3 font-medium">Dosya</th>
              <th className="px-4 py-3 font-medium">Müvekkil(ler)</th>
              <th className="px-4 py-3 font-medium">Avukat</th>
              <th className="px-4 py-3 font-medium">Tahsilat</th>
            </tr>
          </thead>
          <tbody>
            {raporlar.map((rapor) => (
              <tr key={rapor.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <Link
                    href={`/kokpit/haciz-artcilari/${rapor.id}`}
                    className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                  >
                    {tarihFormatlayici.format(rapor.hacizTarihi)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/60">
                  {rapor.davaDosyasi.dosyaNo ? `${rapor.davaDosyasi.dosyaNo} — ` : ""}
                  {rapor.davaDosyasi.konu}
                </td>
                <td className="px-4 py-3 text-white/60">
                  {rapor.davaDosyasi.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-white/60">{rapor.avukat.adSoyad}</td>
                <td className="px-4 py-3 text-white/60">
                  {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
                    Number(rapor.tahsilatMiktari),
                  )}
                </td>
              </tr>
            ))}
            {raporlar.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
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
