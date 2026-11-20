"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Alan, Etiket, Girdi, MetinAlani } from "@/core/ui/form";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { Dugme } from "@/core/ui/button";
import { DosyaSecici, type DosyaSeciciSecenegi } from "@/core/ui/dosya-secici";
import { gelenOdemeDekontEkle, gelenOdemeDuzeltmeKarari, gelenOdemeDuzeltmeTalebiVer, gelenOdemeDuzenle, gelenOdemeKaydet, gelenOdemeSil, gelenOdemeTeyitEdilemedi, gelenOdemeTeyitEt } from "../actions";

export function YeniOdemeFormu({ dosyalar }: { dosyalar: DosyaSeciciSecenegi[] }) {
  const router = useRouter();
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  const [anahtar, setAnahtar] = useState(0);
  const [belge, setBelge] = useState<{ url: string; ad: string; tur: string } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [dekontSonra, setDekontSonra] = useState(false);
  const [sebepSonra, setSebepSonra] = useState(false);
  const bugun = new Date().toISOString().slice(0, 10);

  async function yukle(d: File) {
    setYukleniyor(true);
    setHata("");
    try {
      const s = await upload(`isler/dekont/${crypto.randomUUID()}-${d.name}`, d, { access: "private", handleUploadUrl: "/api/isler/blob-upload" });
      setBelge({ url: s.url, ad: d.name, tur: d.type });
    } catch (e) {
      let ayrinti = "";
      try {
        const r = await fetch("/api/isler/blob-upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname: `isler/dekont/${d.name}`, clientPayload: null, multipart: false } }),
        });
        if (!r.ok) ayrinti = ` (sunucu ${r.status}: ${(await r.text()).slice(0, 200)})`;
      } catch {}
      setHata("Yüklenemedi: " + (e instanceof Error ? e.message : "bilinmeyen hata") + ayrinti);
    } finally {
      setYukleniyor(false);
    }
  }

  function dosyaSec(liste: FileList | null) {
    const d = liste?.[0];
    if (d) void yukle(d);
  }

  // Panodaki görseli (ekran görüntüsü / kopyalanan fotoğraf) Ctrl+V ile yapıştır
  const yukleRef = useRef(yukle);
  useEffect(() => {
    yukleRef.current = yukle;
  });
  useEffect(() => {
    function yapistir(e: ClipboardEvent) {
      const dosya = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/") || f.type === "application/pdf");
      if (!dosya) return;
      e.preventDefault();
      const uzanti = dosya.type === "application/pdf" ? "pdf" : (dosya.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const ad = !dosya.name || /^image\.\w+$/i.test(dosya.name) ? `yapistirilan-dekont-${Date.now()}.${uzanti}` : dosya.name;
      void yukleRef.current(new File([dosya], ad, { type: dosya.type }));
    }
    document.addEventListener("paste", yapistir);
    return () => document.removeEventListener("paste", yapistir);
  }, []);

  return (
    <form
      key={anahtar}
      action={(fd) => {
        setHata("");
        if (!belge && !dekontSonra) {
          setHata("Önce dekontu yükleyin ya da “Dekontu sonra yükleyeceğim” kutusunu işaretleyin.");
          return;
        }
        if (belge) {
          fd.set("belgeUrl", belge.url);
          fd.set("belgeAd", belge.ad);
          fd.set("belgeTur", belge.tur);
        } else fd.set("dekontSonra", "1");
        if (sebepSonra) fd.set("sebepSonra", "1");
        basla(async () => {
          const s = await gelenOdemeKaydet(fd);
          if (s.hata) setHata(s.hata);
          else {
            setBelge(null);
            setDekontSonra(false);
            setSebepSonra(false);
            setAnahtar((a) => a + 1);
            router.refresh();
          }
        });
      }}
      className="glass mb-5 rounded-2xl p-4"
    >
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/60">Yeni gelen ödeme</h2>
      <p className="mb-3 text-xs text-white/45">Dosyayı açmanıza gerek yok. Dekontu yükleyin, bildiklerinizi yazın; kayıt muhasebe teyidine düşer.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor="go-dekont">Dekont (fotoğraf veya PDF)</Etiket>
            <p className="mb-1 text-xs text-white/45">Dosya seçebilir ya da kopyaladığınız görseli bu sayfada <b>Ctrl+V</b> ile yapıştırabilirsiniz.</p>
            <input
              id="go-dekont"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => dosyaSec(e.target.files)}
              className="block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border file:border-white/20 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
            />
            {yukleniyor && <p className="mt-1 text-xs text-white/50">Yükleniyor…</p>}
            {belge && <p className="mt-1 text-xs text-[#5fd97a]">✓ {belge.ad} yüklendi</p>}
            {!belge && (
              <label className="mt-2 flex items-start gap-2 text-sm text-white/70">
                <input type="checkbox" checked={dekontSonra} onChange={(e) => setDekontSonra(e.target.checked)} className="mt-0.5" />
                <span>
                  Dekontu sonra yükleyeceğim <span className="text-white/45">(bana “Dekont yükle” görevi açılır)</span>
                </span>
              </label>
            )}
          </Alan>
        </div>
        <Alan>
          <Etiket htmlFor="go-tutar">Tutar (TL)</Etiket>
          <ParaGirdisi id="go-tutar" name="tutar" required />
        </Alan>
        <Alan>
          <Etiket htmlFor="go-tarih">Tarih</Etiket>
          <Girdi id="go-tarih" name="tarih" type="date" required defaultValue={bugun} />
        </Alan>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor="go-odeyen">Ödeyen (dekonttaki gönderen adı)</Etiket>
            <Girdi id="go-odeyen" name="odeyenAdi" placeholder="örn. şirket ya da kişi adı" />
          </Alan>
        </div>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor="go-dosya">Dosya (biliyorsanız)</Etiket>
            <DosyaSecici id="go-dosya" name="dosyaId" dosyalar={dosyalar} bosSecenek="Bilmiyorum, sonra belirlenecek" placeholder="KN no, esas no ya da müvekkil adı yazın…" />
          </Alan>
        </div>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor="go-not">Paranın geliş sebebi (zorunlu)</Etiket>
            <MetinAlani id="go-not" name="aciklama" rows={2} required={!sebepSonra} placeholder="örn. istinaf başvuru masrafı, vekalet ücreti, harç avansı" />
            <label className="mt-2 flex items-start gap-2 text-sm text-white/70">
              <input type="checkbox" checked={sebepSonra} onChange={(e) => setSebepSonra(e.target.checked)} className="mt-0.5" />
              <span>
                Sebebi şimdi yazamıyorum <span className="text-white/45">(bana “Ödeme sebebini yaz” görevi açılır; sebep yazılmadan kayıt teyit edilemez)</span>
              </span>
            </label>
          </Alan>
        </div>
      </div>
      <p className="mt-3 text-xs text-white/50">
        Kayıt “Muhasebe teyidi bekliyor” durumunda açılır; dosya seçtiyseniz dosyada uyarı olarak görünür. Bakiyeye teyitten sonra katılır. Dosya seçilmezse teyitten sonra para Para Havuzu’na düşer.
      </p>
      {hata && <p className="mt-2 text-sm text-[#ff7a70]">{hata}</p>}
      <div className="mt-3">
        <Dugme type="submit" disabled={bekliyor || yukleniyor}>
          {bekliyor ? "Kaydediliyor…" : "Kaydet ve teyide gönder"}
        </Dugme>
      </div>
    </form>
  );
}

export function TeyitEylemleri({ id, yetkili, kendiKaydi, musteriSecimi }: { id: string; yetkili: boolean; kendiKaydi: boolean; musteriSecimi: { id: string; ad: string }[] }) {
  const router = useRouter();
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  const [musteri, setMusteri] = useState("");
  const [neden, setNeden] = useState("");
  const [redAcik, setRedAcik] = useState(false);

  function calistir(is: () => Promise<{ hata?: string }>) {
    setHata("");
    basla(async () => {
      const s = await is();
      if (s.hata) setHata(s.hata);
      else router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {yetkili && !kendiKaydi && (
        <div className="flex flex-wrap items-center gap-2">
          {musteriSecimi.length > 1 && (
            <select value={musteri} onChange={(e) => setMusteri(e.target.value)} className="rounded-md border border-white/20 bg-black/20 px-2 py-1 text-xs text-white">
              <option value="">Müvekkil seçin…</option>
              {musteriSecimi.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.ad}
                </option>
              ))}
            </select>
          )}
          <button type="button" disabled={bekliyor} onClick={() => calistir(() => gelenOdemeTeyitEt(id, musteri))} className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#0b1d36] disabled:opacity-50">
            Hesapta göründü, teyit et
          </button>
          <button type="button" disabled={bekliyor} onClick={() => setRedAcik((a) => !a)} className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
            Hesapta yok / tutarsız
          </button>
        </div>
      )}
      {yetkili && kendiKaydi && <p className="text-xs text-white/45">Bu kaydı siz girdiniz; teyidi başka bir yetkili verir.</p>}
      {redAcik && (
        <div className="flex flex-wrap items-center gap-2">
          <input value={neden} onChange={(e) => setNeden(e.target.value)} placeholder="Neden (ör. tutar farklı, hesapta görünmüyor)" className="min-w-[16rem] flex-1 rounded-md border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)]" />
          <button type="button" disabled={bekliyor} onClick={() => calistir(() => gelenOdemeTeyitEdilemedi(id, neden))} className="rounded-md border border-[#ff7a70]/60 px-3 py-1.5 text-xs font-semibold text-[#ff9b92] hover:bg-[#ff7a70]/10">
            Teyit edilemedi olarak işaretle
          </button>
        </div>
      )}
      {hata && <p className="text-xs text-[#ff7a70]">{hata}</p>}
    </div>
  );
}

export function KayitSilDugmesi({ id }: { id: string }) {
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => {
        if (!confirm("Bu kayıt silinsin mi?")) return;
        basla(async () => {
          await gelenOdemeSil(id);
          router.refresh();
        });
      }}
      className="text-xs text-white/40 hover:text-[#ff7a70]"
    >
      Sil
    </button>
  );
}

// Hatalı girilen kaydı (tutar, tarih, ödeyen, dosya, not) yerinde düzeltir.
export function KayitDuzenleDugmesi({
  id,
  tutar,
  tarih,
  odeyenAdi,
  aciklama,
  dosyaId,
  dosyalar,
}: {
  id: string;
  tutar: number;
  tarih: string;
  odeyenAdi: string;
  aciklama: string;
  dosyaId: string;
  dosyalar: DosyaSeciciSecenegi[];
}) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  if (!acik)
    return (
      <button type="button" onClick={() => setAcik(true)} className="text-xs text-[#8fd8ff] hover:underline">
        Düzelt
      </button>
    );
  return (
    <form
      action={(fd) => {
        setHata("");
        basla(async () => {
          const s = await gelenOdemeDuzenle(id, fd);
          if (s.hata) setHata(s.hata);
          else {
            setAcik(false);
            router.refresh();
          }
        });
      }}
      className="mt-3 w-full rounded-xl border border-white/15 bg-black/10 p-3"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">Kaydı düzelt</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor={`dz-tutar-${id}`}>Tutar (TL)</Etiket>
          <ParaGirdisi id={`dz-tutar-${id}`} name="tutar" required defaultValue={tutar} />
        </Alan>
        <Alan>
          <Etiket htmlFor={`dz-tarih-${id}`}>Tarih</Etiket>
          <Girdi id={`dz-tarih-${id}`} name="tarih" type="date" required defaultValue={tarih} />
        </Alan>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor={`dz-odeyen-${id}`}>Ödeyen</Etiket>
            <Girdi id={`dz-odeyen-${id}`} name="odeyenAdi" defaultValue={odeyenAdi} />
          </Alan>
        </div>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor={`dz-dosya-${id}`}>Dosya</Etiket>
            <DosyaSecici id={`dz-dosya-${id}`} name="dosyaId" dosyalar={dosyalar} bosSecenek="Bilmiyorum, sonra belirlenecek" defaultValue={dosyaId} />
          </Alan>
        </div>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor={`dz-not-${id}`}>Paranın geliş sebebi (zorunlu)</Etiket>
            <MetinAlani id={`dz-not-${id}`} name="aciklama" rows={2} required defaultValue={aciklama} />
          </Alan>
        </div>
      </div>
      {hata && <p className="mt-2 text-sm text-[#ff7a70]">{hata}</p>}
      <div className="mt-3 flex gap-2">
        <Dugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Düzeltmeyi kaydet"}
        </Dugme>
        <button type="button" onClick={() => setAcik(false)} className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
          Vazgeç
        </button>
      </div>
    </form>
  );
}

// Teyitli kayıt için düzeltme TALEBİ: teyit verenin onayına gider.
export function DuzeltmeTalebiDugmesi({ id, tutar, tarih, odeyenAdi, aciklama }: { id: string; tutar: number; tarih: string; odeyenAdi: string; aciklama: string }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState("");
  const [bekliyor, basla] = useTransition();
  if (!acik)
    return (
      <button type="button" onClick={() => setAcik(true)} className="text-xs text-[#8fd8ff] hover:underline">
        Düzeltme talebi aç
      </button>
    );
  return (
    <form
      action={(fd) => {
        setHata("");
        basla(async () => {
          const s = await gelenOdemeDuzeltmeTalebiVer(id, fd);
          if (s.hata) setHata(s.hata);
          else {
            setAcik(false);
            router.refresh();
          }
        });
      }}
      className="mt-3 w-full rounded-xl border border-white/15 bg-black/10 p-3"
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/60">Teyitli kaydı düzeltme talebi</p>
      <p className="mb-2 text-xs text-white/45">Bu kayıt teyitli olduğu için değişiklik hemen uygulanmaz; teyidi veren yetkilinin onayına gider. Onaylanınca cari/havuz kaydı da güncellenir.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor={`dt-tutar-${id}`}>Doğru tutar (TL)</Etiket>
          <ParaGirdisi id={`dt-tutar-${id}`} name="tutar" required defaultValue={tutar} />
        </Alan>
        <Alan>
          <Etiket htmlFor={`dt-tarih-${id}`}>Tarih</Etiket>
          <Girdi id={`dt-tarih-${id}`} name="tarih" type="date" required defaultValue={tarih} />
        </Alan>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor={`dt-odeyen-${id}`}>Ödeyen</Etiket>
            <Girdi id={`dt-odeyen-${id}`} name="odeyenAdi" defaultValue={odeyenAdi} />
          </Alan>
        </div>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor={`dt-not-${id}`}>Not</Etiket>
            <MetinAlani id={`dt-not-${id}`} name="aciklama" rows={2} defaultValue={aciklama} />
          </Alan>
        </div>
        <div className="sm:col-span-2">
          <Alan>
            <Etiket htmlFor={`dt-gerekce-${id}`}>Düzeltme gerekçesi</Etiket>
            <Girdi id={`dt-gerekce-${id}`} name="gerekce" required placeholder="örn. tutarı yanlış girdim" />
          </Alan>
        </div>
      </div>
      {hata && <p className="mt-2 text-sm text-[#ff7a70]">{hata}</p>}
      <div className="mt-3 flex gap-2">
        <Dugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Gönderiliyor…" : "Onaya gönder"}
        </Dugme>
        <button type="button" onClick={() => setAcik(false)} className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
          Vazgeç
        </button>
      </div>
    </form>
  );
}

// Onay bekleyen düzeltme talebi: eski → yeni; yetkili onaylar/reddeder.
export function DuzeltmeKarari({
  talepId,
  onaylayabilir,
  ozet,
}: {
  talepId: string;
  onaylayabilir: boolean;
  ozet: { talepEden: string; gerekce: string; satirlar: { ad: string; eski: string; yeni: string }[] };
}) {
  const router = useRouter();
  const [hata, setHata] = useState("");
  const [not, setNot] = useState("");
  const [bekliyor, basla] = useTransition();
  function karar(onay: boolean) {
    setHata("");
    basla(async () => {
      const s = await gelenOdemeDuzeltmeKarari(talepId, onay, not);
      if (s.hata) setHata(s.hata);
      else router.refresh();
    });
  }
  return (
    <div className="mt-3 rounded-xl border border-[#f2b04c]/40 bg-[#f2b04c]/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#f2b04c]">Düzeltme talebi onay bekliyor</p>
      <p className="mt-1 text-xs text-white/60">
        {ozet.talepEden} · gerekçe: {ozet.gerekce}
      </p>
      <ul className="mt-1 text-sm text-white/80">
        {ozet.satirlar.map((x) => (
          <li key={x.ad}>
            {x.ad}: <span className="text-white/50 line-through">{x.eski}</span> → <b>{x.yeni}</b>
          </li>
        ))}
      </ul>
      {onaylayabilir ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={not} onChange={(e) => setNot(e.target.value)} placeholder="Karar notu (isteğe bağlı)" className="min-w-[12rem] flex-1 rounded-md border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent)]" />
          <button type="button" disabled={bekliyor} onClick={() => karar(true)} className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#0b1d36] disabled:opacity-50">
            Onayla ve uygula
          </button>
          <button type="button" disabled={bekliyor} onClick={() => karar(false)} className="rounded-md border border-[#ff7a70]/60 px-3 py-1.5 text-xs font-semibold text-[#ff9b92] hover:bg-[#ff7a70]/10">
            Reddet
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-white/45">Teyidi veren yetkilinin kararı bekleniyor.</p>
      )}
      {hata && <p className="mt-1 text-xs text-[#ff7a70]">{hata}</p>}
    </div>
  );
}

// Dekontsuz girilmiş kayda sonradan dekont ekler.
export function DekontEkleDugmesi({ id }: { id: string }) {
  const router = useRouter();
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  async function yukle(d: File) {
    setYukleniyor(true);
    setHata("");
    try {
      const s = await upload(`isler/dekont/${crypto.randomUUID()}-${d.name}`, d, { access: "private", handleUploadUrl: "/api/isler/blob-upload" });
      const r = await gelenOdemeDekontEkle(id, s.url, d.name, d.type);
      if (r.hata) setHata(r.hata);
      else router.refresh();
    } catch (e) {
      setHata("Yüklenemedi: " + (e instanceof Error ? e.message : "bilinmeyen hata"));
    } finally {
      setYukleniyor(false);
    }
  }
  return (
    <div className="mt-1">
      <label className="inline-block cursor-pointer rounded-md border border-[#f2b04c]/50 bg-[#f2b04c]/15 px-3 py-1 text-xs font-medium text-[#f2b04c] hover:bg-[#f2b04c]/25">
        {yukleniyor ? "Yükleniyor…" : "📎 Dekontu yükle"}
        <input type="file" accept="image/*,application/pdf" className="hidden" disabled={yukleniyor} onChange={(e) => e.target.files?.[0] && void yukle(e.target.files[0])} />
      </label>
      {hata && <p className="mt-1 text-xs text-[#ff9b92]">{hata}</p>}
    </div>
  );
}
