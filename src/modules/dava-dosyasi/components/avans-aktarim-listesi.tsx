"use client";

import { OnayliButon } from "@/core/ui/onayli-buton";
import Link from "next/link";
import { dosyaKisaNo } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { avansAktarimiSil } from "@/modules/dava-dosyasi/lib/actions";

type DosyaOzeti = { id: string; kayitNo: number; altSiraNo?: number | null; anaDosya?: { kayitNo: number } | null; buroNo: string | null; dosyaNo: string | null; birimAdi: string | null };

export type AktarimSatiri = {
  id: string;
  tarih: Date;
  tutar: number;
  aciklama: string;
  cariKodEtiketi: string;
  kaynakDosya: DosyaOzeti;
  hedefDosya: DosyaOzeti;
};

const paraFormatlayici = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

function DosyaBaglantisi({ dosya }: { dosya: DosyaOzeti }) {
  return (
    <Link
      href={`/kokpit/dava-dosyalari/${dosya.id}`}
      title={dosya.buroNo ? "OBJEKT BÜRO NO" : undefined}
      className="hover:text-[#6db8ff] hover:underline"
    >
      {dosyaKisaNo(dosya)}
      {dosya.dosyaNo ? ` · ${dosya.dosyaNo}` : ""}
    </Link>
  );
}

export function AvansAktarimListesi({
  aktarimlar,
  dosyaId,
  silmeYetkisiVar,
}: {
  aktarimlar: AktarimSatiri[];
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  if (aktarimlar.length === 0) {
    return <p className="text-sm text-white/40">Bu dosyayla ilgili avans aktarımı yok.</p>;
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="px-4 py-3 font-medium">Tarih</th>
            <th className="px-4 py-3 font-medium">Yön</th>
            <th className="px-4 py-3 font-medium">Kaynak → Hedef</th>
            <th className="px-4 py-3 font-medium">Cari Kod</th>
            <th className="px-4 py-3 font-medium">Açıklama</th>
            <th className="px-4 py-3 font-medium">Tutar</th>
            {silmeYetkisiVar && <th className="px-4 py-3 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {aktarimlar.map((a) => (
            <AktarimSatir key={a.id} aktarim={a} dosyaId={dosyaId} silmeYetkisiVar={silmeYetkisiVar} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AktarimSatir({
  aktarim,
  dosyaId,
  silmeYetkisiVar,
}: {
  aktarim: AktarimSatiri;
  dosyaId: string;
  silmeYetkisiVar: boolean;
}) {
  const cikisMi = aktarim.kaynakDosya.id === dosyaId;

  return (
    <tr className="border-t border-white/[0.06]">
      <td className="px-4 py-3 text-white/60">{tarihFormatlayici.format(aktarim.tarih)}</td>
      <td className="px-4 py-3">
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${
            cikisMi ? "bg-[#ff7a70]/15 text-[#ff7a70]" : "bg-[#32d74b]/15 text-[#32d74b]"
          }`}
        >
          {cikisMi ? "Çıkış" : "Giriş"}
        </span>
      </td>
      <td className="px-4 py-3 text-white/70">
        <DosyaBaglantisi dosya={aktarim.kaynakDosya} /> → <DosyaBaglantisi dosya={aktarim.hedefDosya} />
      </td>
      <td className="px-4 py-3 text-white/60">{aktarim.cariKodEtiketi}</td>
      <td className="px-4 py-3 text-white/85">{aktarim.aciklama}</td>
      <td className="px-4 py-3 font-medium text-white">
        {cikisMi ? "−" : "+"}
        {paraFormatlayici.format(aktarim.tutar)}
      </td>
      {silmeYetkisiVar && (
        <td className="px-4 py-3">
          <OnayliButon
 sifreIste
 eylem={(sifre) => avansAktarimiSil(aktarim.id, dosyaId, sifre)}
 mesaj="Bu aktarım silinsin mi? Bakiyeler eski haline döner."
 >
 Sil
 </OnayliButon>
        </td>
      )}
    </tr>
  );
}
