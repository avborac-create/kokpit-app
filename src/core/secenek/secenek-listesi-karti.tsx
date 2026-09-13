import { secenekDegeriEkle } from "@/core/secenek/admin-actions";
import { SecenekDegeriSatiri } from "@/core/secenek/secenek-degeri-satiri";
import { Dugme } from "@/core/ui/button";
import { Girdi } from "@/core/ui/form";

type Liste = {
  id: string;
  anahtar: string;
  ad: string;
  degerler: { id: string; kod: string; etiket: string; siraNo: number; aktifMi: boolean }[];
};

export function SecenekListesiKarti({ liste }: { liste: Liste }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-white">{liste.ad}</h2>
        <span className="text-xs text-white/35">{liste.anahtar}</span>
      </div>

      {liste.degerler.length === 0 ? (
        <p className="mb-3 text-sm text-white/40">Henüz değer yok.</p>
      ) : (
        <div className="mb-3 overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-left text-sm">
            <thead className="text-white/40">
              <tr>
                <th className="px-4 py-2 font-medium">Etiket</th>
                <th className="px-4 py-2 font-medium">Kod</th>
                <th className="px-4 py-2 font-medium">Sıra</th>
                <th className="px-4 py-2 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {liste.degerler.map((deger, i) => (
                <SecenekDegeriSatiri
                  key={deger.id}
                  deger={deger}
                  ilkMi={i === 0}
                  sonMu={i === liste.degerler.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        action={secenekDegeriEkle.bind(null, liste.id)}
        className="flex items-center gap-2"
      >
        <Girdi name="etiket" placeholder="Yeni değer (ör. Bilirkişi Ücreti)" required className="max-w-xs" />
        <Dugme type="submit" varyant="ikincil">
          + Ekle
        </Dugme>
      </form>
    </div>
  );
}
