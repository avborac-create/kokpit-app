"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dosyaAlanlariniGuncelle, yeniEsasTuruBaslat, type DurumTuruKaydi } from "@/modules/dava-dosyasi/lib/actions";

type DurumSecenegi = { id: string; etiket: string; kod: string };

// Dosya Durum Kodu: tek satirlik kompakt "yasam cizgisi". Asil yol (Hazirlaniyor ->
// Kesinlesme Serhi) cizgi uzerinde adimlar halinde; "Yargilamanin Yenilenmesi" ve
// "Diger Durum" cizgi disindaki kesik cizgili hap olarak gosterilir. Bir adima
// tiklamak (onayla) durumu kaydeder (liste Ayarlar > Secenek Listeleri'nden
// duzenlenir; listeye eklenen yeni durumlar cizgiye eklenir).
// - Istinaf'ta / Yargitay'da: kacinci gidis oldugu belirtilir (1 ise yazilmaz).
// - Diger Durum: adi kullanici yazar.
const YAN_YOL_KODU = "yargilamanin_yenilenmesi";
const DIGER_KODU = "diger";
const GIDIS_KODLARI = ["istinafta", "yargitayda"];

const gidisli = (kod?: string) => !!kod && GIDIS_KODLARI.includes(kod);
// "Yeni Esas" secenekleri yeni bir TUR baslatir (onceki tur gecmise yazilir).
const yeniEsasMi = (kod?: string) => !!kod && kod.startsWith("yeni_esas");
const tarihBicimi = new Intl.DateTimeFormat("tr-TR");

export function DosyaDurumBandi({
  dosyaId,
  secenekler,
  seciliId,
  gidisSayisi,
  digerAdi,
  turGecmisi,
}: {
  dosyaId: string;
  secenekler: DurumSecenegi[];
  seciliId: string | null;
  gidisSayisi: number | null;
  digerAdi: string | null;
  turGecmisi: DurumTuruKaydi[];
}) {
  const router = useRouter();
  const [bekliyor, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [secili, setSecili] = useState(seciliId);
  const [gidis, setGidis] = useState<number>(gidisSayisi ?? 1);
  const [diger, setDiger] = useState(digerAdi ?? "");
  const [onayBekleyen, setOnayBekleyen] = useState<string | null>(null); // onay bekleyen durum id'si ("" = secimi kaldir)
  const [girdiGidis, setGirdiGidis] = useState(1);
  const [girdiDiger, setGirdiDiger] = useState("");
  const [girdiYeniNo, setGirdiYeniNo] = useState("");
  const [gecmisAcik, setGecmisAcik] = useState(false);
  const aktifRef = useRef<HTMLLIElement | null>(null);

  // Dar ekranda cizgi yatay kayar; secili adim gorunur alana gelsin.
  useEffect(() => {
    const el = aktifRef.current;
    if (el?.parentElement) el.parentElement.scrollLeft = el.offsetLeft - el.parentElement.clientWidth / 2 + el.clientWidth / 2;
  }, [secili]);

  const yol = secenekler.filter((s) => s.kod !== YAN_YOL_KODU && s.kod !== DIGER_KODU);
  const yanYol = secenekler.find((s) => s.kod === YAN_YOL_KODU);
  const digerSecenek = secenekler.find((s) => s.kod === DIGER_KODU);
  const seciliSecenek = secenekler.find((s) => s.id === secili) ?? null;
  const seciliSira = yol.findIndex((s) => s.id === secili);
  const onayHedefi = onayBekleyen ? secenekler.find((x) => x.id === onayBekleyen) : undefined;

  // Gosterilecek ad: "Istinaf'ta (2. gidis)" ya da kullanicinin yazdigi diger durum adi.
  function gorunenAd(s: DurumSecenegi | null | undefined) {
    if (!s) return "";
    if (s.kod === DIGER_KODU) return diger.trim() || s.etiket;
    if (gidisli(s.kod) && s.id === secili && gidis > 1) return `${s.etiket} (${gidis}. gidiş)`;
    return s.etiket;
  }

  // Tiklama dogrudan kaydetmez; once kullanicidan onay istenir.
  function iste(id: string) {
    setHata(null);
    setOnayBekleyen(id === secili ? "" : id); // seciliye tekrar tiklamak temizler
    setGirdiGidis(gidis > 1 ? gidis : 1);
    setGirdiDiger(diger);
    setGirdiYeniNo("");
  }

  function sec(yeni: string) {
    const hedef = secenekler.find((x) => x.id === yeni);
    if (hedef?.kod === DIGER_KODU && !girdiDiger.trim()) {
      setHata("Diğer durumun adını yazın.");
      return;
    }
    setOnayBekleyen(null);
    setHata(null);
    const onceki = secili;
    const oncekiGidis = gidis;
    const oncekiDiger = diger;
    const yeniGidis = gidisli(hedef?.kod) ? Math.max(1, girdiGidis) : 1;
    const yeniDiger = hedef?.kod === DIGER_KODU ? girdiDiger.trim() : "";
    setSecili(yeni || null);
    setGidis(yeniGidis);
    setDiger(yeniDiger);
    const yeniTur = yeniEsasMi(hedef?.kod) && !yeniEsasMi(seciliSecenek?.kod) && !!yeni;
    startTransition(async () => {
      try {
        if (yeniTur) {
          await yeniEsasTuruBaslat(dosyaId, { durumKoduId: yeni, yeniDosyaNo: girdiYeniNo });
          router.refresh();
          return;
        }
        await dosyaAlanlariniGuncelle(dosyaId, {
          durumKoduId: yeni,
          durumGidisSayisi: yeniGidis > 1 ? String(yeniGidis) : "",
          durumDiger: yeniDiger,
        });
        router.refresh();
      } catch (e) {
        setSecili(onceki);
        setGidis(oncekiGidis);
        setDiger(oncekiDiger);
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  function gidisDegistir(yeni: number) {
    const n = Math.min(20, Math.max(1, yeni));
    const onceki = gidis;
    setGidis(n);
    setHata(null);
    startTransition(async () => {
      try {
        await dosyaAlanlariniGuncelle(dosyaId, { durumGidisSayisi: n > 1 ? String(n) : "" });
        router.refresh();
      } catch (e) {
        setGidis(onceki);
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  if (secenekler.length === 0) return null;

  const yanPill = (aktif: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
      aktif
        ? "border-[var(--accent)] bg-[var(--accent)] text-[#0b1d36]"
        : "border-dashed border-white/30 text-white/60 hover:border-[#8fb4e8] hover:text-white"
    }`;

  return (
    <div
      className={`glass mb-3 rounded-2xl border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent-soft)] to-transparent px-3 py-2.5 sm:px-4 sm:py-3 ${bekliyor ? "opacity-80" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-y-3">
        <div className="order-1 min-w-0 flex-1 sm:min-w-[9rem] sm:flex-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8fb4e8]">Dosya durumu</p>
          <p className={`text-lg font-bold leading-tight sm:text-xl ${seciliSecenek ? "text-white" : "text-white/40"}`}>
            {seciliSecenek ? gorunenAd(seciliSecenek) : "Seçilmedi"}
          </p>
          {turGecmisi.length > 0 && (
            <button
              type="button"
              onClick={() => setGecmisAcik((a) => !a)}
              aria-expanded={gecmisAcik}
              className="mt-0.5 rounded-full border border-[var(--accent)]/50 px-2 py-0.5 text-[11px] font-semibold text-[#8fb4e8] hover:border-[var(--accent)]"
            >
              {turGecmisi.length + 1}. Tur · geçmiş {gecmisAcik ? "▴" : "▾"}
            </button>
          )}
          {gidisli(seciliSecenek?.kod) && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/60">
              Gidiş sayısı
              <button type="button" disabled={bekliyor || gidis <= 1} onClick={() => gidisDegistir(gidis - 1)} aria-label="Gidiş sayısını azalt" className="h-5 w-5 rounded-full border border-white/25 leading-none hover:border-[#8fb4e8] disabled:opacity-30">−</button>
              <b className="min-w-[1ch] text-center text-white">{gidis}</b>
              <button type="button" disabled={bekliyor || gidis >= 20} onClick={() => gidisDegistir(gidis + 1)} aria-label="Gidiş sayısını artır" className="h-5 w-5 rounded-full border border-white/25 leading-none hover:border-[#8fb4e8] disabled:opacity-30">+</button>
            </p>
          )}
        </div>

        <ol className="order-3 m-0 flex min-w-0 basis-full list-none snap-x snap-mandatory gap-0 overflow-x-auto px-1 pb-1 pt-1.5 [scrollbar-width:none] sm:order-2 sm:basis-0 sm:flex-1 [&::-webkit-scrollbar]:hidden" aria-label="Dosya durum kodu">
          {yol.map((s, i) => {
            const aktif = s.id === secili;
            const gecildi = seciliSira > i;
            return (
              <li key={s.id} ref={aktif ? aktifRef : undefined} className="relative min-w-[6rem] flex-1 snap-center">
                {/* Cizgi noktanin tam ortasindan gecer (nokta merkezi 8.5px, cizgi 3px). Sol yarim secili adima kadar, sag yarim secili adimdan once dolu. */}
                {i > 0 && (
                  <span
                    aria-hidden
                    className={`absolute left-0 top-[7px] h-[3px] w-1/2 ${seciliSira >= i ? "bg-[var(--accent)]" : "bg-white/15"}`}
                  />
                )}
                {i < yol.length - 1 && (
                  <span
                    aria-hidden
                    className={`absolute right-0 top-[7px] h-[3px] w-1/2 ${gecildi ? "bg-[var(--accent)]" : "bg-white/15"}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => iste(s.id)}
                  disabled={bekliyor}
                  aria-pressed={aktif}
                  title={aktif ? "Seçimi kaldırmak için tıklayın" : `Durumu "${s.etiket}" yap`}
                  className="group relative flex w-full flex-col items-center gap-1 px-1 text-center outline-none"
                >
                  <span
                    className={`relative z-[1] h-[17px] w-[17px] rounded-full border-[3px] transition ${
                      aktif
                        ? "border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_0_4px_rgba(143,180,232,0.25)]"
                        : gecildi
                          ? "border-[var(--accent)] bg-[var(--accent)]"
                          : "border-white/25 bg-[#2f343c] group-hover:border-[#8fb4e8] group-focus-visible:border-[#8fb4e8]"
                    }`}
                  />
                  <span className={`text-[11px] leading-tight sm:text-xs ${aktif ? "font-bold text-white" : "font-medium text-white/60 group-hover:text-white"}`}>
                    {gorunenAd(s)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {(yanYol || digerSecenek) && (
          <div className="order-2 flex shrink-0 flex-wrap items-center gap-2 sm:order-3">
            {yanYol && (
              <button
                type="button"
                onClick={() => iste(yanYol.id)}
                disabled={bekliyor}
                aria-pressed={yanYol.id === secili}
                title="Kesinleşmiş dosyada açılan yan yol"
                className={yanPill(yanYol.id === secili)}
              >
                {yanYol.etiket}
              </button>
            )}
            {digerSecenek && (
              <button
                type="button"
                onClick={() => iste(digerSecenek.id)}
                disabled={bekliyor}
                aria-pressed={digerSecenek.id === secili}
                title="Listede olmayan bir durum için kendi adınızı yazın"
                className={yanPill(digerSecenek.id === secili)}
              >
                {digerSecenek.id === secili ? gorunenAd(digerSecenek) : "+ Diğer durum"}
              </button>
            )}
          </div>
        )}
      </div>
      {onayBekleyen !== null && (
        <div role="alertdialog" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          <span className="min-w-0 flex-1">
            {onayBekleyen
              ? <>Dosya durumu <b>“{onayHedefi?.kod === DIGER_KODU ? (girdiDiger.trim() || "Diğer Durum") : onayHedefi?.etiket}”</b> olarak değiştirilecektir. Onaylıyor musunuz?</>
              : <>Dosya durumu <b>“{gorunenAd(seciliSecenek)}”</b> seçimi kaldırılacaktır. Onaylıyor musunuz?</>}
          </span>
          {onayHedefi?.kod === DIGER_KODU && (
            <input
              type="text"
              autoFocus
              maxLength={80}
              value={girdiDiger}
              onChange={(e) => setGirdiDiger(e.target.value)}
              placeholder="Durumun adı (ör. Uzlaşma bekleniyor)"
              className="min-w-[14rem] rounded-lg border border-white/30 bg-black/20 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)]"
            />
          )}
          {yeniEsasMi(onayHedefi?.kod) && !yeniEsasMi(seciliSecenek?.kod) && (
            <label className="flex items-center gap-2 text-xs">
              Yeni esas no
              <input
                type="text"
                value={girdiYeniNo}
                onChange={(e) => setGirdiYeniNo(e.target.value)}
                placeholder="ör. 2026/201 Esas (boş bırakılabilir)"
                className="min-w-[14rem] rounded-lg border border-white/30 bg-black/20 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)]"
              />
            </label>
          )}
          {gidisli(onayHedefi?.kod) && (
            <label className="flex items-center gap-2 text-xs">
              Kaçıncı gidiş?
              <input
                type="number"
                min={1}
                max={20}
                value={girdiGidis}
                onChange={(e) => setGirdiGidis(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                className="w-16 rounded-lg border border-white/30 bg-black/20 px-2 py-1 text-xs text-white outline-none focus:border-[var(--accent)]"
              />
            </label>
          )}
          <button type="button" onClick={() => sec(onayBekleyen)} className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-[#0b1d36]">
            Evet, onaylıyorum
          </button>
          <button type="button" onClick={() => setOnayBekleyen(null)} className="rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold text-white/80">
            Vazgeç
          </button>
        </div>
      )}
      {gecmisAcik && turGecmisi.length > 0 && (
        <ul className="mt-3 space-y-1.5 rounded-xl border border-white/15 bg-black/15 px-3 py-2 text-xs text-white/80">
          {turGecmisi.map((t) => (
            <li key={t.tur}>
              <b className="text-white">{t.tur}. Tur</b>
              {t.dosyaNo ? ` · ${t.dosyaNo}` : ""}
              {t.durum ? ` · son durum: ${t.durum}${t.gidis && t.gidis > 1 ? ` (${t.gidis}. gidiş)` : ""}` : ""}
              {` → ${t.neden}`}
              {t.yeniDosyaNo ? ` (yeni esas: ${t.yeniDosyaNo})` : ""}
              {` · ${tarihBicimi.format(new Date(t.tarih))}`}
            </li>
          ))}
        </ul>
      )}
      {hata && <p className="mt-2 text-xs text-[#ff7a70]">{hata}</p>}
    </div>
  );
}
