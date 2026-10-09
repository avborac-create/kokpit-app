import Link from "next/link";
import { HARCAMA_KODU, muvekkilEkonomisi } from "@/modules/dava-dosyasi/lib/dosya-ekonomisi";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const renk = (b: number) => (b > 0 ? "text-[#ff7a70]" : b < 0 ? "text-[#32d74b]" : "text-white/40");
const goster = (b: number) => (b === 0 ? "—" : `${para.format(Math.abs(b))}${b > 0 ? " (B)" : " (A)"}`);

// Muvekkilin TUM dosyalarinin cari kod bazinda ekonomisi: satirlar cari kod
// (Akdi Vekalet, Harcamalar...), sutunlar dosyalar, sag uc TOPLAM. "10
// dosyanin toplam akdi vekalet borcu / masraf borcu ne kadar?" sorusu burada
// cevaplanir.
export async function MuvekkilEkonomiTablosu({ musteriId }: { musteriId: string }) {
  const { satirlar, toplam } = await muvekkilEkonomisi(musteriId);
  if (satirlar.length === 0) {
    return <p className="text-sm text-white/40">Bu müvekkilin dosyası yok.</p>;
  }
  const kodlar = toplam.kodlar.filter((k) => k.borc !== 0 || k.alacak !== 0 || k.kod === HARCAMA_KODU);

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-white/45">Toplam Borç</p>
          <p className="mt-1 text-lg font-semibold text-white">{para.format(toplam.toplamBorc)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-white/45">Koda Dağıtılmış</p>
          <p className="mt-1 text-lg font-semibold text-white">{para.format(toplam.toplamAlacak)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-white/45">Havuzda Bekleyen</p>
          <p className="mt-1 text-lg font-semibold text-[#6db8ff]">{para.format(toplam.havuzKalan)}</p>
        </div>
        <div className="rounded-2xl border border-[#6db8ff]/40 bg-[#6db8ff]/[0.06] p-4">
          <p className="text-xs text-white/45">{toplam.net > 0 ? "Müvekkilin Bize Borcu" : "Müvekkil Lehine Net"}</p>
          <p className={`mt-1 text-lg font-semibold ${renk(toplam.net)}`}>{para.format(Math.abs(toplam.net))}</p>
        </div>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Cari Kod</th>
              {satirlar.map((s) => (
                <th key={s.dosyaId} className="px-4 py-3 text-right font-medium">
                  <Link
                    href={`/kokpit/dava-dosyalari/${s.dosyaId}?sekme=ekonomi`}
                    title={s.konu}
                    className="hover:text-[#6db8ff] hover:underline"
                  >
                    {s.dosyaNo}
                  </Link>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-white">TOPLAM</th>
            </tr>
          </thead>
          <tbody>
            {kodlar.map((k) => (
              <tr key={k.kodId} className="border-t border-white/[0.06]">
                <td className="px-4 py-3 text-white/85">{k.kod === HARCAMA_KODU ? "Harcamalar" : k.etiket}</td>
                {satirlar.map((s) => {
                  const b = s.ekonomi.kodlar.find((x) => x.kodId === k.kodId)?.bakiye ?? 0;
                  return (
                    <td key={s.dosyaId} className={`whitespace-nowrap px-4 py-3 text-right ${renk(b)}`}>
                      {goster(b)}
                    </td>
                  );
                })}
                <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${renk(k.bakiye)}`}>{goster(k.bakiye)}</td>
              </tr>
            ))}
            <tr className="border-t border-white/[0.06]">
              <td className="px-4 py-3 text-white/85">Havuz (dağıtım bekleyen)</td>
              {satirlar.map((s) => (
                <td key={s.dosyaId} className="whitespace-nowrap px-4 py-3 text-right text-[#6db8ff]">
                  {s.ekonomi.havuzKalan ? para.format(s.ekonomi.havuzKalan) : "—"}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[#6db8ff]">
                {toplam.havuzKalan ? para.format(toplam.havuzKalan) : "—"}
              </td>
            </tr>
            <tr className="border-t border-white/10 font-medium">
              <td className="px-4 py-3 text-white">Net Durum</td>
              {satirlar.map((s) => (
                <td key={s.dosyaId} className={`whitespace-nowrap px-4 py-3 text-right ${renk(s.ekonomi.net)}`}>
                  {goster(s.ekonomi.net)}
                </td>
              ))}
              <td className={`whitespace-nowrap px-4 py-3 text-right ${renk(toplam.net)}`}>{goster(toplam.net)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-white/35">
        (B) = müvekkil büroya borçlu, (A) = müvekkilin fazla ödemesi. Bakiye = Borç − Alacak. Havuzdaki para net
        durumdan düşülür.
      </p>
    </div>
  );
}
