"use client";

import { useEffect, useRef, useState } from "react";
import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { EkBelgePaneli } from "@/modules/dava-dosyasi/components/ekonomi/ek-belge-paneli";

type Satir = { anahtar: number; dahil: boolean; baslik: string; aciklama: string; tutar: string; tahakkuk?: number; odenen?: number; kalan?: number };

const BANKA_ANAHTARI = "kokpit-odeme-talebi-banka";
const para = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function adBicimle(ad: string): string {
  return ad
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toLocaleUpperCase("tr") + p.slice(1).toLocaleLowerCase("tr"))
    .join(" ");
}

function bugunArti(gun: number) {
  const d = new Date();
  d.setDate(d.getDate() + gun);
  return d.toISOString().slice(0, 10);
}

// "Müvekkil Hesap Özeti" hazırlama formu: satırlar cari hesaplardan gelir,
// istenen satır kapatılır/değiştirilir; çıktı A4 PDF ya da WhatsApp metni.
export function OdemeTalebiFormu({
  musteriId,
  musteriAdi,
  baslangicSatirlari,
  dokumSayisi,
  dokumToplami,
}: {
  musteriId: string;
  musteriAdi: string;
  baslangicSatirlari: { baslik: string; aciklama: string; tutar: number; tahakkuk?: number; odenen?: number; kalan?: number }[];
  dokumSayisi: number;
  dokumToplami: number;
}) {
  const [satirlar, setSatirlar] = useState<Satir[]>(
    baslangicSatirlari.map((s, i) => ({
      anahtar: i + 1,
      dahil: true,
      baslik: s.baslik,
      aciklama: s.aciklama,
      tutar: s.tutar.toFixed(2),
      tahakkuk: s.tahakkuk,
      odenen: s.odenen,
      kalan: s.kalan,
    })),
  );
  const [sonOdeme, setSonOdeme] = useState("");
  const [banka, setBanka] = useState({ hesapSahibi: "", banka: "", iban: "" });
  const [kod, setKod] = useState(() => {
    const parcalar = musteriAdi.trim().split(/\s+/);
    const soyad = (parcalar[parcalar.length - 1] ?? "")
      .toLocaleUpperCase("tr")
      .replace(/Ç/g, "C").replace(/Ğ/g, "G").replace(/İ/g, "I").replace(/Ö/g, "O").replace(/Ş/g, "S").replace(/Ü/g, "U");
    return `${soyad}-${new Date().getFullYear()}`;
  });
  const [dokum, setDokum] = useState(dokumSayisi > 0);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hitap, setHitap] = useState("");
  const [ekHazir, setEkHazir] = useState(true);
  const [uretiyor, setUretiyor] = useState(false);
  const [hata, setHata] = useState("");
  const [sonuc, setSonuc] = useState<{ url: string; ad: string; boyut: number; dosya: File } | null>(null);
  const sonucRef = useRef<HTMLElement>(null);
  const paylasilabilir = typeof navigator !== "undefined" && typeof navigator.canShare === "function" && sonuc ? navigator.canShare({ files: [sonuc.dosya] }) : false;

  // Belgeyi sunucuda uretip tarayicida tutar: "indir" sunucuya yeniden gitmez, bu yuzden ag hatasi vermez.
  async function belgeUret(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (uretiyor) return;
    setHata("");
    setUretiyor(true);
    try {
      const yanit = await fetch("/api/odeme-talebi", { method: "POST", body: new FormData(e.currentTarget) });
      if (!yanit.ok) {
        let mesaj = "Belge hazırlanamadı.";
        try {
          mesaj = ((await yanit.json()) as { hata?: string }).hata ?? mesaj;
        } catch {
          // govde JSON degil
        }
        throw new Error(mesaj);
      }
      const blob = await yanit.blob();
      const ad = yanit.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "Muvekkil-Hesap-Ozeti.pdf";
      if (sonuc) URL.revokeObjectURL(sonuc.url);
      setSonuc({ url: URL.createObjectURL(blob), ad, boyut: blob.size, dosya: new File([blob], ad, { type: "application/pdf" }) });
      setTimeout(() => sonucRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Belge hazırlanamadı.");
    } finally {
      setUretiyor(false);
    }
  }

  async function paylas() {
    if (!sonuc) return;
    try {
      await navigator.share({ files: [sonuc.dosya], title: "Müvekkil Hesap Özeti" });
    } catch {
      // kullanici vazgecti
    }
  }

  useEffect(() => {
    const zamanlayici = setTimeout(() => {
      try {
        const kayitli = localStorage.getItem(BANKA_ANAHTARI);
        if (kayitli) setBanka(JSON.parse(kayitli));
      } catch {
        // tarayici depolamasi yoksa alanlar bos kalir
      }
    }, 0);
    return () => clearTimeout(zamanlayici);
  }, []);

  function bankaGuncelle(alan: "hesapSahibi" | "banka" | "iban", deger: string) {
    const yeni = { ...banka, [alan]: deger };
    setBanka(yeni);
    try {
      localStorage.setItem(BANKA_ANAHTARI, JSON.stringify(yeni));
    } catch {
      // ignore
    }
  }

  const sayi = (t: string) => Number(t.replace(",", ".")) || 0;
  const dahilSatirlar = satirlar.filter((s) => s.dahil && s.baslik.trim() && sayi(s.tutar) !== 0);
  const toplam = dahilSatirlar.reduce((t, s) => t + sayi(s.tutar), 0);

  function guncelle(anahtar: number, yama: Partial<Satir>) {
    setSatirlar((onceki) => onceki.map((s) => (s.anahtar === anahtar ? { ...s, ...yama } : s)));
  }

  async function whatsappKopyala() {
    const satirMetni = dahilSatirlar.map((s) => `• ${s.baslik}: ${para.format(sayi(s.tutar))} TL`).join("\n");
    const tamAd = adBicimle(musteriAdi);
    const selam = hitap ? `${tamAd.split(" ")[0]} ${hitap}` : tamAd;
    const metin =
      `${selam} merhaba, hesap özetinizi iletiyorum.\n\n${satirMetni}\n\n` +
      `*Ödemeniz gereken toplam: ${para.format(toplam)} TL*\n` +
      (sonOdeme ? `Son ödeme tarihi: ${sonOdeme.split("-").reverse().join(".")}\n` : "") +
      (banka.iban ? `\nHesap sahibi: ${banka.hesapSahibi}\nBanka: ${banka.banka}\nIBAN: ${banka.iban}\n` : "") +
      (kod ? `Havale açıklamasına yazınız: ${kod}\n` : "") +
      `\nÖdemeyi gönderdiğinizde bilgi verirseniz süreci başlatalım.\n\nEces Hukuk Bürosu`;
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      window.prompt("Metni kopyalayın:", metin);
    }
  }

  const tarihYazi = (iso: string) => (iso ? iso.split("-").reverse().join(".") : "");
  const kart = "rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6";
  const baslikStili = "text-[22px] font-semibold tracking-tight text-white";
  const altYazi = "mt-1 text-sm leading-relaxed text-white/50";
  const girdiStili = "!rounded-xl !py-2.5";

  return (
    <form method="post" action="/api/odeme-talebi" encType="multipart/form-data" onSubmit={belgeUret} className="pb-28 lg:pb-0">
      <input type="hidden" name="musteriId" value={musteriId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {(sonuc || hata) && (
            <section ref={sonucRef} className="rounded-3xl border border-[var(--accent)] bg-[var(--accent-soft)] p-5 sm:p-6">
              {hata ? (
                <p className="text-sm text-[#ff7a70]">{hata}</p>
              ) : (
                sonuc && (
                  <>
                    <h2 className="text-lg font-semibold text-white">✓ Belge hazır</h2>
                    <p className="mt-1 break-all text-sm text-white/60">
                      {sonuc.ad} · {sonuc.boyut >= 1048576 ? `${(sonuc.boyut / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(sonuc.boyut / 1024))} KB`}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href={sonuc.url} target="_blank" rel="noreferrer" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                        Aç
                      </a>
                      <a href={sonuc.url} download={sonuc.ad} className="rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
                        İndir
                      </a>
                      {paylasilabilir && (
                        <button type="button" onClick={paylas} className="rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10">
                          Paylaş (WhatsApp vb.)
                        </button>
                      )}
                    </div>
                  </>
                )
              )}
            </section>
          )}
          <section className={kart}>
            <h2 className={baslikStili}>Ne için, ne kadar?</h2>
            <p className={altYazi}>
              Satırlar müvekkil ekonomisinden geldi. İstemediğinizi kapatın, tutar ve açıklamayı değiştirin. Müvekkil bu
              açıklamaları okuyacak.
            </p>
            <div className="mt-5 divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-white/10 bg-black/10">
              {satirlar.map((s) => (
                <div key={s.anahtar} className={`p-4 transition-opacity ${s.dahil ? "" : "opacity-40"}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={s.dahil}
                      onChange={(e) => guncelle(s.anahtar, { dahil: e.target.checked })}
                      aria-label="Belgeye ekle"
                      className="h-5 w-5 shrink-0 accent-[var(--accent)]"
                    />
                    <Girdi
                      value={s.baslik}
                      onChange={(e) => guncelle(s.anahtar, { baslik: e.target.value })}
                      placeholder="Ne için (ör. Avukatlık ücreti)"
                      className={`min-w-0 flex-1 ${girdiStili}`}
                    />
                    <button
                      type="button"
                      onClick={() => setSatirlar((o) => o.filter((x) => x.anahtar !== s.anahtar))}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-white/40 hover:bg-white/10 hover:text-[#ff7a70]"
                      title="Satırı sil"
                      aria-label="Satırı sil"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                    <div className="min-w-48 flex-1">
                      <Girdi
                        value={s.aciklama}
                        onChange={(e) => guncelle(s.anahtar, { aciklama: e.target.value })}
                        placeholder="Kısa açıklama"
                        className={`text-sm ${girdiStili}`}
                      />
                    </div>
                    <div className="flex w-44 shrink-0 items-center gap-2">
                      <Girdi
                        value={s.tutar}
                        onChange={(e) => guncelle(s.anahtar, { tutar: e.target.value })}
                        inputMode="decimal"
                        placeholder="0,00"
                        aria-label="Tutar (TL)"
                        className={`text-right text-lg font-semibold ${girdiStili}`}
                      />
                      <span className="text-sm text-white/40">TL</span>
                    </div>
                  </div>
                  {s.tahakkuk !== undefined && (
                    <div className="mt-3 grid grid-cols-3 gap-2 pl-8 text-center">
                      <div className="rounded-xl bg-white/[0.05] px-2 py-2">
                        <p className="text-[10px] text-white/45">Tahakkuk eden</p>
                        <p className="text-sm font-semibold text-white/90">{para.format(s.tahakkuk)}</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.05] px-2 py-2">
                        <p className="text-[10px] text-white/45">Önceden ödenen</p>
                        <p className="text-sm font-semibold text-[#32d74b]">{para.format(s.odenen ?? 0)}</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.05] px-2 py-2">
                        <p className="text-[10px] text-white/45">Güncel bakiye</p>
                        <p className="text-sm font-semibold text-[#ff7a70]">{para.format(s.kalan ?? 0)}</p>
                      </div>
                    </div>
                  )}
                  {s.dahil && s.baslik.trim() && sayi(s.tutar) !== 0 && (
                    <>
                      <input type="hidden" name="satirTahakkuk" value={s.tahakkuk ?? ""} />
                      <input type="hidden" name="satirOdenen" value={s.odenen ?? ""} />
                      <input type="hidden" name="satirKalan" value={s.kalan ?? ""} />
                      <input type="hidden" name="satirBaslik" value={s.baslik} />
                      <input type="hidden" name="satirAciklama" value={s.aciklama} />
                      <input type="hidden" name="satirTutar" value={s.tutar} />
                    </>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSatirlar((o) => [...o, { anahtar: Math.max(0, ...o.map((x) => x.anahtar)) + 1, dahil: true, baslik: "", aciklama: "", tutar: "" }])}
              className="mt-3 rounded-full px-3 py-2 text-sm font-medium text-[#6db8ff] hover:bg-white/[0.06]"
            >
              ＋ Satır ekle
            </button>
            {dokumSayisi > 0 && (
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-white/80">
                <input type="checkbox" name="dokum" value="1" checked={dokum} onChange={(e) => setDokum(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
                <span>
                  Masraf dökümünü de ekle
                  <span className="block text-xs text-white/45">
                    {dokumSayisi} kalem · toplam {para.format(dokumToplami)} TL
                  </span>
                </span>
              </label>
            )}
          </section>

          <section className={kart}>
            <h2 className={baslikStili}>Ek belgeler</h2>
            <p className={altYazi}>
              Dekont, makbuz, tebligat gibi belgeleri sürükleyip bırakın; müvekkil hesap özetinin sonuna EK-1, EK-2… olarak eklenir. İsteğe bağlıdır.
            </p>
            <div className="mt-5">
              <EkBelgePaneli onDurum={(d) => setEkHazir(d.hazir)} />
            </div>
          </section>

          <section className={kart}>
            <h2 className={baslikStili}>Nasıl ödenecek?</h2>
            <p className={altYazi}>Banka bilgileri bu bilgisayarda hatırlanır, her seferinde yazmanız gerekmez.</p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Alan>
                <Etiket htmlFor="sonOdemeTarihi">Son ödeme tarihi (isteğe bağlı)</Etiket>
                <Girdi id="sonOdemeTarihi" name="sonOdemeTarihi" type="date" value={sonOdeme} onChange={(e) => setSonOdeme(e.target.value)} className={girdiStili} />
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  {[7, 15, 30].map((gun) => (
                    <button
                      key={gun}
                      type="button"
                      onClick={() => setSonOdeme(bugunArti(gun))}
                      className="rounded-full border border-white/15 px-2.5 py-1 text-white/70 hover:bg-white/10"
                    >
                      {gun} gün
                    </button>
                  ))}
                  {sonOdeme && (
                    <button type="button" onClick={() => setSonOdeme("")} className="rounded-full px-2.5 py-1 text-[#ff7a70] hover:bg-white/10">
                      Tarihi kaldır
                    </button>
                  )}
                </div>
              </Alan>
              <Alan>
                <Etiket htmlFor="hitap">Hitap</Etiket>
                <Secim id="hitap" name="hitap" value={hitap} onChange={(e) => setHitap(e.target.value)} className={girdiStili}>
                  <option value="">Yalnızca ad soyad</option>
                  <option value="Bey">Bey</option>
                  <option value="Hanım">Hanım</option>
                </Secim>
              </Alan>
              <Alan>
                <Etiket htmlFor="hesapSahibi">Hesap sahibi</Etiket>
                <Girdi id="hesapSahibi" name="hesapSahibi" value={banka.hesapSahibi} onChange={(e) => bankaGuncelle("hesapSahibi", e.target.value)} className={girdiStili} />
              </Alan>
              <Alan>
                <Etiket htmlFor="banka">Banka</Etiket>
                <Girdi id="banka" name="banka" value={banka.banka} onChange={(e) => bankaGuncelle("banka", e.target.value)} className={girdiStili} />
              </Alan>
              <div className="sm:col-span-2">
                <Alan>
                  <Etiket htmlFor="iban">IBAN</Etiket>
                  <Girdi id="iban" name="iban" value={banka.iban} onChange={(e) => bankaGuncelle("iban", e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" className={girdiStili} />
                </Alan>
              </div>
              <div className="sm:col-span-2">
                <Alan>
                  <Etiket htmlFor="aciklamaKodu">Havale açıklamasına yazılacak</Etiket>
                  <Girdi id="aciklamaKodu" name="aciklamaKodu" value={kod} onChange={(e) => setKod(e.target.value)} className={girdiStili} />
                </Alan>
              </div>
              <div className="sm:col-span-2">
                <Alan>
                  <Etiket htmlFor="not">Müvekkile not (isteğe bağlı)</Etiket>
                  <MetinAlani id="not" name="not" rows={2} placeholder="ör. Duruşma öncesi ödemenizi rica ederiz." className="!rounded-xl" />
                </Alan>
              </div>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#ffffff] text-[#1d1d1f] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
            <div className="px-6 pb-2 pt-6">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-[#6e6e73]">ECES HUKUK BÜROSU</p>
              <p className="text-xl font-bold leading-tight">Müvekkil Hesap Özeti</p>
              <p className="mt-2 text-xs text-[#6e6e73]">
                Sayın {adBicimle(musteriAdi)}
                {hitap ? ` ${hitap}` : ""}
              </p>
            </div>
            <div className="mx-4 rounded-2xl bg-[#f5f5f7] px-4 py-4">
              <p className="text-[11px] text-[#6e6e73]">Ödemeniz gereken toplam tutar</p>
              <p className="text-3xl font-bold tracking-tight">{para.format(toplam)} TL</p>
              {sonOdeme && <p className="mt-1 text-xs font-semibold text-[#0071e3]">Son ödeme tarihi: {tarihYazi(sonOdeme)}</p>}
            </div>
            <div className="px-6 py-4">
              <p className="mb-1 text-xs font-bold">Bu tutar neye ilişkin?</p>
              {dahilSatirlar.length === 0 && <p className="py-3 text-xs text-[#6e6e73]">Henüz satır yok.</p>}
              {dahilSatirlar.map((x) => (
                <div key={x.anahtar} className="flex items-start justify-between gap-3 border-t border-[#d2d2d7] py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{x.baslik}</p>
                    {x.aciklama && <p className="truncate text-[10px] text-[#6e6e73]">{x.aciklama}</p>}
                    {x.tahakkuk !== undefined && (
                      <p className="text-[9px] text-[#6e6e73]">
                        Tahakkuk {para.format(x.tahakkuk)} · Ödenen {para.format(x.odenen ?? 0)} · Bakiye {para.format(x.kalan ?? 0)}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs font-bold">{para.format(sayi(x.tutar))} TL</p>
                </div>
              ))}
              {banka.iban && (
                <div className="mt-3 rounded-xl border border-[#d2d2d7] p-3 text-[11px]">
                  <p className="mb-1 font-bold">Nasıl ödeyebilirsiniz?</p>
                  <p className="text-[#6e6e73]">{banka.hesapSahibi}</p>
                  <p className="font-semibold">{banka.iban}</p>
                  {kod && <p className="mt-1 font-semibold text-[#0071e3]">Açıklamaya yazın: {kod}</p>}
                </div>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-white/35">Canlı önizleme · A4 PDF bu görünümde hazırlanır</p>

          <div className="mt-4 hidden flex-col gap-2 lg:flex">
            <button
              type="submit"
              disabled={dahilSatirlar.length === 0 || !ekHazir || uretiyor}
              className="rounded-full bg-[var(--accent)] px-5 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uretiyor ? "Hazırlanıyor…" : "📄 A4 PDF Oluştur"}
            </button>
            <button
              type="button"
              onClick={whatsappKopyala}
              disabled={dahilSatirlar.length === 0}
              className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-base font-medium text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {kopyalandi ? "Kopyalandı ✓" : "WhatsApp metnini kopyala"}
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[var(--background)]/90 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="min-w-0 pr-1">
            <p className="text-[11px] leading-none text-white/50">Toplam</p>
            <p className="text-lg font-bold leading-tight text-white">{para.format(toplam)} TL</p>
          </div>
          <button
            type="button"
            onClick={whatsappKopyala}
            disabled={dahilSatirlar.length === 0}
            className="whitespace-nowrap rounded-full border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white/90 disabled:opacity-40"
          >
            {kopyalandi ? "✓" : "WhatsApp"}
          </button>
          <button
            type="submit"
            disabled={dahilSatirlar.length === 0 || !ekHazir || uretiyor}
            className="flex-1 whitespace-nowrap rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {uretiyor ? "Hazırlanıyor…" : "📄 PDF Oluştur"}
          </button>
        </div>
      </div>
    </form>
  );
}
