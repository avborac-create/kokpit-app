"use client";

import { useEffect, useState } from "react";
import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";

type Satir = { anahtar: number; dahil: boolean; baslik: string; aciklama: string; tutar: string };

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
  baslangicSatirlari: { baslik: string; aciklama: string; tutar: number }[];
  dokumSayisi: number;
  dokumToplami: number;
}) {
  const [satirlar, setSatirlar] = useState<Satir[]>(
    baslangicSatirlari.map((s, i) => ({ anahtar: i + 1, dahil: true, baslik: s.baslik, aciklama: s.aciklama, tutar: s.tutar.toFixed(2) })),
  );
  const [sonOdeme, setSonOdeme] = useState(bugunArti(7));
  const [banka, setBanka] = useState({ hesapSahibi: "", banka: "", iban: "" });
  const [kod, setKod] = useState(() => {
    const parcalar = musteriAdi.trim().split(/\s+/);
    const soyad = (parcalar[parcalar.length - 1] ?? "")
      .toLocaleUpperCase("tr")
      .replace(/Ç/g, "C").replace(/Ğ/g, "G").replace(/İ/g, "I").replace(/Ö/g, "O").replace(/Ş/g, "S").replace(/Ü/g, "U");
    return `${soyad}-${new Date().getFullYear()}`;
  });
  const [dokum, setDokum] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hitap, setHitap] = useState("");

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

  return (
    <form method="post" action="/api/odeme-talebi" target="_blank" className="space-y-6">
      <input type="hidden" name="musteriId" value={musteriId} />

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-1 text-base font-semibold text-white">1 · Ne için, ne kadar isteniyor?</h2>
        <p className="mb-4 text-xs text-white/45">
          Satırlar müvekkil ekonomisindeki hesaplardan geldi. İstemediğiniz satırın işaretini kaldırın, tutarı ya da
          açıklamayı değiştirin. Müvekkile okunaklı bir dille anlatılır.
        </p>
        <div className="space-y-3">
          {satirlar.map((s) => (
            <div key={s.anahtar} className={`rounded-xl border border-white/10 p-3 ${s.dahil ? "" : "opacity-40"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.dahil}
                  onChange={(e) => guncelle(s.anahtar, { dahil: e.target.checked })}
                  aria-label="Belgeye ekle"
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <Girdi
                  value={s.baslik}
                  onChange={(e) => guncelle(s.anahtar, { baslik: e.target.value })}
                  placeholder="Ne için (ör. Avukatlık ücreti)"
                  className="min-w-48 flex-1"
                />
                <Girdi
                  value={s.tutar}
                  onChange={(e) => guncelle(s.anahtar, { tutar: e.target.value })}
                  inputMode="decimal"
                  placeholder="Tutar (TL)"
                  className="w-36 text-right"
                />
                <button
                  type="button"
                  onClick={() => setSatirlar((o) => o.filter((x) => x.anahtar !== s.anahtar))}
                  className="px-2 text-lg text-[#ff7a70] hover:bg-white/10"
                  title="Satırı sil"
                >
                  ×
                </button>
              </div>
              <Girdi
                value={s.aciklama}
                onChange={(e) => guncelle(s.anahtar, { aciklama: e.target.value })}
                placeholder="Kısa açıklama (müvekkil bunu okuyacak)"
                className="mt-2 !py-1.5 text-xs"
              />
              {s.dahil && s.baslik.trim() && sayi(s.tutar) !== 0 && (
                <>
                  <input type="hidden" name="satirBaslik" value={s.baslik} />
                  <input type="hidden" name="satirAciklama" value={s.aciklama} />
                  <input type="hidden" name="satirTutar" value={s.tutar} />
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSatirlar((o) => [...o, { anahtar: Math.max(0, ...o.map((x) => x.anahtar)) + 1, dahil: true, baslik: "", aciklama: "", tutar: "" }])}
            className="text-xs text-[#6db8ff] hover:underline"
          >
            + Satır ekle
          </button>
          <p className="text-sm text-white/70">
            Ödenecek toplam: <b className="text-lg text-white">{para.format(toplam)} TL</b>
          </p>
        </div>
        {dokumSayisi > 0 && (
          <label className="mt-3 flex items-center gap-2 text-sm text-white/75">
            <input type="checkbox" name="dokum" value="1" checked={dokum} onChange={(e) => setDokum(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Masraf dökümünü de ekle ({dokumSayisi} kalem, toplam {para.format(dokumToplami)} TL)
          </label>
        )}
      </section>

      <section className="glass rounded-2xl p-5">
        <h2 className="mb-3 text-base font-semibold text-white">2 · Ne zamana kadar, nasıl ödenecek?</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Alan>
            <Etiket htmlFor="hitap">Hitap</Etiket>
            <Secim id="hitap" name="hitap" value={hitap} onChange={(e) => setHitap(e.target.value)}>
              <option value="">Yalnızca ad soyad</option>
              <option value="Bey">Bey</option>
              <option value="Hanım">Hanım</option>
            </Secim>
          </Alan>
          <Alan>
            <Etiket htmlFor="sonOdemeTarihi">Son ödeme tarihi</Etiket>
            <Girdi id="sonOdemeTarihi" name="sonOdemeTarihi" type="date" value={sonOdeme} onChange={(e) => setSonOdeme(e.target.value)} />
          </Alan>
          <Alan>
            <Etiket htmlFor="hesapSahibi">Hesap sahibi</Etiket>
            <Girdi id="hesapSahibi" name="hesapSahibi" value={banka.hesapSahibi} onChange={(e) => bankaGuncelle("hesapSahibi", e.target.value)} />
          </Alan>
          <Alan>
            <Etiket htmlFor="banka">Banka</Etiket>
            <Girdi id="banka" name="banka" value={banka.banka} onChange={(e) => bankaGuncelle("banka", e.target.value)} />
          </Alan>
          <div className="sm:col-span-2">
            <Alan>
              <Etiket htmlFor="iban">IBAN</Etiket>
              <Girdi id="iban" name="iban" value={banka.iban} onChange={(e) => bankaGuncelle("iban", e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" />
            </Alan>
          </div>
          <Alan>
            <Etiket htmlFor="aciklamaKodu">Havale açıklamasına yazılacak</Etiket>
            <Girdi id="aciklamaKodu" name="aciklamaKodu" value={kod} onChange={(e) => setKod(e.target.value)} />
          </Alan>
        </div>
        <p className="mt-2 text-[11px] text-white/35">Banka bilgileri bu bilgisayarda hatırlanır, her seferinde yazmanız gerekmez.</p>
        <div className="mt-3">
          <Alan>
            <Etiket htmlFor="not">Müvekkile not (isteğe bağlı)</Etiket>
            <MetinAlani id="not" name="not" rows={2} placeholder="ör. Duruşma öncesi ödemenizi rica ederiz." />
          </Alan>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Dugme type="submit" disabled={dahilSatirlar.length === 0}>
          📄 A4 Hesap Özeti (PDF) Oluştur
        </Dugme>
        <Dugme type="button" varyant="ikincil" onClick={whatsappKopyala} disabled={dahilSatirlar.length === 0}>
          {kopyalandi ? "Kopyalandı ✓" : "WhatsApp metnini kopyala"}
        </Dugme>
      </div>
    </form>
  );
}
