"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { etiketleriKaydet } from "@/core/arayuz-etiketi/actions";
import { Dugme } from "./button";
import { Girdi, MetinAlani, Secim } from "./form";

export type KartAlani = {
  anahtar: string;
  varsayilanEtiket: string;
  // salt: yalnizca etiketi degistirilebilir (deger baska yerden gelir)
  tip: "metin" | "tarih" | "cokSatir" | "secim" | "salt";
  deger?: string;
  gosterim: React.ReactNode;
  secenekler?: { value: string; label: string }[];
  // Etiketin yaninda soluk yazilan kisa aciklama (ör. "icra / dava / arabuluculuk gibi").
  ipucu?: string;
};

// Kart basligi ve alan etiketlerini (yonetici) ve alan degerlerini (herkes)
// kartin kendisinde, "Paneli düzenle" ile yerinde degistirmeyi saglar.
// Basliklar/etiketler tum kullanicilar icin ortaktir ve anahtara gore
// saklanir (bkz. core/arayuz-etiketi); degerler ise onKaydet ile kaydedilir.
export function DuzenlenebilirKart({
  etiketOnEki,
  varsayilanBaslik,
  etiketler,
  alanlar,
  etiketDuzenleyebilir,
  onKaydet,
  children,
  duz = false,
}: {
  etiketOnEki: string; // ör. "dosya-detay.dosya-bilgileri"
  varsayilanBaslik: string;
  etiketler: Record<string, string>;
  alanlar: KartAlani[];
  etiketDuzenleyebilir: boolean;
  onKaydet?: (degerler: Record<string, string>) => Promise<void>;
  children?: React.ReactNode;
  // true: ayri cam kart yerine ortak bir kartin icinde ince ayiracli bolum olarak cizilir.
  duz?: boolean;
}) {
  const router = useRouter();
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [bekliyor, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [yeniEtiketler, setYeniEtiketler] = useState<Record<string, string>>({});
  const [yeniDegerler, setYeniDegerler] = useState<Record<string, string>>({});

  const baslikAnahtari = `${etiketOnEki}.baslik`;
  const alanAnahtari = (a: string) => `${etiketOnEki}.alan.${a}`;
  const gecerliBaslik = etiketler[baslikAnahtari] ?? varsayilanBaslik;
  const gecerliEtiket = (a: KartAlani) => etiketler[alanAnahtari(a.anahtar)] ?? a.varsayilanEtiket;
  const duzenlenebilirDeger = alanlar.some((a) => a.tip !== "salt") && Boolean(onKaydet);

  const bosMu = (a: KartAlani) => typeof a.gosterim === "string" && (a.gosterim.trim() === "" || a.gosterim.trim() === "—");
  const dolular = duz ? alanlar.filter((a) => !bosMu(a)) : alanlar;
  const bosAlanlar = duz ? alanlar.filter(bosMu) : [];

  function ac() {
    setHata(null);
    setYeniEtiketler({
      [baslikAnahtari]: gecerliBaslik,
      ...Object.fromEntries(alanlar.map((a) => [alanAnahtari(a.anahtar), gecerliEtiket(a)])),
    });
    setYeniDegerler(
      Object.fromEntries(alanlar.filter((a) => a.tip !== "salt").map((a) => [a.anahtar, a.deger ?? ""])),
    );
    setDuzenleniyor(true);
  }

  function kaydet() {
    setHata(null);
    startTransition(async () => {
      try {
        if (etiketDuzenleyebilir) {
          const varsayilanlar: Record<string, string> = {
            [baslikAnahtari]: varsayilanBaslik,
            ...Object.fromEntries(alanlar.map((a) => [alanAnahtari(a.anahtar), a.varsayilanEtiket])),
          };
          const degisenler: Record<string, string> = {};
          for (const [anahtar, metin] of Object.entries(yeniEtiketler)) {
            const mevcut = etiketler[anahtar] ?? varsayilanlar[anahtar];
            if (metin.trim() === mevcut) continue;
            // Varsayilana geri donuldu ya da bos birakildi: kaydi sil.
            degisenler[anahtar] = metin.trim() === varsayilanlar[anahtar] ? "" : metin;
          }
          if (Object.keys(degisenler).length > 0) await etiketleriKaydet(degisenler);
        }
        if (onKaydet) {
          const degisenDegerler: Record<string, string> = {};
          for (const a of alanlar) {
            if (a.tip === "salt") continue;
            if ((yeniDegerler[a.anahtar] ?? "") !== (a.deger ?? "")) {
              degisenDegerler[a.anahtar] = yeniDegerler[a.anahtar] ?? "";
            }
          }
          if (Object.keys(degisenDegerler).length > 0) await onKaydet(degisenDegerler);
        }
        setDuzenleniyor(false);
        router.refresh();
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  return (
    <div className={duz ? "glass mb-3 rounded-2xl p-4 sm:p-5" : "glass mb-4 rounded-2xl p-4 sm:p-5"}>
      <div className={`flex items-center justify-between gap-2 ${duz && !duzenleniyor ? "mb-3" : "mb-4"}`}>
        {duzenleniyor && etiketDuzenleyebilir ? (
          <input
            value={yeniEtiketler[baslikAnahtari] ?? ""}
            onChange={(e) => setYeniEtiketler((o) => ({ ...o, [baslikAnahtari]: e.target.value }))}
            aria-label="Kart başlığı"
            className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white outline-none focus:border-[var(--accent)]"
          />
        ) : (
          <h3 className={`text-xs font-semibold uppercase ${duz ? "tracking-[0.14em] text-white/85" : "tracking-widest text-white/50"}`}>{gecerliBaslik}</h3>
        )}
        {!duzenleniyor && (etiketDuzenleyebilir || duzenlenebilirDeger) && (
          <button
            type="button"
            onClick={ac}
            className={`shrink-0 rounded-full px-2.5 py-1 text-sm hover:bg-white/10 hover:text-white ${duz ? "bg-white/[0.07] text-white/75" : "text-white/65"}`}
          >
            Paneli düzenle
          </button>
        )}
      </div>

      {duz && !duzenleniyor ? (
        <>
          <div className="-mx-4 overflow-hidden border-y border-white/[0.08] sm:-mx-5">
            {dolular.map((a) => (
              <div
                key={a.anahtar}
                className="grid grid-cols-1 gap-x-4 border-b border-white/[0.06] px-4 py-1.5 last:border-b-0 sm:grid-cols-[minmax(7.5rem,10rem)_minmax(0,1fr)] sm:px-5"
              >
                <p className="pt-0.5 text-xs font-medium text-[#8fb4e8] sm:text-[13px]">{gecerliEtiket(a)}</p>
                <div className="break-words text-[15px] font-semibold text-white">{a.gosterim}</div>
              </div>
            ))}
          </div>
          {bosAlanlar.length > 0 && (
            <p className="mt-4 border-t border-white/[0.08] pt-3 text-xs text-white/45">
              Boş: {bosAlanlar.map((a) => gecerliEtiket(a)).join(" · ")}
              {duzenlenebilirDeger && (
                <>
                  {" · "}
                  <button type="button" onClick={ac} className="text-[#8fb4e8] hover:underline">
                    doldur
                  </button>
                </>
              )}
            </p>
          )}
        </>
      ) : (
      <div className={`grid grid-cols-2 gap-x-4 sm:gap-x-6 ${duz ? "gap-y-2 sm:gap-y-2.5" : "gap-y-3"} sm:grid-cols-2 xl:grid-cols-3`}>
      {alanlar.map((a) => (
        <div
          key={a.anahtar}
          className={`min-w-0 text-[15px] font-medium ${a.tip === "salt" || a.tip === "cokSatir" || duzenleniyor ? "col-span-2 sm:col-span-2 xl:col-span-3" : typeof a.gosterim === "string" && a.gosterim.length > 20 ? "col-span-2 sm:col-span-1" : ""}`}
        >
          {duzenleniyor ? (
            <>
              {etiketDuzenleyebilir ? (
                <input
                  value={yeniEtiketler[alanAnahtari(a.anahtar)] ?? ""}
                  onChange={(e) => setYeniEtiketler((o) => ({ ...o, [alanAnahtari(a.anahtar)]: e.target.value }))}
                  aria-label={`${a.varsayilanEtiket} etiketi`}
                  className="mb-1 w-full rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-xs text-white/70 outline-none focus:border-[var(--accent)]"
                />
              ) : (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#8fb4e8]">
                  {gecerliEtiket(a)}
                </p>
              )}
              {a.tip === "salt" ? (
                <div className="text-white/80">{a.gosterim}</div>
              ) : a.tip === "cokSatir" ? (
                <MetinAlani
                  rows={3}
                  value={yeniDegerler[a.anahtar] ?? ""}
                  onChange={(e) => setYeniDegerler((o) => ({ ...o, [a.anahtar]: e.target.value }))}
                />
              ) : a.tip === "secim" ? (
                <Secim
                  value={yeniDegerler[a.anahtar] ?? ""}
                  onChange={(e) => setYeniDegerler((o) => ({ ...o, [a.anahtar]: e.target.value }))}
                >
                  {a.secenekler?.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Secim>
              ) : (
                <Girdi
                  type={a.tip === "tarih" ? "date" : "text"}
                  value={yeniDegerler[a.anahtar] ?? ""}
                  onChange={(e) => setYeniDegerler((o) => ({ ...o, [a.anahtar]: e.target.value }))}
                />
              )}
            </>
          ) : (
            <>
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-[#8fb4e8]">
                {gecerliEtiket(a)}
              </p>
              <div className="text-white">{a.gosterim}</div>
            </>
          )}
        </div>
      ))}
      </div>
      )}

      {children}

      {duzenleniyor && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Dugme type="button" boyut="kompakt" onClick={kaydet} disabled={bekliyor}>
            Kaydet
          </Dugme>
          <Dugme
            type="button"
            varyant="ikincil"
            boyut="kompakt"
            onClick={() => setDuzenleniyor(false)}
            disabled={bekliyor}
          >
            Vazgeç
          </Dugme>
          {!etiketDuzenleyebilir && (
            <span className="text-xs text-white/40">Başlık ve etiketleri yalnızca yönetici değiştirebilir.</span>
          )}
          {hata && <span className="text-sm text-[#ff7a70]">{hata}</span>}
        </div>
      )}
    </div>
  );
}
