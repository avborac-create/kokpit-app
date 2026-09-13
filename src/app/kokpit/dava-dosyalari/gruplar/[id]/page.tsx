import Link from "next/link";
import { notFound } from "next/navigation";
import {
  uyusmazlikGrubuGetir,
  uyusmazlikGrubuCariHesapOzeti,
} from "@/modules/dava-dosyasi/lib/queries";
import { CariHesapOzeti } from "@/modules/dava-dosyasi/components/cari-hesap-ozeti";

export default async function UyusmazlikGrubuSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [grup, ozet] = await Promise.all([
    uyusmazlikGrubuGetir(id),
    uyusmazlikGrubuCariHesapOzeti(id),
  ]);
  if (!grup) notFound();

  return (
    <div className="pt-3">
      <Link
        href={`/kokpit/musteriler/${grup.musteriId}`}
        className="mb-2 inline-block text-sm text-[#6db8ff] hover:underline"
      >
        ‹ {grup.musteri.adSoyadUnvan}
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">{grup.ad}</h1>
      {grup.notlar && <p className="mb-6 max-w-2xl text-sm text-white/50">{grup.notlar}</p>}

      <h2 className="mb-3 mt-6 text-lg font-semibold tracking-tight text-white">
        Cari Hesap Özeti (Grup Toplamı)
      </h2>
      <p className="mb-3 text-sm text-white/45">
        Müvekkilden bu ticari ilişki/uyuşmazlık için gelen paranın ve gruptaki tüm dosyalara
        işlenen masrafların toplamı — müvekkilin bize gönderdiği bir avans hangi dosyaya
        harcanırsa harcansın burada tek bir cari hesap olarak izlenir.
      </p>
      <div className="mb-8">
        <CariHesapOzeti ozet={ozet} />
      </div>

      <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">
        Dosyalar ({grup.dosyalar.length})
      </h2>
      {grup.dosyalar.length === 0 ? (
        <p className="text-sm text-white/40">Bu gruba henüz dosya bağlanmadı.</p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Dosya No</th>
                <th className="px-4 py-3 font-medium">Konu</th>
                <th className="px-4 py-3 font-medium">Birim</th>
                <th className="px-4 py-3 font-medium">Karşı Taraf</th>
                <th className="px-4 py-3 font-medium">Bağlı Olduğu Dosya</th>
                <th className="px-4 py-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {grup.dosyalar.map((dosya) => (
                <tr key={dosya.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/kokpit/dava-dosyalari/${dosya.id}`}
                      className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                    >
                      {dosya.dosyaNo ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/85">{dosya.konu}</td>
                  <td className="px-4 py-3 text-white/60">{dosya.birimAdi ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60">{dosya.karsiTaraf?.ad ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60">
                    {dosya.bagliOlduguDosya ? (
                      <Link
                        href={`/kokpit/dava-dosyalari/${dosya.bagliOlduguDosya.id}`}
                        className="hover:text-[#6db8ff] hover:underline"
                      >
                        {dosya.bagliOlduguDosya.dosyaNo ?? dosya.bagliOlduguDosya.konu}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                      {dosya.durum.etiket}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
