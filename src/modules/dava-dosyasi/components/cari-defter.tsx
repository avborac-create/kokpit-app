import Link from "next/link";
import { OnayliButon } from "@/core/ui/onayli-buton";
import type { DefterSatiri, SilmeKaynagi } from "@/modules/dava-dosyasi/lib/cari-defter";
import {
  dosyaMasrafiSil,
  avansAktarimiSil,
  adliBirimHareketiSil,
  karsiTarafAlacagiSil,
} from "@/modules/dava-dosyasi/lib/actions";
import { TahsilDegistirButonu } from "@/modules/dava-dosyasi/components/tahsil-degistir-butonu";

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

function SilButonu({ silme, dosyaId }: { silme: SilmeKaynagi; dosyaId: string }) {
  switch (silme.tip) {
    case "masraf":
      return (
        <OnayliButon sifreIste eylem={dosyaMasrafiSil.bind(null, silme.id, dosyaId)} mesaj="Bu masraf kaydı silinsin mi?">
          Sil
        </OnayliButon>
      );
    case "avansAktarimi":
      return (
        <OnayliButon
          sifreIste
          eylem={avansAktarimiSil.bind(null, silme.id, dosyaId)}
          mesaj="Bu aktarım silinsin mi? Bakiyeler eski haline döner."
        >
          Sil
        </OnayliButon>
      );
    case "adliBirim":
      return (
        <OnayliButon sifreIste eylem={adliBirimHareketiSil.bind(null, silme.id, dosyaId)} mesaj="Bu hareket silinsin mi?">
          Sil
        </OnayliButon>
      );
    case "karsiTarafAlacagi":
      return (
        <OnayliButon
          sifreIste
          eylem={karsiTarafAlacagiSil.bind(null, silme.id, dosyaId)}
          mesaj="Bu alacak kaydı silinsin mi?"
        >
          Sil
        </OnayliButon>
      );
  }
}

// Klasik cari hesap defteri: Tarih - İşlem Açıklama - Borç - Alacak - Bakiye.
// Bakiye kumulatif (Borç − Alacak); "bakiyeYorumu" panel basina farkli
// cumleyle toplam bakiyeyi duz Turkce ile anlatir.
export function CariDefter({
  satirlar,
  dosyaId,
  silmeYetkisiVar,
  bosMesaj,
  bakiyeYorumu,
  tersBakiye = false,
}: {
  satirlar: DefterSatiri[];
  dosyaId: string;
  silmeYetkisiVar: boolean;
  bosMesaj: string;
  bakiyeYorumu: (bakiye: number) => string;
  // Havuz (101) defteri: bakiye = Alacak - Borc (bekleyen para), diger hesaplar Borc - Alacak.
  tersBakiye?: boolean;
}) {
  if (satirlar.length === 0) {
    return <p className="text-sm text-white/40">{bosMesaj}</p>;
  }

  const toplamBorc = satirlar.reduce((t, s) => t + s.borc, 0);
  const toplamAlacak = satirlar.reduce((t, s) => t + s.alacak, 0);
  const isaret = tersBakiye ? -1 : 1;
  const kumulatif = isaret * (toplamBorc - toplamAlacak);
  const hesaplanan = satirlar.map((s, i) => ({
    ...s,
    bakiye: isaret * satirlar.slice(0, i + 1).reduce((t, x) => t + x.borc - x.alacak, 0),
  }));
  const bakiyeRenk = (b: number) =>
    tersBakiye
      ? b > 0 ? "text-[#6db8ff]" : "text-white/60"
      : b > 0 ? "text-[#ff7a70]" : b < 0 ? "text-[#32d74b]" : "text-white/60";
  const bakiyeYaz = (b: number) =>
    tersBakiye
      ? paraFormatlayici.format(b)
      : `${paraFormatlayici.format(Math.abs(b))}${b > 0 ? " (B)" : b < 0 ? " (A)" : ""}`;

  return (
    <div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">İşlem Açıklama</th>
              <th className="px-4 py-3 text-right font-medium">Borç</th>
              <th className="px-4 py-3 text-right font-medium">Alacak</th>
              <th className="px-4 py-3 text-right font-medium">Bakiye</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {hesaplanan.map((s) => (
              <tr key={s.id} className="border-t border-white/[0.06]">
                <td className="whitespace-nowrap px-4 py-3 text-white/60">{tarihFormatlayici.format(s.tarih)}</td>
                <td className="px-4 py-3 text-white/85">{s.aciklama}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-white/85">
                  {s.borc > 0 ? paraFormatlayici.format(s.borc) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-white/85">
                  {s.alacak > 0 ? paraFormatlayici.format(s.alacak) : "—"}
                </td>
                <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${bakiyeRenk(s.bakiye)}`}>
                  {bakiyeYaz(s.bakiye)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {s.tahsilDegistir && (
                      <TahsilDegistirButonu
                        alacakId={s.tahsilDegistir.id}
                        dosyaId={dosyaId}
                        tahsilEdildiMi={s.tahsilDegistir.tahsilEdildiMi}
                      />
                    )}
                    {s.duzenleHref && (
                      <Link href={s.duzenleHref} className="text-xs text-[#6db8ff] hover:underline">
                        Düzenle
                      </Link>
                    )}
                    {s.silme && (s.silme.tip === "adliBirim" || silmeYetkisiVar) && (
                      <SilButonu silme={s.silme} dosyaId={dosyaId} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t border-white/10 font-medium">
              <td className="px-4 py-3 text-white" colSpan={2}>
                Toplam
              </td>
              <td className="px-4 py-3 text-right text-white">{paraFormatlayici.format(toplamBorc)}</td>
              <td className="px-4 py-3 text-right text-white">{paraFormatlayici.format(toplamAlacak)}</td>
              <td className={`px-4 py-3 text-right ${bakiyeRenk(kumulatif)}`}>{bakiyeYaz(kumulatif)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-white/60">{bakiyeYorumu(kumulatif)}</p>
      {!tersBakiye && <p className="mt-1 text-xs text-white/35">(B) = Borç bakiyesi, (A) = Alacak bakiyesi.</p>}
    </div>
  );
}
