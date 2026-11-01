import { BildirimAyari } from "./bildirim-ayari";

export default function BildirimlerSayfasi() {
  return (
    <div className="mx-auto max-w-2xl pt-3">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Bildirimler</h1>
      <p className="mb-5 mt-1 text-sm text-white/55">Yeni iş atandığında ya da size bir şey yazıldığında telefonunuza/bilgisayarınıza bildirim gelsin.</p>
      <BildirimAyari />
    </div>
  );
}
