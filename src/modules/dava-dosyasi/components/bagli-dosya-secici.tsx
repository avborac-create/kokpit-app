"use client";

import { useState, useTransition } from "react";
import { Alan, Etiket, Girdi } from "@/core/ui/form";
import { bagliDosyaAra } from "@/modules/dava-dosyasi/lib/actions";
import type { BagliDosyaAday } from "@/modules/dava-dosyasi/lib/queries";

function dosyaEtiketi(dosya: BagliDosyaAday): string {
  return `KP-${String(dosya.kayitNo).padStart(4, "0")}${dosya.dosyaNo ? ` — ${dosya.dosyaNo}` : ""} — ${dosya.konu}`;
}

// Yeni/mevcut dosya formunda "Bağlantılı Dosya Seçimi": sistemde kayıtlı
// dosyalar arasından arama kutulu, açılır menü stilinde TEK bir dosya
// seçtirir (bkz. DavaDosyasi.bagliOlduguDosyaId - talimat dosyası gibi
// başka bir dosyanın uzantısı olan dosyalar için). Büroda çok sayıda dosya
// olabileceğinden liste hep sunucuda (arama kutusuyla) filtrelenir, tüm
// dosyalar tarayıcıya baştan yüklenmez.
export function BagliDosyaSecici({
  dosyaId,
  baslangicSecili,
}: {
  dosyaId?: string;
  baslangicSecili: BagliDosyaAday | null;
}) {
  const [secili, setSecili] = useState<BagliDosyaAday | null>(baslangicSecili);
  const [acikMi, setAcikMi] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [sonuclar, setSonuclar] = useState<BagliDosyaAday[]>([]);
  const [, startTransition] = useTransition();

  function ara(deger: string) {
    setSorgu(deger);
    startTransition(async () => {
      const sonuc = await bagliDosyaAra(deger, dosyaId);
      setSonuclar(sonuc);
    });
  }

  return (
    <Alan>
      <Etiket htmlFor="bagliDosyaAramaKutusu">Bağlantılı Dosya Seçimi (opsiyonel)</Etiket>
      <input type="hidden" name="bagliOlduguDosyaId" value={secili?.id ?? ""} />

      {secili && !acikMi ? (
        <div className="glass flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-white/85">
          <span className="truncate">{dosyaEtiketi(secili)}</span>
          <button
            type="button"
            onClick={() => setSecili(null)}
            className="shrink-0 text-xs text-white/40 hover:text-white/70"
          >
            Kaldır
          </button>
        </div>
      ) : (
        <div className="relative">
          <Girdi
            id="bagliDosyaAramaKutusu"
            type="text"
            placeholder="Dosya no veya konu ile arayın…"
            value={sorgu}
            onFocus={() => {
              setAcikMi(true);
              if (sonuclar.length === 0) ara("");
            }}
            onChange={(e) => ara(e.target.value)}
          />
          {acikMi && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setAcikMi(false);
                  setSorgu("");
                }}
              />
              <div className="glass absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl p-1">
                {sonuclar.length === 0 && (
                  <p className="px-3 py-2 text-sm text-white/40">Sonuç bulunamadı.</p>
                )}
                {sonuclar.map((dosya) => (
                  <button
                    key={dosya.id}
                    type="button"
                    onClick={() => {
                      setSecili(dosya);
                      setAcikMi(false);
                      setSorgu("");
                    }}
                    className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-white/85 hover:bg-white/[0.08]"
                  >
                    {dosyaEtiketi(dosya)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <p className="mt-1 text-xs text-white/35">
        Talimat dosyası gibi başka bir dosyanın uzantısı olan dosyalar için: hangi dosyayla
        ilişkilendirileceğini buradan arayıp seçin (örn. bir icra dosyasının haciz için başka bir
        icra dairesine gönderilen talimat dosyası).
      </p>
    </Alan>
  );
}
