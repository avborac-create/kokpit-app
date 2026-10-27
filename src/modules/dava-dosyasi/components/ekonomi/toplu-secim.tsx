"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dugme } from "@/core/ui/button";
import { Girdi } from "@/core/ui/form";
import { OnayliButon } from "@/core/ui/onayli-buton";
import { topluSil, topluTarihDegistir, tarihleriGeriYukle, type OncekiTarih, type TopluOge } from "@/modules/dava-dosyasi/lib/cari-sistem-actions";

// Toplu tarih degisikliklerinin geri alma yigini (Ctrl+Z); sayfa yenilenince sifirlanir.
const geriYigini: OncekiTarih[][] = [];
let yenileFn: (() => void) | null = null;
let dinleyiciKurulu = false;
const yigintiDinleyicileri = new Set<() => void>();
const yiginiBildir = () => yigintiDinleyicileri.forEach((f) => f());

async function sonIsleminiGeriAl(): Promise<string | null> {
  const onceki = geriYigini.pop();
  yiginiBildir();
  if (!onceki) return null;
  const sonuc = await tarihleriGeriYukle(onceki);
  if (sonuc.hata) {
    geriYigini.push(onceki);
    yiginiBildir();
    return sonuc.hata;
  }
  yenileFn?.();
  return null;
}

function genelDinleyiciKur() {
  if (dinleyiciKurulu || typeof window === "undefined") return;
  dinleyiciKurulu = true;
  window.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
    const hedef = e.target as HTMLElement | null;
    if (hedef && (hedef.tagName === "INPUT" || hedef.tagName === "TEXTAREA" || hedef.isContentEditable)) return;
    if (geriYigini.length === 0) return;
    e.preventDefault();
    void sonIsleminiGeriAl();
  });
}

// Defter tablosunu sarar; satirlardaki onay kutulari (data-toplu="tip:id")
// secilince ustte toplu islem cubugu belirir (tumunu sec, tarih degistir, sil).
export function TopluSecim({ children }: { children: ReactNode }) {
  const router = useRouter();
  const kap = useRef<HTMLDivElement>(null);
  const [sayi, setSayi] = useState(0);
  const [tarih, setTarih] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [beklemede, baslat] = useTransition();
  const [geriSayisi, setGeriSayisi] = useState(geriYigini.length);

  useEffect(() => {
    yenileFn = () => router.refresh();
    genelDinleyiciKur();
    const f = () => setGeriSayisi(geriYigini.length);
    yigintiDinleyicileri.add(f);
    return () => {
      yigintiDinleyicileri.delete(f);
    };
  }, [router]);

  const kutular = () => Array.from(kap.current?.querySelectorAll<HTMLInputElement>("input[data-toplu]") ?? []);
  const secilenler = (): TopluOge[] =>
    kutular()
      .filter((k) => k.checked)
      .map((k) => {
        const [tip, ...id] = (k.dataset.toplu ?? "").split(":");
        return { tip: tip as TopluOge["tip"], id: id.join(":") };
      });

  useEffect(() => {
    const el = kap.current;
    if (!el) return;
    const guncelle = () => setSayi(secilenler().length);
    el.addEventListener("change", guncelle);
    return () => el.removeEventListener("change", guncelle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tumunuSec() {
    const hepsi = kutular();
    const yeni = !hepsi.every((k) => k.checked);
    hepsi.forEach((k) => (k.checked = yeni));
    setSayi(yeni ? hepsi.length : 0);
  }

  function tarihUygula() {
    setHata(null);
    baslat(async () => {
      const sonuc = await topluTarihDegistir(secilenler(), tarih);
      if (sonuc.hata) return setHata(sonuc.hata);
      if (sonuc.onceki?.length) {
        geriYigini.push(sonuc.onceki);
        yiginiBildir();
      }
      setTarih("");
      kutular().forEach((k) => (k.checked = false));
      setSayi(0);
      router.refresh();
    });
  }

  return (
    <div ref={kap}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
        <button type="button" onClick={tumunuSec} className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/[0.06]">
          Tümünü seç / bırak
        </button>
        {sayi > 0 && (
          <>
            <span className="text-white/80">{sayi} kayıt seçili</span>
            <Girdi type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="!w-auto !py-1 text-xs" aria-label="Yeni tarih" />
            <Dugme type="button" varyant="ikincil" boyut="kompakt" disabled={beklemede || !tarih} onClick={tarihUygula}>
              Tarihi değiştir
            </Dugme>
            <OnayliButon
              sifreIste
              boyut="kompakt"
              mesaj="Seçili kayıtlar silinsin mi? Virmanlar iki taraftaki kaydıyla birlikte silinir."
              eylem={async (sifre) => {
                const sonuc = await topluSil(secilenler(), sifre);
                if (sonuc.hata) throw new Error(sonuc.hata);
                kutular().forEach((k) => (k.checked = false));
                setSayi(0);
              }}
            >
              Seçilenleri sil
            </OnayliButon>
          </>
        )}
        {geriSayisi > 0 && (
          <button
            type="button"
            disabled={beklemede}
            onClick={() => baslat(async () => setHata(await sonIsleminiGeriAl()))}
            className="rounded-full border border-[#ffb340]/40 px-3 py-1 text-[#ffb340] hover:bg-[#ffb340]/10"
            title="Son toplu tarih değişikliğini geri alır (Ctrl+Z)"
          >
            ↶ Tarih değişikliğini geri al (Ctrl+Z)
          </button>
        )}
        {hata && <span className="text-[#ff7a70]">{hata}</span>}
      </div>
      {children}
    </div>
  );
}
