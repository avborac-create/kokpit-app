import { Alan, Etiket, Secim } from "@/core/ui/form";

export function UyusmazlikGrubuSecici({
  gruplar,
  varsayilanGrubuId = "",
}: {
  gruplar: { id: string; ad: string }[];
  varsayilanGrubuId?: string;
}) {
  if (gruplar.length === 0) return null;

  return (
    <Alan>
      <Etiket htmlFor="uyusmazlikGrubuId">Uyuşmazlık Grubu (opsiyonel)</Etiket>
      <Secim id="uyusmazlikGrubuId" name="uyusmazlikGrubuId" defaultValue={varsayilanGrubuId}>
        <option value="">Dosya seçimiyle yetinilsin (—)</option>
        {gruplar.map((grup) => (
          <option key={grup.id} value={grup.id}>
            {grup.ad}
          </option>
        ))}
      </Secim>
      <p className="mt-1 text-xs text-white/35">
        Belirli bir dosyaya değil, tüm gruba ait bir avans/tahsilatsa (ör. henüz açılmamış bir haciz
        işlemi için) burayı seçin — dosya seçimi zorunlu değildir.
      </p>
    </Alan>
  );
}
