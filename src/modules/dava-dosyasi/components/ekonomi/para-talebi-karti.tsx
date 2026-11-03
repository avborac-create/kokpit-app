"use client";

import { useState, useTransition } from "react";
import { UyariEylemleri } from "@/core/uyari/uyari-eylemleri";
import { OnayAdimi } from "@/core/ui/onay-adimi";
import { hesapOzetiErtele, paraBilgisiniTamamla, paraGeldiIsaretle, paraIstendiIsaretle, paraIstenmeyecek } from "../../lib/hesap-ozeti-actions";
import { YOL_ADLARI } from "../../lib/hesap-ozeti-yollari";

export type ParaTalebiVerisi = {
  id: string;
  musteriAdi: string;
  toplam: number;
  konu: string | null;
  sorumluAdi: string | null;
  olusturma: string; // ISO
  istendi: boolean;
  istenmeTarihi: string | null; // yyyy-mm-dd
  yol: string | null;
  geldiMi: boolean;
  geldiTarihi: string | null;
  bankaHesabi: string | null;
  bekleyenGun: number | null;
};

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihBicimi = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });
const bugun = () => new Date().toISOString().slice(0, 10);
const gun = (iso: string | null) => (iso ? tarihBicimi.format(new Date(`${iso.slice(0, 10)}T12:00:00`)) : "—");
const girdi = "rounded-lg border border-white/20 bg-white/[0.06] px-2 py-1 text-xs text-white [color-scheme:dark]";

// Müvekkilden para isteme kartı: "Müvekkilden istendi" ve "Para geldi" onay kutuları, her biri onay adımıyla.
export function ParaTalebiKarti({ veri, musteriGoster = false, bankalar = [] }: { veri: ParaTalebiVerisi; musteriGoster?: boolean; bankalar?: string[] }) {
  const [adim, setAdim] = useState<"istendi" | "geldi" | "tamamla" | null>(null);
  const [tarih, setTarih] = useState(bugun());
  const [yol, setYol] = useState("");
  const [banka, setBanka] = useState(veri.bankaHesabi ?? "");
  const [onayda, setOnayda] = useState(false);
  const [hata, setHata] = useState("");
  const [gizle, setGizle] = useState(false);
  const [bekliyor, baslat] = useTransition();
  if (gizle) return null;

  const eksik = veri.geldiMi && (!veri.geldiTarihi || !veri.bankaHesabi);
  const kapat = () => {
    setAdim(null);
    setOnayda(false);
    setHata("");
  };

  function kaydet(is: () => Promise<unknown>) {
    setHata("");
    baslat(async () => {
      try {
        await is();
        kapat();
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
        setOnayda(false);
      }
    });
  }

  return (
    <div className={`rounded-2xl border p-4 text-sm ${veri.geldiMi ? (eksik ? "border-amber-400/40 bg-amber-400/10" : "border-emerald-400/30 bg-emerald-400/[0.07]") : "border-white/15 bg-white/[0.04]"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {musteriGoster && <p className="font-semibold text-white">{veri.musteriAdi}</p>}
          <p className="text-white/70">{veri.konu || "Hesap özeti"}</p>
        </div>
        <p className="text-lg font-semibold text-white">{para.format(veri.toplam)}</p>
      </div>
      <p className="mt-1 text-xs text-white/50">
        Sorumlu: {veri.sorumluAdi ?? "—"} · Hesap özeti: {gun(veri.olusturma)}
        {veri.istendi && ` · İstendi: ${gun(veri.istenmeTarihi)}${veri.yol ? ` (${YOL_ADLARI[veri.yol] ?? veri.yol})` : ""}`}
        {veri.geldiMi && ` · Geldi: ${gun(veri.geldiTarihi)}${veri.bankaHesabi ? ` · ${veri.bankaHesabi}` : ""}`}
        {veri.istendi && !veri.geldiMi && veri.bekleyenGun !== null && (
          <span className={veri.bekleyenGun >= 7 ? " font-medium text-red-300" : " text-amber-200"}> · {veri.bekleyenGun} gündür gelmedi</span>
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-white">
          <input type="checkbox" className="onay-kutusu" checked={veri.istendi} disabled={veri.istendi || bekliyor} onChange={() => { setAdim("istendi"); setTarih(bugun()); }} />
          Müvekkilden istendi
        </label>
        <label className={`flex items-center gap-2 ${veri.istendi ? "cursor-pointer text-white" : "text-white/35"}`} title={veri.istendi ? "" : "Önce müvekkilden istendi olarak işaretleyin."}>
          <input type="checkbox" className="onay-kutusu" checked={veri.geldiMi} disabled={!veri.istendi || veri.geldiMi || bekliyor} onChange={() => { setAdim("geldi"); setTarih(bugun()); }} />
          Para geldi
        </label>
        {!veri.istendi && (
          <button type="button" className="text-xs text-white/50 underline hover:text-white" onClick={() => kaydet(() => paraIstenmeyecek(veri.id).then(() => setGizle(true)))}>
            Müvekkile göndermeyeceğim
          </button>
        )}
        {eksik && (
          <button type="button" className="text-xs font-medium text-amber-200 underline" onClick={() => { setAdim("tamamla"); setTarih(veri.geldiTarihi ?? bugun()); }}>
            Eksik bilgiyi tamamla
          </button>
        )}
      </div>

      {adim === "istendi" && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            Müvekkilden ne zaman istendi?
            <input type="date" value={tarih} max={bugun()} onChange={(e) => setTarih(e.target.value)} className={girdi} />
            Hangi yoldan?
            <select value={yol} onChange={(e) => setYol(e.target.value)} className={girdi}>
              <option value="">Seçin…</option>
              {Object.entries(YOL_ADLARI).map(([kod, ad]) => (
                <option key={kod} value={kod}>{ad}</option>
              ))}
            </select>
            {!onayda && (
              <>
                <button type="button" className="rounded-full bg-[var(--accent)] px-3 py-1 font-medium text-white" onClick={() => (tarih && yol ? setOnayda(true) : setHata("İstenen tarihi ve yolu seçin."))}>Devam</button>
                <button type="button" className="text-white/50 hover:text-white" onClick={kapat}>Vazgeç</button>
              </>
            )}
          </div>
          {onayda && (
            <OnayAdimi
              mesaj={`${gun(tarih)} tarihinde ${YOL_ADLARI[yol]} yoluyla müvekkilden ${para.format(veri.toplam)} istendiğini kaydediyorsunuz.`}
              uyari="Finans yetkililerine bildirim gidecek. Onaylıyor musunuz?"
              bekliyor={bekliyor}
              onOnay={() => kaydet(() => paraIstendiIsaretle(veri.id, tarih, yol))}
              onVazgec={kapat}
            />
          )}
        </div>
      )}

      {(adim === "geldi" || adim === "tamamla") && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            Para ne zaman geldi?
            <input type="date" value={tarih} max={bugun()} onChange={(e) => setTarih(e.target.value)} className={girdi} />
            Hangi banka hesabına?
            <input list={`banka-${veri.id}`} value={banka} onChange={(e) => setBanka(e.target.value)} placeholder="ör. Garanti ···1234" className={`${girdi} w-48`} />
            <datalist id={`banka-${veri.id}`}>{bankalar.map((b) => <option key={b} value={b} />)}</datalist>
            {!onayda && (
              <>
                <button type="button" className="rounded-full bg-[var(--accent)] px-3 py-1 font-medium text-white" onClick={() => setOnayda(true)}>Devam</button>
                <button type="button" className="text-white/50 hover:text-white" onClick={kapat}>Vazgeç</button>
              </>
            )}
          </div>
          {onayda && (
            <OnayAdimi
              mesaj={`Para ${tarih ? gun(tarih) : "(tarih girilmedi)"} tarihinde ${banka.trim() || "(banka hesabı girilmedi)"} hesabına geldi olarak kaydedilecek.`}
              uyari={!tarih || !banka.trim() ? "Geliş tarihi ve banka hesabı zorunlu bilgilerdir. Eksik bırakırsanız sorumlu kişiye tamamlaması için görev açılır." : undefined}
              bekliyor={bekliyor}
              onOnay={() => kaydet(() => (adim === "geldi" ? paraGeldiIsaretle(veri.id, tarih, banka) : paraBilgisiniTamamla(veri.id, tarih, banka)))}
              onVazgec={kapat}
            />
          )}
        </div>
      )}

      {!veri.istendi && (
        <div className="mt-3">
          <UyariEylemleri
            baslik={`Hesap özetini müvekkile gönder: ${veri.musteriAdi}`}
            aciklama={`${para.format(veri.toplam)} tutarındaki hesap özeti müvekkile gönderilecek.`}
            onErtele={async (t) => {
              await hesapOzetiErtele(veri.id, t);
              setGizle(true);
            }}
          />
        </div>
      )}
      {hata && <p className="mt-2 text-xs text-red-300">{hata}</p>}
    </div>
  );
}
