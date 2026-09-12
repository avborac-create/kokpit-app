import { musteriOlustur } from "@/modules/musteri/lib/actions";
import { MusteriFormu } from "@/modules/musteri/components/musteri-formu";

export default function YeniMusteriSayfasi() {
  return (
    <div className="pt-3">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">Yeni Müvekkil</h1>
      <MusteriFormu action={musteriOlustur} gonderButonuMetni="Oluştur" />
    </div>
  );
}
