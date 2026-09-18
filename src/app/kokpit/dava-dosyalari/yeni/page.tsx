import { hukukDosyasiOlustur } from "@/modules/dava-dosyasi/lib/actions";
import { HukukDosyasiFormu } from "@/modules/dava-dosyasi/components/hukuk-dosyasi-formu";

export default async function YeniDavaDosyasiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ musteriId?: string }>;
}) {
  const { musteriId } = await searchParams;

  return (
    <div className="pt-3">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">Yeni Hukuk Dosyası</h1>
      <HukukDosyasiFormu
        action={hukukDosyasiOlustur}
        gonderButonuMetni="Oluştur"
        onSecilenMusteriId={musteriId}
      />
    </div>
  );
}
