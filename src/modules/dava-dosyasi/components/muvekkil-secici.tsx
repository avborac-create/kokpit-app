"use client";

import { TelefonGirdisi } from "@/core/ui/telefon-girdisi";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Etiket, Girdi, Secim } from "@/core/ui/form";
import { MersisAra } from "@/core/unvan/mersis-ara";
import { KISA_UNVAN_ONAY_METNI, KISA_UNVAN_UYARISI, unvanKisaMi } from "@/core/unvan/unvan-kontrol";
import { EKSIK_BILGI_ONAY_METNI, eksikBilgiUyarisi, telefonBosMu } from "@/core/unvan/eksik-bilgi-kontrol";
import { hizliMusteriOlustur, hizliMusteriSecenekleri } from "@/modules/musteri/lib/actions";

type Musteri = { id: string; adSoyadUnvan: string };

// Müvekkil secimi: bir dosyaya BIRDEN FAZLA muvekkil baglanabilir (bkz.
// DosyaMuvekkili ara tablosu), bu yuzden checkbox mantigi (musteriIds adiyla
// birden fazla hidden input) korunur - degisen sadece GORUNUM: artik acilir
// bir menu/panel icinde, arama kutusuyla. Kapaliyken secili olanlar
// (varsa) etiket halinde gosterilir.
export function MuvekkilSecici({
  musteriler: musterilerProp,
  seciliIdler = [],
}: {
  musteriler: Musteri[];
  seciliIdler?: string[];
}) {
  const [eklenenler, setEklenenler] = useState<Musteri[]>([]);
  const musteriler = useMemo(() => [...musterilerProp, ...eklenenler.filter((e) => !musterilerProp.some((m) => m.id === e.id))], [musterilerProp, eklenenler]);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniTip, setYeniTip] = useState("");
  const [yeniTel, setYeniTel] = useState("");
  const [yeniOnay, setYeniOnay] = useState(false);
  const [eksikOnay, setEksikOnay] = useState(false);
  const [yeniHata, setYeniHata] = useState("");
  const [yeniMesgul, setYeniMesgul] = useState(false);
  const [tipler, setTipler] = useState<{ id: string; etiket: string; tuzel: boolean }[]>([]);
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

  // Ana form (Yeni Dosya) acik kalir: pencere ayri bir katmandir, kaydedince yeni muvekkil otomatik secilir.
  function yeniPenceresiniAc() {
    setYeniAd(arama.trim());
    setYeniHata("");
    setYeniOnay(false);
    setEksikOnay(false);
    setYeniAcik(true);
    setAcikMi(false);
    if (tipler.length === 0) void hizliMusteriSecenekleri().then((s) => setTipler(s.tipler)).catch(() => setYeniHata("Tip listesi yüklenemedi."));
  }

  const yeniKisa = yeniAd.trim() !== "" && unvanKisaMi(yeniAd, tipler.find((t) => t.id === yeniTip)?.tuzel ?? false);

  async function yeniKaydet() {
    setYeniHata("");
    setYeniMesgul(true);
    try {
      const s = await hizliMusteriOlustur({ ad: yeniAd, tipId: yeniTip, telefon: yeniTel, kisaOnay: yeniOnay, eksikOnay });
      if (s.hata || !s.id) {
        setYeniHata(s.hata ?? "Kaydedilemedi.");
        return;
      }
      setEklenenler((onceki) => [...onceki, { id: s.id!, adSoyadUnvan: s.ad ?? yeniAd }]);
      setSecililer((onceki) => [...onceki, s.id!]);
      setYeniAcik(false);
      setYeniAd("");
      setYeniTel("");
      setYeniTip("");
      setArama("");
    } finally {
      setYeniMesgul(false);
    }
  }

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
              className="fixed z-[101] rounded-xl border border-white/10 bg-[var(--background-2)] p-2 shadow-2xl"
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
              <button type="button" onClick={yeniPenceresiniAc} className="mt-2 w-full border-t border-white/10 px-2 pb-1 pt-2.5 text-left text-sm font-medium text-[var(--link)] hover:underline">
                {arama.trim() && filtrelenmis.length === 0 ? `“${arama.trim()}” kayıtlı değil, yeni müvekkil olarak ekle` : "+ Yeni müvekkil ekle"}
              </button>
            </div>
          </>,
          document.body,
        )}
        {yeniAcik &&
          createPortal(
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" onKeyDown={(e) => e.key === "Escape" && setYeniAcik(false)}>
              <div className="max-h-[92vh] w-full max-w-md overflow-y-auto border border-white/15 bg-[var(--background-2)] p-5 shadow-2xl" role="dialog" aria-label="Yeni müvekkil">
                <h3 className="mb-1 text-lg font-semibold text-white">Yeni müvekkil</h3>
                <p className="mb-4 text-sm text-white/55">Kaydedince müvekkil bu dosyaya otomatik seçilir; doldurduğunuz dosya formu olduğu gibi kalır. Diğer bilgileri sonra Müvekkiller bölümünden tamamlayabilirsiniz.</p>
                <div className="mb-3">
                  <Etiket htmlFor="hm-ad">Ad Soyad / Ünvan</Etiket>
                  <Girdi id="hm-ad" value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} autoFocus />
                  <div className="mt-1.5">
                    <MersisAra ad={yeniAd} />
                  </div>
                </div>
                <div className="mb-3">
                  <Etiket htmlFor="hm-tip">Tip</Etiket>
                  <Secim id="hm-tip" value={yeniTip} onChange={(e) => setYeniTip(e.target.value)}>
                    <option value="" disabled>
                      Seçiniz…
                    </option>
                    {tipler.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.etiket}
                      </option>
                    ))}
                  </Secim>
                </div>
                <div className="mb-3">
                  <Etiket htmlFor="hm-tel">Telefon (zorunlu)</Etiket>
                  <TelefonGirdisi id="hm-tel" value={yeniTel} onChange={setYeniTel} />
                  <p className="mt-1 text-xs text-white/45">+90 hazır yazılıdır, başına 0 yazmayın; 10 rakam girin. Yabancı numara için + ile başlayın.</p>
                </div>
                {telefonBosMu(yeniTel) && (
                  <div className="mb-3 rounded-xl border border-[#f2b04c]/40 bg-[#f2b04c]/10 p-3 text-sm text-[#f3d9a8]">
                    <p>{eksikBilgiUyarisi(["Telefon"])}</p>
                    <label className="mt-2 flex items-start gap-2 text-white/85">
                      <input type="checkbox" checked={eksikOnay} onChange={(e) => setEksikOnay(e.target.checked)} className="mt-1 h-4 w-4 accent-[#f2b04c]" />
                      <span>{EKSIK_BILGI_ONAY_METNI}</span>
                    </label>
                  </div>
                )}
                {yeniKisa && (
                  <div className="mb-3 rounded-xl border border-[#f2b04c]/40 bg-[#f2b04c]/10 p-3 text-sm text-[#f3d9a8]">
                    <p>{KISA_UNVAN_UYARISI}</p>
                    <label className="mt-2 flex items-start gap-2 text-white/85">
                      <input type="checkbox" checked={yeniOnay} onChange={(e) => setYeniOnay(e.target.checked)} className="mt-1 h-4 w-4 accent-[#f2b04c]" />
                      <span>{KISA_UNVAN_ONAY_METNI}</span>
                    </label>
                  </div>
                )}
                {yeniHata && <p className="mb-3 text-sm text-red-300">{yeniHata}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setYeniAcik(false)} className="border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
                    Vazgeç
                  </button>
                  <button type="button" onClick={yeniKaydet} disabled={yeniMesgul || !yeniAd.trim() || !yeniTip || (yeniKisa && !yeniOnay) || (telefonBosMu(yeniTel) && !eksikOnay)} className="bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {yeniMesgul ? "Ekleniyor…" : "Müvekkili ekle"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
