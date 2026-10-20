import Link from "next/link";
import { OnayliButon } from "@/core/ui/onayli-buton";
import type { DefterSatiri } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { hareketSil, virmanSil } from "@/modules/dava-dosyasi/lib/cari-sistem-actions";
import { dosyaMasrafiSil, avansAktarimiSil } from "@/modules/dava-dosyasi/lib/actions";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihBicimi = new Intl.DateTimeFormat("tr-TR");

function SilButonu({ satir }: { satir: DefterSatiri }) {
  const silme = satir.silme;
  if (!silme) return null;
  switch (silme.tip) {
    case "hareket":
      return (
        <OnayliButon sifreIste eylem={hareketSil.bind(null, silme.id)} mesaj="Bu kayıt silinsin mi?">
          Sil
        </OnayliButon>
      );
    case "virman":
      return (
        <OnayliButon sifreIste eylem={virmanSil.bind(null, silme.id)} mesaj="Bu virman (iki taraftaki kaydıyla birlikte) silinsin mi?">
          Sil
        </OnayliButon>
      );
    case "masraf":
      return (
        <OnayliButon
          sifreIste
          eylem={dosyaMasrafiSil.bind(null, silme.id, satir.dosyaId ?? "")}
          mesaj="Bu masraf kaydı silinsin mi?"
        >
          Sil
        </OnayliButon>
      );
    case "avansAktarimi":
      return (
        <OnayliButon
          sifreIste
          eylem={avansAktarimiSil.bind(null, silme.id, satir.dosyaId ?? "")}
          mesaj="Bu aktarım silinsin mi? Bakiyeler eski haline döner."
        >
          Sil
        </OnayliButon>
      );
  }
}

// Bakiye KAYITLARDAN hesaplanir: birikimli (running) ve toplam satiri her
// zaman satirlarin toplamidir - elle formul / satir siniri yoktur.
export function Defter({
  satirlar,
  paraHesabiMi,
  tutulanHesapMi = false,
  dosyaSutunu,
  silmeYetkisiVar,
  bosMesaj,
}: {
  satirlar: DefterSatiri[];
  paraHesabiMi: boolean;
  // Adliyede vb. tutulan para: bakiye = Alacak - Borc (orada duran tutar)
  tutulanHesapMi?: boolean;
  dosyaSutunu: boolean;
  silmeYetkisiVar: boolean;
  bosMesaj: string;
}) {
  if (satirlar.length === 0) return <p className="text-sm text-white/40">{bosMesaj}</p>;

  const tersBakiye = paraHesabiMi || tutulanHesapMi;
  const isaret = tersBakiye ? -1 : 1;
  const hesaplanan = satirlar.map((s, i) => ({
    ...s,
    bakiye: isaret * satirlar.slice(0, i + 1).reduce((t, x) => t + x.borc - x.alacak, 0) || 0,
  }));
  const birikim = hesaplanan[hesaplanan.length - 1].bakiye;
  const toplamBorc = satirlar.reduce((t, s) => t + s.borc, 0);
  const toplamAlacak = satirlar.reduce((t, s) => t + s.alacak, 0);
  const renk = (b: number) =>
    tersBakiye ? (b > 0 ? "text-[#6db8ff]" : "text-white/60") : b > 0 ? "text-[#ff7a70]" : b < 0 ? "text-[#32d74b]" : "text-white/60";

  return (
    <div>
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Tarih</th>
              {dosyaSutunu && <th className="px-4 py-3 font-medium">Dosya</th>}
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 text-right font-medium">Borç</th>
              <th className="px-4 py-3 text-right font-medium">Alacak</th>
              <th className="px-4 py-3 text-right font-medium">Bakiye</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {hesaplanan.map((s) => (
              <tr key={s.id} className={`border-t border-white/[0.06] ${s.turetilmis ? "italic opacity-70" : ""}`}>
                <td className="whitespace-nowrap px-4 py-3 text-white/60">{tarihBicimi.format(s.tarih)}</td>
                {dosyaSutunu && (
                  <td className="px-4 py-3">
                    {s.dosyaEtiketi ? (
                      <span className="whitespace-nowrap rounded-full bg-white/[0.07] px-2.5 py-0.5 text-xs text-white/75">
                        {s.dosyaEtiketi}
                      </span>
                    ) : (
                      <span className="text-xs text-white/35">havuz</span>
                    )}
                  </td>
                )}
                <td className="whitespace-pre-line px-4 py-3 text-white/85">
                  {s.aciklama}
                  {s.borcludan && (
                    <span className="ml-2 whitespace-nowrap rounded-full bg-[#ffb340]/15 px-2 py-0.5 text-[11px] text-[#ffb340]">
                      Borçludan
                    </span>
                  )}
                  {s.odemeYontemi && (
                    <span className="ml-2 whitespace-nowrap rounded-full bg-[#6db8ff]/15 px-2 py-0.5 text-[11px] text-[#6db8ff]">
                      {s.odemeYontemi}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-white/85">{s.borc > 0 ? para.format(s.borc) : "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-white/85">{s.alacak > 0 ? para.format(s.alacak) : "—"}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${renk(s.bakiye)}`}>{para.format(s.bakiye)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {s.duzenleHref && (
                      <Link href={s.duzenleHref} className="text-xs text-[#6db8ff] hover:underline">
                        Düzenle
                      </Link>
                    )}
                    {silmeYetkisiVar && <SilButonu satir={s} />}
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t border-white/10 font-medium">
              <td className="px-4 py-3 text-white" colSpan={dosyaSutunu ? 3 : 2}>
                Toplam
              </td>
              <td className="px-4 py-3 text-right text-white">{para.format(toplamBorc)}</td>
              <td className="px-4 py-3 text-right text-white">{para.format(toplamAlacak)}</td>
              <td className={`px-4 py-3 text-right ${renk(birikim)}`}>{para.format(birikim)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-white/35">
        {tutulanHesapMi
          ? "Bakiye = Alacak − Borç (bu hesapta/adliyede şu an duran tutar; iade edilince Borç olarak düşer)."
          : paraHesabiMi
          ? "Bakiye = Alacak − Borç (müvekkilin henüz dağıtılmamış parası)."
          : "Bakiye = Borç − Alacak (müvekkilin bu hesaptaki kalan borcu; eksi ise fazla ödeme)."}
      </p>
    </div>
  );
}
