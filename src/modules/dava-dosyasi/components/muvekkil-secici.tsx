"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Girdi } from "@/core/ui/form";

type Musteri = { id: string; adSoyadUnvan: string };

// Müvekkil secimi: bir dosyaya BIRDEN FAZLA muvekkil baglanabilir (bkz.
// DosyaMuvekkili ara tablosu), bu yuzden checkbox mantigi (musteriIds adiyla
// birden fazla hidden input) korunur - degisen sadece GORUNUM: artik acilir
// bir menu/panel icinde, arama kutusuyla. Kapaliyken secili olanlar
// (varsa) etiket halinde gosterilir.
export function MuvekkilSecici({
  musteriler,
  seciliIdler = [],
}: {
  musteriler: Musteri[];
  seciliIdler?: string[];
}) {
  const [secililer, setSecililer] = useState<string[]>(seciliIdler);
  const [acikMi, setAcikMi] = useState(false);
  const [arama, setArama] = useState("");
  const dugmeRef = useRef<HTMLButtonElement>(null);
  const [konum, setKonum] = useState<{ top: number; left: number; width: number } | null>(null);

  // Liste .glass kartin icinde kalirsa (transform/isolation -> kendi katmani)
  // sonraki kartlar ustune biner ve saydam zemin yuzunden alttaki yazilar
  // gorunur. Bu yuzden body'ye portal + opak zemin + fixed konum kullanilir.
  useEffect(() => {
    if (!acikMi) return;
    function konumla() {
      const r = dugmeRef.current?.getBoundingClientRect();
      if (r) setKonum({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    konumla();
    window.addEventListener("resize", konumla);
    window.addEventListener("scroll", konumla, true);
    return () => {
      window.removeEventListener("resize", konumla);
      window.removeEventListener("scroll", konumla, true);
    };
  }, [acikMi]);

  const filtrelenmis = useMemo(() => {
    const temiz = arama.trim().toLocaleLowerCase("tr-TR");
    if (!temiz) return musteriler;
    return musteriler.filter((m) => m.adSoyadUnvan.toLocaleLowerCase("tr-TR").includes(temiz));
  }, [musteriler, arama]);

  const seciliMusteriler = musteriler.filter((m) => secililer.includes(m.id));

  function secimiDegistir(id: string) {
    setSecililer((onceki) => (onceki.includes(id) ? onceki.filter((s) => s !== id) : [...onceki, id]));
  }

  return (
    <div className="mb-4">
      <p className="mb-1 block text-sm font-medium text-white/70">Müvekkil</p>

      {secililer.map((id) => (
        <input key={id} type="hidden" name="musteriIds" value={id} />
      ))}

      <div className="relative">
        <button
          ref={dugmeRef}
          type="button"
          onClick={() => setAcikMi((onceki) => !onceki)}
          className="glass flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-white/85"
        >
          <span className="truncate">
            {seciliMusteriler.length > 0
              ? seciliMusteriler.map((m) => m.adSoyadUnvan).join(", ")
              : "Seçiniz…"}
          </span>
          <span className="ml-2 shrink-0 text-white/35">▾</span>
        </button>

        {acikMi &&
          konum &&
          createPortal(
          <>
            <div
              className="fixed inset-0 z-[100]"
              onClick={() => {
                setAcikMi(false);
                setArama("");
              }}
            />
            <div
              className="fixed z-[101] rounded-xl border border-white/10 bg-[#1b1e28] p-2 shadow-2xl"
              style={{ top: konum.top, left: konum.left, width: konum.width }}
            >
              <Girdi
                type="text"
                placeholder="Müvekkil ara…"
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                autoFocus
                className="mb-2 !py-1.5"
              />
              <div className="max-h-48 overflow-y-auto">
                {filtrelenmis.length === 0 && (
                  <p className="px-2 py-1 text-sm text-white/40">
                    {musteriler.length === 0 ? "Kayıtlı müvekkil yok." : "Sonuç bulunamadı."}
                  </p>
                )}
                {filtrelenmis.map((musteri) => (
                  <label
                    key={musteri.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/[0.06]"
                  >
                    <input
                      type="checkbox"
                      checked={secililer.includes(musteri.id)}
                      onChange={() => secimiDegistir(musteri.id)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--accent)]"
                    />
                    {musteri.adSoyadUnvan}
                  </label>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
      </div>
    </div>
  );
}
