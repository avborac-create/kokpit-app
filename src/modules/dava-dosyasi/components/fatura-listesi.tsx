"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { davaDosyasiGetir } from "@/modules/dava-dosyasi/lib/queries";
import { dosyaFaturasiSil, dosyaFaturasiDurumDegistir } from "@/modules/dava-dosyasi/lib/actions";
import { Dugme } from "@/core/ui/button";

type DosyaDetay = NonNullable<Awaited<ReturnType<typeof davaDosyasiGetir>>>;
// Prisma'nin Decimal tipi Server->Client Component sinirini gecemez;
// bkz. MasrafListesi'ndeki ayni not.
type Fatura = Omit<DosyaDetay["faturalar"][number], "tutar"> & { tutar: number };

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

// Faturalarin YONETIM listesi (duzenle/sil/iptal) - dosyaCariHesapDefteri
// dokumunden farkli: o, tahsilatla BIRLESTIRILMIS salt-okunur bir kosan
// bakiye gosterir; bu liste sadece fatura tarafinin tek tek satirlarini
// yonetmek icindir (bkz. dosya kartindaki "Cari Hesap" sekmesi).
export function FaturaListesi({
  faturalar,
  dosyaId,
  silmeYetkisiVar,
}: {
  faturalar: Fatura[];
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  if (faturalar.length === 0) {
    return <p className="text-sm text-white/40">Bu dosyaya kesilmiş fatura yok.</p>;
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Tarih</th>
            <th className="px-4 py-3 font-medium">Tür</th>
            <th className="px-4 py-3 font-medium">Açıklama</th>
            <th className="px-4 py-3 font-medium">Tutar</th>
            <th className="px-4 py-3 font-medium">Durum</th>
            <th className="px-4 py-3 font-medium" />
            {silmeYetkisiVar && <th className="px-4 py-3 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {faturalar.map((fatura) => (
            <FaturaSatiri key={fatura.id} fatura={fatura} dosyaId={dosyaId} silmeYetkisiVar={silmeYetkisiVar} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FaturaSatiri({
  fatura,
  dosyaId,
  silmeYetkisiVar,
}: {
  fatura: Fatura;
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  const [durumPending, durumDegistir] = useTransition();
  const [silmePending, sil] = useTransition();
  const iptalMi = fatura.durum?.kod === "iptal_edildi";

  return (
    <tr className={`border-t border-white/[0.06] ${iptalMi ? "opacity-50" : ""}`}>
      <td className="px-4 py-3 text-white/60">{tarihFormatlayici.format(fatura.tarih)}</td>
      <td className="px-4 py-3 text-white/60">{fatura.tur.etiket}</td>
      <td className="px-4 py-3 text-white/85">{fatura.aciklama}</td>
      <td className="px-4 py-3 font-medium text-white">{paraFormatlayici.format(fatura.tutar)}</td>
      <td className="px-4 py-3">
        {iptalMi ? (
          <span className="whitespace-nowrap rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-white/50">
            İptal Edildi
          </span>
        ) : (
          <span className="whitespace-nowrap rounded-full bg-[#30d158]/15 px-2.5 py-0.5 text-xs text-[#30d158]">
            Geçerli
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/kokpit/dava-dosyalari/${dosyaId}/faturalar/${fatura.id}/duzenle`}
            className="text-xs text-[#6db8ff] hover:underline"
          >
            Düzenle
          </Link>
          <Dugme
            type="button"
            varyant="ikincil"
            disabled={durumPending}
            onClick={() =>
              durumDegistir(() =>
                dosyaFaturasiDurumDegistir(fatura.id, dosyaId, iptalMi ? "gecerli" : "iptal_edildi"),
              )
            }
          >
            {iptalMi ? "Geçerli Yap" : "İptal Et"}
          </Dugme>
        </div>
      </td>
      {silmeYetkisiVar && (
        <td className="px-4 py-3">
          <Dugme
            type="button"
            varyant="tehlike"
            disabled={silmePending}
            onClick={() => {
              if (window.confirm("Bu fatura kaydı silinsin mi?")) {
                sil(() => dosyaFaturasiSil(fatura.id, dosyaId));
              }
            }}
          >
            Sil
          </Dugme>
        </td>
      )}
    </tr>
  );
}
