import type { IrtibatKisisi } from "@prisma/client";
import { IrtibatKisisiSilmeButonu } from "@/modules/musteri/components/irtibat-kisisi-silme-butonu";

export function IrtibatKisileriListesi({
  kisiler,
  musteriId,
  silmeYetkisiVar,
}: {
  kisiler: IrtibatKisisi[];
  musteriId: string;
  silmeYetkisiVar: boolean;
}) {
  if (kisiler.length === 0) {
    return <p className="text-sm text-white/40">Henüz irtibat kişisi eklenmedi.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {kisiler.map((kisi) => (
        <div key={kisi.id} className="glass rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-white">{kisi.adSoyad}</p>
                {kisi.birincilMi && (
                  <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                    Birincil
                  </span>
                )}
              </div>
              {kisi.unvanGorev && <p className="mt-0.5 text-sm text-white/55">{kisi.unvanGorev}</p>}
            </div>
            {silmeYetkisiVar && (
              <IrtibatKisisiSilmeButonu musteriId={musteriId} kisiId={kisi.id} />
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div>
              <p className="text-white/45">Telefon</p>
              <p className="text-white">{kisi.telefon ?? "—"}</p>
            </div>
            <div>
              <p className="text-white/45">E-posta</p>
              <p className="text-white">{kisi.eposta ?? "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-white/45">Hangi Konularda</p>
              <p className="text-white">{kisi.konuBasligi ?? "—"}</p>
            </div>
            {kisi.notlar && (
              <div className="col-span-2 md:col-span-4">
                <p className="text-white/45">Notlar</p>
                <p className="whitespace-pre-wrap text-white">{kisi.notlar}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
