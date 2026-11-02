"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";
import { OnayliButon } from "@/core/ui/onayli-buton";
import { kasaHareketiEkle, kasaHareketiGuncelle, kasaHareketiSil, kasaSayimiEkle } from "./actions";

type Kod = { id: string; no: number; ad: string; yon: "GIRIS" | "CIKIS"; personelMi: boolean };
type Kisi = { id: string; adSoyad: string };

function HareketAlanlari({ kodlar, kisiler, ilk }: { kodlar: Kod[]; kisiler: Kisi[]; ilk?: { kodId: string; tarih: string; tutar: number; aciklama: string; personelId: string } }) {
  const [yon, setYon] = useState<"GIRIS" | "CIKIS">(() => kodlar.find((k) => k.id === ilk?.kodId)?.yon ?? "CIKIS");
  const liste = kodlar.filter((k) => k.yon === yon);
  const [kodId, setKodId] = useState(ilk?.kodId ?? "");
  const kod = kodlar.find((k) => k.id === kodId && k.yon === yon);
  const bugun = new Date().toISOString().slice(0, 10);
  return (
    <>
      <div className="mb-3 flex gap-2">
        {(["CIKIS", "GIRIS"] as const).map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => {
              setYon(y);
              setKodId("");
            }}
            className={`flex-1 border px-3 py-2 text-sm font-medium ${yon === y ? (y === "GIRIS" ? "border-[#32d74b] bg-[#32d74b]/20 text-white" : "border-[#ff7a70] bg-[#ff7a70]/20 text-white") : "border-white/15 text-white/60 hover:bg-white/10"}`}
          >
            {y === "GIRIS" ? "Kasaya nakit girişi" : "Kasadan nakit çıkışı"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="ks-kod">Kasa kodu</Etiket>
          <Secim id="ks-kod" name="kodId" required value={kodId} onChange={(e) => setKodId(e.target.value)}>
            <option value="" disabled>
              Seçiniz…
            </option>
            {liste.map((k) => (
              <option key={k.id} value={k.id}>
                {k.no} - {k.ad}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="ks-tarih">Tarih</Etiket>
          <Girdi id="ks-tarih" name="tarih" type="date" required defaultValue={ilk?.tarih ?? bugun} />
        </Alan>
        <Alan>
          <Etiket htmlFor="ks-tutar">Tutar</Etiket>
          <ParaGirdisi id="ks-tutar" name="tutar" required defaultValue={ilk?.tutar} />
        </Alan>
        {kod?.personelMi && (
          <Alan>
            <Etiket htmlFor="ks-personel">Personel</Etiket>
            <Secim id="ks-personel" name="personelId" required defaultValue={ilk?.personelId ?? ""}>
              <option value="" disabled>
                Seçiniz…
              </option>
              {kisiler.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.adSoyad}
                </option>
              ))}
            </Secim>
          </Alan>
        )}
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor="ks-aciklama">Açıklama</Etiket>
            <Girdi id="ks-aciklama" name="aciklama" defaultValue={ilk?.aciklama ?? ""} />
          </Alan>
        </div>
      </div>
    </>
  );
}

export function YeniKasaHareketi({ kodlar, kisiler }: { kodlar: Kod[]; kisiler: Kisi[] }) {
  const router = useRouter();
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  const [anahtar, setAnahtar] = useState(0);
  return (
    <form
      key={anahtar}
      action={(fd) => {
        setHata("");
        basla(async () => {
          const s = await kasaHareketiEkle(fd);
          if (s.hata) setHata(s.hata);
          else {
            setAnahtar((a) => a + 1);
            router.refresh();
          }
        });
      }}
      className="glass mb-5 rounded-2xl p-4"
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">Yeni kasa hareketi</h2>
      <HareketAlanlari kodlar={kodlar} kisiler={kisiler} />
      {hata && <p className="mt-2 text-sm text-red-300">{hata}</p>}
      <div className="mt-3">
        <Dugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Kaydet"}
        </Dugme>
      </div>
    </form>
  );
}

export function KasaSatirIslemleri({ id, kodlar, kisiler, ilk }: { id: string; kodlar: Kod[]; kisiler: Kisi[]; ilk: { kodId: string; tarih: string; tutar: number; aciklama: string; personelId: string } }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={() => setAcik(true)} className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-[#6db8ff] hover:bg-white/10">
        Düzenle
      </button>
      <OnayliButon
        sifreIste
        mesaj="Bu kasa kaydı silinsin mi?"
        boyut="kompakt"
        eylem={async (sifre) => {
          return await kasaHareketiSil(id, sifre);
        }}
      >
        Sil
      </OnayliButon>
      {acik &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => setAcik(false)}>
            <form
              className="popover max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5"
              onClick={(e) => e.stopPropagation()}
              action={(fd) => {
                setHata("");
                basla(async () => {
                  const s = await kasaHareketiGuncelle(id, fd);
                  if (s.hata) setHata(s.hata);
                  else {
                    setAcik(false);
                    router.refresh();
                  }
                });
              }}
            >
              <h3 className="mb-3 text-base font-semibold text-white">Kasa kaydını düzenle</h3>
              <HareketAlanlari kodlar={kodlar} kisiler={kisiler} ilk={ilk} />
              {hata && <p className="mt-2 text-sm text-[#ff7a70]">{hata}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <Dugme type="button" varyant="ikincil" onClick={() => setAcik(false)}>
                  Vazgeç
                </Dugme>
                <Dugme type="submit" disabled={bekliyor}>
                  {bekliyor ? "Kaydediliyor…" : "Kaydet"}
                </Dugme>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function SayimFormu({ beklenen }: { beklenen: number }) {
  const router = useRouter();
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  const [anahtar, setAnahtar] = useState(0);
  return (
    <form
      key={anahtar}
      action={(fd) => {
        setHata("");
        basla(async () => {
          const s = await kasaSayimiEkle(fd);
          if (s.hata) setHata(s.hata);
          else {
            setAnahtar((a) => a + 1);
            router.refresh();
          }
        });
      }}
      className="glass rounded-2xl p-4"
    >
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">Gün sonu sayımı</h2>
      <p className="mb-3 text-xs text-white/50">Kasadaki nakdi sayıp yazın; sistemin beklediği tutarla farkı kaydedilir. Sistem şu an {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(beklenen)} bekliyor.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Alan>
          <Etiket htmlFor="sy-tarih">Tarih</Etiket>
          <Girdi id="sy-tarih" name="tarih" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </Alan>
        <Alan>
          <Etiket htmlFor="sy-sayilan">Sayılan nakit</Etiket>
          <ParaGirdisi id="sy-sayilan" name="sayilan" required />
        </Alan>
        <Alan>
          <Etiket htmlFor="sy-not">Not</Etiket>
          <Girdi id="sy-not" name="aciklama" />
        </Alan>
      </div>
      {hata && <p className="mt-2 text-sm text-red-300">{hata}</p>}
      <div className="mt-3">
        <Dugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Sayımı kaydet"}
        </Dugme>
      </div>
    </form>
  );
}
