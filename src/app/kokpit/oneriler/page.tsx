import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { onerileriListele } from "@/core/oneri/queries";
import { OneriSatiri } from "@/core/oneri/oneri-satiri";

export default async function OnerilerSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const oneriler = await onerileriListele();
  const islenmemisler = oneriler.filter((o) => !o.islendiMi);
  const islenmisler = oneriler.filter((o) => o.islendiMi);

  return (
    <div className="pt-3">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Öneriler</h1>
      <p className="mb-6 text-sm text-white/50">
        Kullanıcıların sayfalar üzerinden ilettiği değişiklik önerileri.
      </p>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">
          Bekleyenler {islenmemisler.length > 0 && `(${islenmemisler.length})`}
        </h2>
        {islenmemisler.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-white/40">
            Bekleyen öneri yok.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {islenmemisler.map((oneri) => (
              <OneriSatiri key={oneri.id} oneri={oneri} />
            ))}
          </div>
        )}
      </div>

      {islenmisler.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-white/40">İşlenmiş</h2>
          <div className="flex flex-col gap-3">
            {islenmisler.map((oneri) => (
              <OneriSatiri key={oneri.id} oneri={oneri} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
