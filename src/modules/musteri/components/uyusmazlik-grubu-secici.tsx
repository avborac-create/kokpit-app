import Link from "next/link";
import { Alan, Etiket, Secim } from "@/core/ui/form";

export function UyusmazlikGrubuSecici({
  kumeler,
  varsayilanKumeId = "",
  zorunluMu = false,
}: {
  kumeler: { id: string; ad: string }[];
  varsayilanKumeId?: string;
  zorunluMu?: boolean;
}) {
  if (kumeler.length === 0) {
    if (!zorunluMu) return null;
    return (
      <div className="col-span-2 md:col-span-4">
        <p className="glass rounded-xl px-4 py-3 text-sm text-white/60">
          Bu tür için Dosya Kümesi seçimi zorunlu, ama bu müvekkilin henüz bir kümesi yok.{" "}
          <Link href="/kokpit/dava-dosyalari/kumeler/yeni" className="text-[#6db8ff] hover:underline">
            Önce bir Dosya Kümesi oluşturun
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <Alan>
      <Etiket htmlFor="uyusmazlikGrubuId">Dosya Kümesi{zorunluMu ? "" : " (opsiyonel)"}</Etiket>
      <Secim id="uyusmazlikGrubuId" name="uyusmazlikGrubuId" required={zorunluMu} defaultValue={varsayilanKumeId}>
        <option value="" disabled={zorunluMu}>
          {zorunluMu ? "Seçiniz…" : "Dosya seçimiyle yetinilsin (—)"}
        </option>
        {kumeler.map((kume) => (
          <option key={kume.id} value={kume.id}>
            {kume.ad}
          </option>
        ))}
      </Secim>
      {!zorunluMu && (
        <p className="mt-1 text-xs text-white/35">
          Belirli bir dosyaya değil, tüm kümeye ait bir avans/tahsilatsa (ör. henüz açılmamış bir haciz
          işlemi için) burayı seçin — dosya seçimi zorunlu değildir.
        </p>
      )}
    </Alan>
  );
}
