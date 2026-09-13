import { Alan, Etiket, Girdi } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";

export function KarsiTarafAlacagiFormu({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-3">
      <Alan>
        <Etiket htmlFor="ktaTutar">Tutar</Etiket>
        <ParaGirdisi id="ktaTutar" name="tutar" required />
      </Alan>
      <div className="sm:col-span-2">
        <Alan>
          <Etiket htmlFor="ktaAciklama">Açıklama</Etiket>
          <Girdi id="ktaAciklama" name="aciklama" required placeholder="İcra vekalet ücreti vb." />
        </Alan>
      </div>
      <div className="sm:col-span-3">
        <Dugme type="submit">Alacak Kaydı Ekle</Dugme>
      </div>
    </form>
  );
}
