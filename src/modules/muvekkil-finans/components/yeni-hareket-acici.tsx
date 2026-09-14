"use client";

import { useState } from "react";
import { Dugme } from "@/core/ui/button";

// "Yeni Hareket" butonu - tiklaninca formu acar/kapatir (bkz.
// ParaTrafigiDetaylar ile ayni ac/kapa deseni). Kayit basariyla
// eklendiginde sayfa yeniden render edilir (revalidatePath) ve bu bilesen
// de varsayilan (kapali) durumuna doner.
export function YeniHareketAcici({ children }: { children: React.ReactNode }) {
  const [acikMi, setAcikMi] = useState(false);

  return (
    <div className="mb-6">
      <Dugme type="button" varyant="birincil" onClick={() => setAcikMi((a) => !a)}>
        {acikMi ? "Kapat" : "+ Yeni Hareket"}
      </Dugme>
      {acikMi && <div className="mt-3">{children}</div>}
    </div>
  );
}
