"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";
import { OnayliButon } from "@/core/ui/onayli-buton";
import { havuzDagit, havuzDagitimiGeriAl, havuzGirisiEkle, havuzGirisiSil, muvekkilDosyalari } from "./actions";

type Yontem = { id: string; etiket: string };
type Musteri = { id: string; ad: string };

export function YeniHavuzGirisi({ yontemler }: { yontemler: Yontem[] }) {
  const router = useRouter();
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  const [anahtar, setAnahtar] = useState(0);
  const bugun = new Date().toISOString().slice(0, 10);
  return (
    <form
      key={anahtar}
      action={(fd) => {
        setHata("");
        basla(async () => {
          const s = await havuzGirisiEkle(fd);
          if (s.hata) setHata(s.hata);
          else {
            setAnahtar((a) => a + 1);
            router.refresh();
          }
        });
      }}
      className="glass mb-5 rounded-2xl p-4"
    >
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">Yeni para girişi</h2>
      <p className="mb-3 text-xs text-white/45">Hangi dosya/müvekkile ait olduğu henüz belli değilse parayı buraya girin; sonra dağıtırsınız.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="ph-tarih">Tarih</Etiket>
          <Girdi id="ph-tarih" name="tarih" type="date" required defaultValue={bugun} />
        </Alan>
        <Alan>
          <Etiket htmlFor="ph-tutar">Tutar</Etiket>
          <ParaGirdisi id="ph-tutar" name="tutar" required />
        </Alan>
        <Alan>
          <Etiket htmlFor="ph-kaynak">Kimden / hangi hesaptan</Etiket>
          <Girdi id="ph-kaynak" name="kaynak" placeholder="örn. havale gönderen adı" />
        </Alan>
        <Alan>
          <Etiket htmlFor="ph-yontem">Ödeme şekli</Etiket>
          <Secim id="ph-yontem" name="odemeYontemiId" defaultValue="">
            <option value="">Belirtilmedi</option>
            {yontemler.map((y) => (
              <option key={y.id} value={y.id}>
                {y.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor="ph-aciklama">Açıklama / not</Etiket>
            <Girdi id="ph-aciklama" name="aciklama" />
          </Alan>
        </div>
      </div>
      {hata && <p className="mt-2 text-sm text-red-300">{hata}</p>}
      <div className="mt-3">
        <Dugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Havuza ekle"}
        </Dugme>
      </div>
    </form>
  );
}

export function DagitDugmesi({ girisId, kalan, musteriler }: { girisId: string; kalan: number; musteriler: Musteri[] }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  const [musteriId, setMusteriId] = useState("");
  const [dosyalar, setDosyalar] = useState<{ id: string; etiket: string }[]>([]);
  const bugun = new Date().toISOString().slice(0, 10);
  return (
    <>
      <button type="button" onClick={() => setAcik(true)} className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-[#6db8ff] hover:bg-white/10">
        Aktar
      </button>
      {acik &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={() => setAcik(false)}>
            <form
              className="popover max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5"
              onClick={(e) => e.stopPropagation()}
              action={(fd) => {
                setHata("");
                basla(async () => {
                  const s = await havuzDagit(girisId, fd);
                  if (s.hata) setHata(s.hata);
                  else {
                    setAcik(false);
                    router.refresh();
                  }
                });
              }}
            >
              <h3 className="mb-1 text-base font-semibold text-white">Havuzdaki parayı aktar</h3>
              <p className="mb-3 text-xs text-white/50">
                Önce müvekkili seçin. Dosya seçmezseniz para müvekkilin genel para trafiğine, seçerseniz o dosyaya yazılır.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <Alan>
                  <Etiket htmlFor="dg-musteri">Müvekkil</Etiket>
                  <Secim
                    id="dg-musteri"
                    name="musteriId"
                    required
                    value={musteriId}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setMusteriId(id);
                      setDosyalar([]);
                      if (id) setDosyalar(await muvekkilDosyalari(id));
                    }}
                  >
                    <option value="" disabled>
                      Seçiniz…
                    </option>
                    {musteriler.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.ad}
                      </option>
                    ))}
                  </Secim>
                </Alan>
                <Alan>
                  <Etiket htmlFor="dg-dosya">Dosya (isteğe bağlı)</Etiket>
                  <Secim id="dg-dosya" name="dosyaId" defaultValue="" key={musteriId + dosyalar.length}>
                    <option value="">Dosyaya bağlama — müvekkile genel</option>
                    {dosyalar.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.etiket}
                      </option>
                    ))}
                  </Secim>
                </Alan>
                <div className="grid grid-cols-2 gap-3">
                  <Alan>
                    <Etiket htmlFor="dg-tutar">Tutar (kalan {kalan.toLocaleString("tr-TR")} TL)</Etiket>
                    <ParaGirdisi id="dg-tutar" name="tutar" required defaultValue={kalan} />
                  </Alan>
                  <Alan>
                    <Etiket htmlFor="dg-tarih">Tarih</Etiket>
                    <Girdi id="dg-tarih" name="tarih" type="date" required defaultValue={bugun} />
                  </Alan>
                </div>
              </div>
              {hata && <p className="mt-2 text-sm text-[#ff7a70]">{hata}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setAcik(false)} className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10">
                  Vazgeç
                </button>
                <Dugme type="submit" disabled={bekliyor}>
                  {bekliyor ? "Aktarılıyor…" : "Aktar"}
                </Dugme>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}

export function GeriAlDugmesi({ dagitimId }: { dagitimId: string }) {
  return (
    <OnayliButon sifreIste mesaj="Bu aktarım geri alınsın mı? Para havuza döner, müvekkil/dosya kaydı silinir." boyut="kompakt" eylem={async (sifre) => havuzDagitimiGeriAl(dagitimId, sifre)}>
      Geri al
    </OnayliButon>
  );
}

export function GirisSilDugmesi({ id }: { id: string }) {
  return (
    <OnayliButon sifreIste mesaj="Bu havuz kaydı silinsin mi?" boyut="kompakt" eylem={async (sifre) => havuzGirisiSil(id, sifre)}>
      Sil
    </OnayliButon>
  );
}
