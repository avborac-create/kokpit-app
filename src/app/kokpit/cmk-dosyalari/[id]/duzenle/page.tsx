import Link from "next/link";
import { notFound } from "next/navigation";
import { cmkDosyasiGuncelle } from "@/modules/cmk-dosyalari/lib/actions";
import {
  cmkDosyasiGetir,
  musterileriCMKIcinListele,
  cmkBirimleriListele,
} from "@/modules/cmk-dosyalari/lib/queries";
import { CMKFormu } from "@/modules/cmk-dosyalari/components/cmk-formu";

export default async function CMKDosyasiDuzenlemeSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dosya, musteriler, birimOnerileri] = await Promise.all([
    cmkDosyasiGetir(id),
    musterileriCMKIcinListele(),
    cmkBirimleriListele(),
  ]);
  if (!dosya) notFound();

  return (
    <div className="pt-3">
      <Link href="/kokpit/cmk-dosyalari" className="text-sm text-[#6db8ff] hover:underline">
        ‹ CMK Dosyaları
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold tracking-tight text-white">
        {dosya.adSoyad} — CMK Dosyasını Düzenle
      </h1>
      <CMKFormu
        action={cmkDosyasiGuncelle.bind(null, id)}
        dosya={dosya}
        musteriler={musteriler}
        birimOnerileri={birimOnerileri}
        gonderButonuMetni="Güncelle"
      />
    </div>
  );
}
