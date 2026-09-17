import type { dosyaCariHesapDefteri } from "@/modules/dava-dosyasi/lib/queries";

type Defter = Awaited<ReturnType<typeof dosyaCariHesapDefteri>>;

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

// Dosyanin BASIT cari hesabi (bkz. schema.prisma DosyaFatura yorumu) -
// UYAP'taki "Müv. Cari" sekmesinin sade karsiligi: bu dosyaya kesilen
// faturalar (borç) ile bu dosyaya istinaden müvekkilden gelen paralar
// (alacak), tek bir kronolojik dökümde, koşan bir bakiye ile. Cari-kod
// bazli eski/detaylı sistemden (CariHesapOzeti) BILEREK ayrı ve daha
// basit - o görünüm aşağıda "Detaylı (Eski) Görünüm" olarak ayrıca durur.
export function DosyaCariHesapDefteri({ defter }: { defter: Defter }) {
  const { satirlar, toplamFatura, toplamTahsilat, bakiye } = defter;

  return (
    <div>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-white/45">Toplam Fatura</p>
          <p className="mt-1 text-lg font-semibold text-white">{paraFormatlayici.format(toplamFatura)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-white/45">Bu Dosyaya İstinaden Gelen Para</p>
          <p className="mt-1 text-lg font-semibold text-white">{paraFormatlayici.format(toplamTahsilat)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-white/45">{bakiye > 0 ? "Müvekkilin Borcu" : "Müvekkilin Alacağı"}</p>
          <p
            className={`mt-1 text-lg font-semibold ${
              bakiye > 0 ? "text-[#ff7a70]" : bakiye < 0 ? "text-[#32d74b]" : "text-white/60"
            }`}
          >
            {paraFormatlayici.format(Math.abs(bakiye))}
          </p>
        </div>
      </div>

      {satirlar.length === 0 ? (
        <p className="text-sm text-white/40">Henüz fatura veya tahsilat kaydı yok.</p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Açıklama</th>
                <th className="px-4 py-3 font-medium">Borç</th>
                <th className="px-4 py-3 font-medium">Alacak</th>
                <th className="px-4 py-3 font-medium">Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((satir) => (
                <tr key={satir.id} className="border-t border-white/[0.06]">
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">
                    {tarihFormatlayici.format(satir.tarih)}
                  </td>
                  <td className="px-4 py-3 text-white/85">{satir.aciklama}</td>
                  <td className="px-4 py-3 text-[#ff7a70]">
                    {satir.borc > 0 ? paraFormatlayici.format(satir.borc) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#32d74b]">
                    {satir.alacak > 0 ? paraFormatlayici.format(satir.alacak) : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{paraFormatlayici.format(satir.bakiye)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
