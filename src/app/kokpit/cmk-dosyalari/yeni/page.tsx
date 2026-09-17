import Link from "next/link";
import { cmkDosyasiOlustur } from "@/modules/cmk-dosyalari/lib/actions";
import { musterileriCMKIcinListele, cmkBirimleriListele } from "@/modules/cmk-dosyalari/lib/queries";
import { CMKFormu } from "@/modules/cmk-dosyalari/components/cmk-formu";

export default async function YeniCMKDosyasiSayfasi() {
  const [musteriler, birimOnerileri] = await Promise.all([
    musterileriCMKIcinListele(),
    cmkBirimleriListele(),
  ]);

  return (
    <div className="pt-3">
      <Link href="/kokpit/cmk-dosyalari" className="text-sm text-[#6db8ff] hover:underline">
        ‹ CMK Dosyaları
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-semibold tracking-tight text-white">Yeni CMK Dosyası</h1>
      <CMKFormu
        action={cmkDosyasiOlustur}
        musteriler={musteriler}
        birimOnerileri={birimOnerileri}
        gonderButonuMetni="Oluştur"
      />
    </div>
  );
}
