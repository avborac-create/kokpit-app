"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";
import { hesapAktifDegistir, hesapEkle, hesapVarsayilanYap, mahsupEkle, mahsupIptalEt } from "./actions";

function Hata({ m }: { m: string }) {
  return m ? <p className="mt-2 text-sm text-[#ff7a70]">{m}</p> : null;
}

export function YeniHesapFormu() {
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
          const s = await hesapEkle(fd);
          if (s.hata) setHata(s.hata);
          else {
            setAnahtar((a) => a + 1);
            router.refresh();
          }
        });
      }}
      className="glass mb-5 rounded-2xl p-4"
    >
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">Yeni para hesabı</h2>
      <p className="mb-3 text-xs text-white/45">Örn. sigortalı avukatın kişisel hesabı. Bu hesaba gelen para ya da bu hesaptan çıkan masraf, büro ile hesap sahibi arasında alacak/borç olarak izlenir.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="yh-ad">Hesap adı</Etiket>
          <Girdi id="yh-ad" name="ad" required placeholder="örn. Av. … kişisel hesabı" />
        </Alan>
        <Alan>
          <Etiket htmlFor="yh-tur">Tür</Etiket>
          <Secim id="yh-tur" name="tur" defaultValue="AVUKAT">
            <option value="AVUKAT">Avukatın kişisel hesabı (sigortalı avukat)</option>
            <option value="DIGER">Diğer kişisel hesap</option>
            <option value="BURO">Büro banka hesabı</option>
            <option value="NAKIT">Nakit kasa</option>
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="yh-sahip">Hesap sahibi</Etiket>
          <Girdi id="yh-sahip" name="sahipAdi" placeholder="ad soyad" />
        </Alan>
        <Alan>
          <Etiket htmlFor="yh-iban">IBAN (isteğe bağlı)</Etiket>
          <Girdi id="yh-iban" name="iban" />
        </Alan>
      </div>
      <Hata m={hata} />
      <div className="mt-3">
        <Dugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Hesabı ekle"}
        </Dugme>
      </div>
    </form>
  );
}

export function HesapYonetimi({ id, aktif, varsayilan }: { id: string; aktif: boolean; varsayilan: boolean }) {
  const router = useRouter();
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  const calistir = (is: () => Promise<{ hata?: string }>) =>
    basla(async () => {
      setHata("");
      const s = await is();
      if (s.hata) setHata(s.hata);
      else router.refresh();
    });
  return (
    <span className="inline-flex flex-wrap items-center gap-3 text-xs">
      {!varsayilan && aktif && (
        <button type="button" disabled={bekliyor} onClick={() => calistir(() => hesapVarsayilanYap(id))} className="text-[#8fd8ff] hover:underline">
          Varsayılan yap
        </button>
      )}
      <button type="button" disabled={bekliyor} onClick={() => calistir(() => hesapAktifDegistir(id, !aktif))} className="text-white/50 hover:text-white">
        {aktif ? "Pasife al" : "Yeniden aktif et"}
      </button>
      {hata && <span className="text-[#ff7a70]">{hata}</span>}
    </span>
  );
}

export function MahsupFormu({ hesapId, sahip }: { hesapId: string; sahip: string }) {
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
          const s = await mahsupEkle(hesapId, fd);
          if (s.hata) setHata(s.hata);
          else {
            setAnahtar((a) => a + 1);
            router.refresh();
          }
        });
      }}
      className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">Mahsup / ödeme kaydı</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Alan>
          <Etiket htmlFor={`mh-yon-${hesapId}`}>Ne oldu?</Etiket>
          <Secim id={`mh-yon-${hesapId}`} name="yon" defaultValue="BUROYA_AKTARILDI">
            <option value="BUROYA_AKTARILDI">{sahip} büroya para aktardı</option>
            <option value="SAHIBE_ODENDI">Büro {sahip} adlı kişiye ödedi</option>
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor={`mh-tutar-${hesapId}`}>Tutar</Etiket>
          <ParaGirdisi id={`mh-tutar-${hesapId}`} name="tutar" required />
        </Alan>
        <Alan>
          <Etiket htmlFor={`mh-tarih-${hesapId}`}>Tarih</Etiket>
          <Girdi id={`mh-tarih-${hesapId}`} name="tarih" type="date" required defaultValue={bugun} />
        </Alan>
        <Alan>
          <Etiket htmlFor={`mh-not-${hesapId}`}>Not</Etiket>
          <Girdi id={`mh-not-${hesapId}`} name="aciklama" placeholder="örn. EFT ile iade" />
        </Alan>
      </div>
      <Hata m={hata} />
      <div className="mt-2">
        <Dugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Mahsubu kaydet"}
        </Dugme>
      </div>
    </form>
  );
}

export function MahsupIptalDugmesi({ id }: { id: string }) {
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => {
        if (!confirm("Bu mahsup kaydı iptal edilsin mi? (Kayıt silinmez, iptal olarak görünür.)")) return;
        basla(async () => {
          await mahsupIptalEt(id);
          router.refresh();
        });
      }}
      className="text-xs text-white/40 hover:text-[#ff7a70]"
    >
      İptal et
    </button>
  );
}
