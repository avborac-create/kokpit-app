"use client";

import { useState, useTransition } from "react";
import { Dugme } from "@/core/ui/button";
import {
  hukukiMudahaleEkle,
  hukukiMudahaleDurumDegistir,
  hukukiMudahaleSil,
} from "@/modules/dava-dosyasi/lib/actions";
import { HUKUKI_MUDAHALE_DURUMLARI } from "@/modules/dava-dosyasi/lib/sabitler";
import { HukukiMudahaleFormu } from "@/modules/dava-dosyasi/components/hukuki-mudahale-formu";
import type { HukukiMudahaleDurumu } from "@prisma/client";

type SecenekOgesi = { id: string; etiket: string; kod: string };
type Avukat = { id: string; adSoyad: string };

type Mudahale = {
  id: string;
  baslik: string;
  durum: HukukiMudahaleDurumu;
  sonTarih: Date | null;
  mudahaleTuru: { etiket: string } | null;
  oncelik: { etiket: string; kod: string } | null;
  sorumluAvukat: { adSoyad: string } | null;
};

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

const ONCELIK_RENK: Record<string, string> = {
  acil: "bg-[var(--danger-soft)] text-[#ff7a70]",
  yuksek: "bg-[#f5c451]/15 text-[#f5c451]",
};

// Dava detay ekraninin 2. blogu: "Bu dosyada ne yapmaliyim?" - bkz.
// ARCHITECTURE.md "Avukat Sapkasi". Sadece ACIK (Beklemede/Devam Ediyor)
// isler gosterilir; tamamlanan/iptal edilenler burada birikip gurultu
// yaratmaz.
export function AvukatSapkasiBlok({
  davaDosyasiId,
  acikMudahaleler,
  oneri,
  mudahaleTurleri,
  oncelikler,
  avukatlar,
}: {
  davaDosyasiId: string;
  acikMudahaleler: Mudahale[];
  oneri: { baslik: string; mudahaleTuruId: string | null } | null;
  mudahaleTurleri: SecenekOgesi[];
  oncelikler: SecenekOgesi[];
  avukatlar: Avukat[];
}) {
  const [formAcikMi, setFormAcikMi] = useState(false);
  const varsayilanOncelikId = oncelikler.find((o) => o.kod === "normal")?.id;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">Avukat Şapkası</p>
        <Dugme type="button" varyant="ikincil" onClick={() => setFormAcikMi((a) => !a)}>
          {formAcikMi ? "Kapat" : "+ Yeni İş"}
        </Dugme>
      </div>

      {formAcikMi && (
        <HukukiMudahaleFormu
          action={async (formData) => {
            await hukukiMudahaleEkle(davaDosyasiId, formData);
            setFormAcikMi(false);
          }}
          mudahaleTurleri={mudahaleTurleri}
          oncelikler={oncelikler}
          avukatlar={avukatlar}
          varsayilanOncelikId={varsayilanOncelikId}
        />
      )}

      <div className="flex flex-col gap-2">
        {acikMudahaleler.length === 0 && !oneri && (
          <p className="text-sm text-white/40">Açık bir hukuki müdahale yok.</p>
        )}
        {acikMudahaleler.map((mudahale) => (
          <MudahaleSatiri key={mudahale.id} mudahale={mudahale} davaDosyasiId={davaDosyasiId} />
        ))}
        {oneri && (
          <OneriSatiri davaDosyasiId={davaDosyasiId} baslik={oneri.baslik} mudahaleTuruId={oneri.mudahaleTuruId} />
        )}
      </div>
    </div>
  );
}

function MudahaleSatiri({ mudahale, davaDosyasiId }: { mudahale: Mudahale; davaDosyasiId: string }) {
  const [durumPending, durumDegistir] = useTransition();
  const [silmePending, sil] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white/90">{mudahale.baslik}</p>
        <p className="flex flex-wrap gap-x-2 text-xs text-white/40">
          {mudahale.oncelik && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ONCELIK_RENK[mudahale.oncelik.kod] ?? "bg-white/[0.06] text-white/50"}`}
            >
              {mudahale.oncelik.etiket}
            </span>
          )}
          {mudahale.sorumluAvukat && <span>{mudahale.sorumluAvukat.adSoyad}</span>}
          {mudahale.sonTarih && <span>Son tarih: {tarihFormatlayici.format(mudahale.sonTarih)}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={mudahale.durum}
          disabled={durumPending}
          onChange={(e) =>
            durumDegistir(() =>
              hukukiMudahaleDurumDegistir(mudahale.id, davaDosyasiId, e.target.value as HukukiMudahaleDurumu),
            )
          }
          className="glass rounded-lg px-2 py-1 text-xs text-white outline-none [color-scheme:dark]"
        >
          {HUKUKI_MUDAHALE_DURUMLARI.map((d) => (
            <option key={d.deger} value={d.deger}>
              {d.etiket}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={silmePending}
          onClick={() => {
            if (window.confirm("Bu hukuki müdahale kaydı silinsin mi?")) {
              sil(() => hukukiMudahaleSil(mudahale.id, davaDosyasiId));
            }
          }}
          className="text-xs text-white/30 hover:text-[#ff7a70]"
        >
          Sil
        </button>
      </div>
    </div>
  );
}

// Otomasyon onerisi - DB'de hicbir iz birakmaz, sadece dosyaEvresi'ne
// gore anlik hesaplanir (bkz. ARCHITECTURE.md "Otomasyon Mantigi").
// Kullanici onaylarsa gercek bir HukukiMudahale olusur.
function OneriSatiri({
  davaDosyasiId,
  baslik,
  mudahaleTuruId,
}: {
  davaDosyasiId: string;
  baslik: string;
  mudahaleTuruId: string | null;
}) {
  const [pending, baslat] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2.5">
      <p className="text-sm text-white/50">Öneri: {baslik}</p>
      <Dugme
        type="button"
        varyant="ikincil"
        disabled={pending}
        onClick={() => {
          const formData = new FormData();
          formData.set("baslik", baslik);
          if (mudahaleTuruId) formData.set("mudahaleTuruId", mudahaleTuruId);
          baslat(() => hukukiMudahaleEkle(davaDosyasiId, formData));
        }}
      >
        + İş Oluştur
      </Dugme>
    </div>
  );
}
