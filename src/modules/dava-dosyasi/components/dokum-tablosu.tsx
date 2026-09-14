import Link from "next/link";
import type { DokumSatiri } from "@/modules/dava-dosyasi/lib/queries";

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

// Masraf (harcanan) ve dagitim (tahsis edilen) kalemlerini TEK bir
// kronolojik listede, kaynak alaniyla ayirt ederek gosterir - bkz. plan
// "Tum Dosyalarin Dokumu" / "Dosya Bazinda Dokum". Salt-okunur bir dokum;
// ekleme/silme icin ilgili Masraflar / Para Trafigi ekranlari kullanilir.
export function DokumTablosu({
  satirlar,
  dosyaSutunuGoster = true,
}: {
  satirlar: DokumSatiri[];
  dosyaSutunuGoster?: boolean;
}) {
  if (satirlar.length === 0) {
    return <p className="text-sm text-white/40">Henüz masraf veya dağıtım kaydı yok.</p>;
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Tarih</th>
            <th className="px-4 py-3 font-medium">Kaynak</th>
            {dosyaSutunuGoster && <th className="px-4 py-3 font-medium">Dosya</th>}
            <th className="px-4 py-3 font-medium">Açıklama</th>
            <th className="px-4 py-3 font-medium">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((satir) => (
            <tr key={satir.id} className="border-t border-white/[0.06]">
              <td className="whitespace-nowrap px-4 py-3 text-white/60">
                {tarihFormatlayici.format(satir.tarih)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${
                    satir.kaynak === "masraf"
                      ? "bg-white/[0.06] text-white/70"
                      : "bg-[var(--accent-soft)] text-[#6db8ff]"
                  }`}
                >
                  {satir.kaynak === "masraf" ? "Masraf" : "Dağıtım"}
                </span>
              </td>
              {dosyaSutunuGoster && (
                <td className="px-4 py-3 text-white/70">
                  {satir.dosyaId && satir.dosyaKonu ? (
                    <Link
                      href={`/kokpit/dava-dosyalari/${satir.dosyaId}`}
                      className="hover:text-[#6db8ff] hover:underline"
                    >
                      {satir.dosyaKonu}
                    </Link>
                  ) : (
                    <span className="text-white/35">— Kümenin geneli —</span>
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-white/85">{satir.aciklama}</td>
              <td className="px-4 py-3 font-medium text-white/85">
                {paraFormatlayici.format(satir.tutar)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
