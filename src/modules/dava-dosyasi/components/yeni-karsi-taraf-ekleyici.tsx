"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";

// Bir ismi yazip "Ekle" ile listeye ekleme, sonra bir sonraki isim icin
// ayni akisi tekrarlama - kullanicinin istedigi "bir ekle, sonra bir daha
// ekle" akisi. Her eklenen isim gizli bir input olarak forma tasinir,
// sunucu tarafinda formData.getAll("yeniKarsiTarafAdlari") ile okunur.
export function YeniKarsiTarafEkleyici() {
  const [eklenenler, setEklenenler] = useState<string[]>([]);
  const [girdi, setGirdi] = useState("");

  function ekle() {
    const ad = girdi.trim();
    if (!ad) return;
    setEklenenler((liste) => [...liste, ad]);
    setGirdi("");
  }

  function kaldir(index: number) {
    setEklenenler((liste) => liste.filter((_, i) => i !== index));
  }

  return (
    <Alan>
      <Etiket htmlFor="yeniKarsiTarafGirdi">Yeni Karşı Taraf Ekle</Etiket>
      <div className="flex gap-2">
        <Girdi
          id="yeniKarsiTarafGirdi"
          value={girdi}
          onChange={(e) => setGirdi(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ekle();
            }
          }}
          placeholder="Koz Gıda"
        />
        <Dugme type="button" varyant="ikincil" onClick={ekle}>
          Ekle
        </Dugme>
      </div>
      {eklenenler.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {eklenenler.map((ad, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/85"
            >
              <input type="hidden" name="yeniKarsiTarafAdlari" value={ad} />
              {ad}
              <button
                type="button"
                onClick={() => kaldir(i)}
                className="text-white/40 hover:text-[#ff7a70]"
                aria-label={`${ad} kaldır`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </Alan>
  );
}
