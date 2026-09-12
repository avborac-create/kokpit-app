import { davaDosyasiOlustur } from "@/modules/dava-dosyasi/lib/actions";
import { DavaDosyasiFormu } from "@/modules/dava-dosyasi/components/dava-dosyasi-formu";

export default async function YeniDavaDosyasiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ musteriId?: string }>;
}) {
  const { musteriId } = await searchParams;

  return (
    <div className="pt-3">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">Yeni Dava Dosyası</h1>
      <DavaDosyasiFormu
        action={davaDosyasiOlustur}
        gonderButonuMetni="Oluştur"
        onSecilenMusteriId={musteriId}
      />
    </div>
  );
}
