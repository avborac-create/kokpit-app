import { GonderButonu } from "@/core/ui/gonder-butonu";
import { muvekkilTumDosyalariSecim } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { dosyaEkonomiDurumuDegistir } from "@/modules/dava-dosyasi/lib/cari-sistem-actions";

// Muvekkilin hangi dosyalarinin ekonomiye (cari hesaplara) dahil olacagini secme:
// ör. muvekkilin ALACAKLI oldugu ve ayri takip edilecek icra dosyalari ekonomi disi tutulur.
export async function DosyaSecimi({ musteriId }: { musteriId: string }) {
  const dosyalar = await muvekkilTumDosyalariSecim(musteriId);
  const disindaki = dosyalar.filter((d) => d.ekonomiDisi).length;

  return (
    <div>
      <p className="mb-3 text-sm text-white/55">
        Ekonomi dışı bıraktığınız dosyalar müvekkil toplamlarına, sayfa sekmelerine ve seçim kutularına girmez. Kayıtları
        silinmez; istediğiniz zaman tekrar dahil edebilirsiniz.{" "}
        <b className="text-white/80">
          {dosyalar.length - disindaki} dosya dahil, {disindaki} dosya dışında.
        </b>
      </p>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Dosya</th>
              <th className="px-4 py-3 font-medium">Birim / Konu</th>
              <th className="px-4 py-3 text-right font-medium">Ekonomi Kaydı</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {dosyalar.map((d) => (
              <tr key={d.id} className={`border-t border-white/[0.06] ${d.ekonomiDisi ? "opacity-60" : ""}`}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-white">{d.etiket}</td>
                <td className="px-4 py-3 text-white/60">
                  {d.birimAdi ?? "—"} · {d.konu}
                </td>
                <td className="px-4 py-3 text-right text-white/60">{d.kayitSayisi}</td>
                <td className="px-4 py-3">
                  {d.ekonomiDisi ? (
                    <span className="rounded-full bg-white/[0.07] px-2.5 py-0.5 text-xs text-white/60">Ekonomi dışı</span>
                  ) : (
                    <span className="rounded-full bg-[#32d74b]/15 px-2.5 py-0.5 text-xs text-[#32d74b]">Dahil</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={dosyaEkonomiDurumuDegistir.bind(null, d.id, !d.ekonomiDisi)}>
                    <GonderButonu varyant="ikincil" boyut="kompakt" bekleyenMetin="…">
                      {d.ekonomiDisi ? "Ekonomiye Dahil Et" : "Ekonomi Dışında Tut"}
                    </GonderButonu>
                  </form>
                </td>
              </tr>
            ))}
            {dosyalar.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-white/40">
                  Müvekkilin dosyası yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
