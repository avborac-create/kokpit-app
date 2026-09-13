import { ParaGirdisi } from "@/core/ui/para-girdisi";

export function TasnifGirisi({
  cariKodlar,
}: {
  cariKodlar: { id: string; etiket: string }[];
}) {
  return (
    <div className="col-span-2 mb-4 md:col-span-4">
      <p className="mb-1 block text-sm font-medium text-white/70">
        Tasnif (opsiyonel) — gelen tutarın cari kodlara göre dağılımı
      </p>
      <div className="glass grid grid-cols-2 gap-3 rounded-xl p-3 sm:grid-cols-4">
        {cariKodlar.map((kod) => (
          <div key={kod.id}>
            <label htmlFor={`tasnif_${kod.id}`} className="mb-1 block text-xs text-white/55">
              {kod.etiket}
            </label>
            <ParaGirdisi id={`tasnif_${kod.id}`} name={`tasnif_${kod.id}`} />
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-white/35">
        Toplamı girilen tutarla eşleşmek zorunda değil; kayıt sonrası listede karşılaştırmalı gösterilir.
      </p>
    </div>
  );
}
