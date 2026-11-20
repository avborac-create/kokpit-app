"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DosyaSecici, type DosyaSeciciSecenegi } from "@/core/ui/dosya-secici";
import { gelenOdemeTopluIslem } from "../actions";

type Baglam = { secili: Set<string>; degistir: (id: string) => void; hepsiniSec: (idler: string[]) => void; temizle: () => void };
const SecimBaglami = createContext<Baglam | null>(null);

// Listeyi saran istemci kapsayıcısı: seçili kayıtları tutar; satır kutuları ve toplu işlem çubuğu buna bağlanır.
export function TopluSecimSaglayici({ children }: { children: ReactNode }) {
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const baglam: Baglam = {
    secili,
    degistir: (id) =>
      setSecili((o) => {
        const y = new Set(o);
        if (y.has(id)) y.delete(id);
        else y.add(id);
        return y;
      }),
    hepsiniSec: (idler) => setSecili(new Set(idler)),
    temizle: () => setSecili(new Set()),
  };
  return <SecimBaglami.Provider value={baglam}>{children}</SecimBaglami.Provider>;
}

export function SatirSecimKutusu({ id }: { id: string }) {
  const b = useContext(SecimBaglami);
  if (!b) return null;
  return (
    <input
      type="checkbox"
      aria-label="Kaydı seç"
      checked={b.secili.has(id)}
      onChange={() => b.degistir(id)}
      className="mr-3 mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
    />
  );
}

export function TopluIslemCubugu({ secilebilirIdler, yetkili, dosyalar }: { secilebilirIdler: string[]; yetkili: boolean; dosyalar: DosyaSeciciSecenegi[] }) {
  const b = useContext(SecimBaglami);
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [sonuc, setSonuc] = useState<{ basarili: number; hatalar: string[] } | null>(null);
  const [redAcik, setRedAcik] = useState(false);
  const [neden, setNeden] = useState("");
  const [dosyaAcik, setDosyaAcik] = useState(false);
  if (!b || secilebilirIdler.length === 0) return null;
  const sayi = b.secili.size;

  function calistir(islem: "TEYIT" | "TEYIT_EDILEMEDI" | "SIL" | "DOSYA_ATA", parametre = "") {
    if (!b) return;
    const idler = [...b.secili];
    basla(async () => {
      const s = await gelenOdemeTopluIslem(idler, islem, parametre);
      setSonuc(s);
      b.temizle();
      setRedAcik(false);
      setDosyaAcik(false);
      setNeden("");
      router.refresh();
    });
  }

  return (
    <div className="glass mb-3 rounded-2xl p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-white/80">
          <input
            type="checkbox"
            checked={sayi > 0 && sayi === secilebilirIdler.length}
            onChange={(e) => (e.target.checked ? b.hepsiniSec(secilebilirIdler) : b.temizle())}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Tümünü seç
        </label>
        <span className="text-white/50">{sayi > 0 ? `${sayi} kayıt seçili` : "Toplu işlem için kayıtları seçin"}</span>
        {sayi > 0 && (
          <>
            {yetkili && (
              <button
                type="button"
                disabled={bekliyor}
                onClick={() => confirm(`${sayi} kayıt teyit edilsin mi? (Kendi girdiğiniz, sebebi yazılmamış ya da müvekkil seçimi gereken kayıtlar atlanır.)`) && calistir("TEYIT")}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#0b1d36] disabled:opacity-50"
              >
                Seçilenleri teyit et
              </button>
            )}
            {yetkili && (
              <button type="button" disabled={bekliyor} onClick={() => setRedAcik((a) => !a)} className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
                Hesapta yok / tutarsız
              </button>
            )}
            <button type="button" disabled={bekliyor} onClick={() => setDosyaAcik((a) => !a)} className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
              Dosyaya ata
            </button>
            <button
              type="button"
              disabled={bekliyor}
              onClick={() => confirm(`${sayi} kayıt silinsin mi? Bu işlem geri alınamaz.`) && calistir("SIL")}
              className="rounded-md border border-[#ff7a70]/60 px-3 py-1.5 text-xs text-[#ff9b92] hover:bg-[#ff7a70]/10"
            >
              Sil
            </button>
            <button type="button" onClick={b.temizle} className="text-xs text-white/50 hover:underline">
              Seçimi temizle
            </button>
          </>
        )}
      </div>
      {redAcik && sayi > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={neden} onChange={(e) => setNeden(e.target.value)} placeholder="Neden (ör. hesapta görünmüyor)" className="min-w-[16rem] flex-1 rounded-md border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)]" />
          <button type="button" disabled={bekliyor} onClick={() => calistir("TEYIT_EDILEMEDI", neden)} className="rounded-md border border-[#ff7a70]/60 px-3 py-1.5 text-xs font-semibold text-[#ff9b92] hover:bg-[#ff7a70]/10">
            Seçilenleri “teyit edilemedi” yap
          </button>
        </div>
      )}
      {dosyaAcik && sayi > 0 && (
        <form
          action={(fd) => calistir("DOSYA_ATA", String(fd.get("dosyaId") ?? ""))}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <div className="min-w-[18rem] flex-1">
            <DosyaSecici name="dosyaId" dosyalar={dosyalar} bosSecenek="Dosya belirsiz (Para Havuzu)" placeholder="KN no, esas no ya da müvekkil adı yazın…" />
          </div>
          <button type="submit" disabled={bekliyor} className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#0b1d36] disabled:opacity-50">
            Seçilenleri bu dosyaya ata
          </button>
        </form>
      )}
      {bekliyor && <p className="mt-2 text-xs text-white/50">İşleniyor…</p>}
      {sonuc && (
        <div className="mt-2 text-xs">
          <p className="text-[#5fd97a]">{sonuc.basarili} kayıt işlendi.</p>
          {sonuc.hatalar.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-[#ff9b92]">
              {sonuc.hatalar.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
