"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { gorunumTercihiniKaydet } from "./actions";
import {
  CAM_ETIKETLERI,
  CAM_KADEMELERI,
  PALETLER,
  PALET_BILGISI,
  PUNTO_ETIKETLERI,
  PUNTO_KADEMELERI,
  TEMA_ETIKETLERI,
  TEMA_MODLARI,
  VARSAYILAN_GORUNUM,
  type GorunumTercihi,
} from "./sabitler";
import { cookieGorunumunuOku, gorunumCookiesiniYaz, gorunumuUygula } from "./gorunum-uygulayici";

// Üst çubuktaki "Görünüm" düğmesi: mod (açık/koyu/sistem), renk paleti ve cam
// kademesi. Seçim ANINDA ekrana yansır, cookie'ye yazılır (ilk boyama için) ve
// arka planda kullanıcının hesabına kaydedilir (başka cihazda da aynı gelsin).
export function GorunumMenusu() {
  const [acik, setAcik] = useState(false);
  const [tercih, setTercih] = useState<GorunumTercihi>(VARSAYILAN_GORUNUM);
  const [, baslat] = useTransition();
  const kapsayici = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cookie yalnızca tarayıcıda okunabilir; ilk render sunucuyla aynı kalsın diye mount'ta alınır.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTercih(cookieGorunumunuOku());
  }, []);

  useEffect(() => {
    if (!acik) return;
    const disTikla = (e: PointerEvent) => {
      if (!kapsayici.current?.contains(e.target as Node)) setAcik(false);
    };
    const escKapat = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };
    document.addEventListener("pointerdown", disTikla);
    document.addEventListener("keydown", escKapat);
    return () => {
      document.removeEventListener("pointerdown", disTikla);
      document.removeEventListener("keydown", escKapat);
    };
  }, [acik]);

  function degistir(yeni: Partial<GorunumTercihi>) {
    const sonuc = { ...tercih, ...yeni };
    setTercih(sonuc);
    gorunumuUygula(sonuc);
    gorunumCookiesiniYaz(sonuc);
    baslat(() => {
      void gorunumTercihiniKaydet(sonuc).catch(() => {
        // Kayıt başarısız olursa cookie yine de bu cihazda tercihi korur.
      });
    });
  }

  return (
    <div ref={kapsayici} className="relative">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-haspopup="dialog"
        aria-expanded={acik}
        aria-label="Görünüm ayarları"
        title="Görünüm"
        className="glass inline-flex h-8 w-8 md:h-9 md:w-9  items-center justify-center rounded-full text-white/85 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-3.9-4-7.2-9-7.2Z" />
          <circle cx="7.5" cy="11" r="1" fill="currentColor" />
          <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
          <circle cx="15" cy="7.5" r="1" fill="currentColor" />
        </svg>
      </button>

      {acik && (
        <div
          role="dialog"
          aria-label="Görünüm ayarları"
          className="popover absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-2xl p-4 text-sm"
        >
          <Baslik>Mod</Baslik>
          <Segment
            degerler={TEMA_MODLARI}
            etiketler={TEMA_ETIKETLERI}
            secili={tercih.tema}
            sec={(tema) => degistir({ tema })}
          />

          <Baslik className="mt-4">Renk</Baslik>
          <div className="grid grid-cols-2 gap-2">
            {PALETLER.map((palet) => {
              const bilgi = PALET_BILGISI[palet];
              const seciliMi = tercih.palet === palet;
              return (
                <button
                  key={palet}
                  type="button"
                  onClick={() => degistir({ palet })}
                  aria-pressed={seciliMi}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    seciliMi
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                      : "border-white/10 text-white/70 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="flex shrink-0 overflow-hidden rounded-full border border-black/10">
                    <i className="block h-5 w-3" style={{ background: bilgi.renkler[0] }} />
                    <i className="block h-5 w-3" style={{ background: bilgi.renkler[1] }} />
                    <i className="block h-5 w-3" style={{ background: bilgi.renkler[2] }} />
                  </span>
                  <span className="min-w-0 leading-tight">{bilgi.ad}</span>
                </button>
              );
            })}
          </div>

          <Baslik className="mt-4">Yazı boyutu</Baslik>
          <Segment
            degerler={PUNTO_KADEMELERI}
            etiketler={PUNTO_ETIKETLERI}
            secili={tercih.punto}
            sec={(punto) => degistir({ punto })}
          />

          <Baslik className="mt-4">Saydamlık</Baslik>
          <Segment
            degerler={CAM_KADEMELERI}
            etiketler={CAM_ETIKETLERI}
            secili={tercih.cam}
            sec={(cam) => degistir({ cam })}
          />
          <p className="mt-2 text-xs leading-snug text-white/50">
            Yüzeylerin ne kadar saydam olacağını belirler. “Kapalı” tam opaktır; en sade ve okunaklı görünüm budur.
          </p>
        </div>
      )}
    </div>
  );
}

function Baslik({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-1.5 text-[11px] font-medium uppercase tracking-wide text-white/45 ${className}`}>{children}</p>;
}

function Segment<T extends string>({
  degerler,
  etiketler,
  secili,
  sec,
}: {
  degerler: readonly T[];
  etiketler: Record<T, string>;
  secili: T;
  sec: (d: T) => void;
}) {
  return (
    <div className="flex rounded-full border border-white/10 p-0.5" role="group">
      {degerler.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => sec(d)}
          aria-pressed={secili === d}
          className={`flex-1 rounded-full px-2 py-1.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            secili === d ? "bg-[var(--accent)] font-medium text-white" : "text-white/65 hover:bg-white/[0.06]"
          }`}
        >
          {etiketler[d]}
        </button>
      ))}
    </div>
  );
}
