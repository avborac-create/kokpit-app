import type { dosyaCariHesapOzeti } from "@/modules/dava-dosyasi/lib/queries";

type Ozet = Awaited<ReturnType<typeof dosyaCariHesapOzeti>>;

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// Akdi vekalet ucreti kesin/geri donusu olmayan bir gelirdir (buronun
// kazancidir, tasnif edildigi an harcanmis sayilir) - bu yuzden "muvekkilin
// bize borcu/alacagi ne kadar" net hesabina dahil edilmez. Diger tum cari
// kodlar (Bloke Paralar, Masraf Hesabi, Ticari Hesap) muvekkile ait olup
// gerektiginde iade edilebilir/kullanilabilir tutarlardir.
const NET_HESABA_DAHIL_OLMAYAN_KODLAR = ["akdi_vekalet_hesabi"];

export function CariHesapOzeti({ ozet }: { ozet: Ozet }) {
  if (ozet.length === 0) {
    return <p className="text-sm text-white/40">Henüz tasnif veya masraf kaydı yok.</p>;
  }

  const netBakiye = ozet
    .filter((satir) => !NET_HESABA_DAHIL_OLMAYAN_KODLAR.includes(satir.cariKod.kod))
    .reduce((toplam, satir) => toplam + satir.bakiye, 0);
  const toplamHarcanan = ozet.reduce((toplam, satir) => toplam + satir.masrafToplami, 0);
  const toplamAlinan = ozet.reduce((toplam, satir) => toplam + satir.tasnifToplami, 0);

  return (
    <div>
      {/* Basit ozet: sadece 3 soruya cevap - musteriden ne kadar para
          alindi, onun adina ne kadar harcandi, ve net olarak kim kime
          ne kadar borclu. Detayli cari-kod kirilimi asagida ayrica durur. */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-white/45">Müvekkilden Alınan Paralar</p>
          <p className="mt-1 text-lg font-semibold text-white">{paraFormatlayici.format(toplamAlinan)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-white/45">Müvekkil Adına Yapılan Harcamalar</p>
          <p className="mt-1 text-lg font-semibold text-white">{paraFormatlayici.format(toplamHarcanan)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-white/45">
            {netBakiye < 0 ? "Müvekkilin Bize Borcu" : "Müvekkilin Alacağı/Avansı"}
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${
              netBakiye > 0 ? "text-[#32d74b]" : netBakiye < 0 ? "text-[#ff7a70]" : "text-white/60"
            }`}
          >
            {paraFormatlayici.format(Math.abs(netBakiye))}
          </p>
        </div>
      </div>

      <div className="glass mb-3 overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Cari Kod</th>
              <th className="px-4 py-3 font-medium">Tasnif Edilen</th>
              <th className="px-4 py-3 font-medium">Masraf Edilen</th>
              <th className="px-4 py-3 font-medium">Bakiye</th>
            </tr>
          </thead>
          <tbody>
            {ozet.map((satir) => (
              <tr key={satir.cariKod.id} className="border-t border-white/[0.06]">
                <td className="px-4 py-3 text-white/85">
                  {satir.cariKod.etiket}
                  {NET_HESABA_DAHIL_OLMAYAN_KODLAR.includes(satir.cariKod.kod) && (
                    <span className="ml-2 text-xs text-white/35">(kesin gelir)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-white/70">{paraFormatlayici.format(satir.tasnifToplami)}</td>
                <td className="px-4 py-3 text-white/70">{paraFormatlayici.format(satir.masrafToplami)}</td>
                <td
                  className={`px-4 py-3 font-medium ${
                    satir.bakiye > 0
                      ? "text-[#32d74b]"
                      : satir.bakiye < 0
                        ? "text-[#ff7a70]"
                        : "text-white/50"
                  }`}
                >
                  {paraFormatlayici.format(satir.bakiye)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className={`glass rounded-2xl p-4 text-sm ${
          netBakiye > 0 ? "border-[#32d74b]/30" : netBakiye < 0 ? "border-[#ff7a70]/30" : ""
        }`}
      >
        {netBakiye > 0 && (
          <p className="text-[#32d74b]">
            <span className="font-semibold">Müvekkilin bu dosyada {paraFormatlayici.format(netBakiye)} alacağı/avansı var.</span>{" "}
            (Bloke Paralar, Masraf Hesabı, Ticari Hesap ve Emanet Hesabı&apos;ndaki kullanılmamış/iade edilebilir
            tutarların toplamı.)
          </p>
        )}
        {netBakiye < 0 && (
          <p className="text-[#ff7a70]">
            <span className="font-semibold">
              Müvekkilin bu dosyada {paraFormatlayici.format(Math.abs(netBakiye))} borcu var.
            </span>{" "}
            (Avans/tasnif edilen tutar, yapılan masrafları karşılamıyor; müvekkilden ek tutar talep edilmeli.)
          </p>
        )}
        {netBakiye === 0 && <p className="text-white/60">Mutabık — tasnif edilen tutar ile masraflar eşit.</p>}
        <p className="mt-2 text-xs text-white/35">
          Akdi Vekalet Hesabı büronun kesin/geri dönüşü olmayan geliridir, bu hesaba dahil edilmez.
        </p>
      </div>
    </div>
  );
}
