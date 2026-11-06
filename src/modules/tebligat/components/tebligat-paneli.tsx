"use client";

import { useState, useTransition } from "react";
import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { tebligatDurumGuncelle, tebligatKaydet, tebligatSil } from "../lib/actions";

export type TebligatKaydi = {
  id: string;
  yon: string;
  baslik: string;
  muhatap: string | null;
  yol: string | null;
  barkod: string | null;
  gonderimTarihi: string | null; // yyyy-mm-dd
  tebligTarihi: string | null;
  durum: string;
  sureGun: number | null;
  sonTarih: string | null;
  gorevId: string | null;
  not: string | null;
};

const YOL_ADI: Record<string, string> = { UYAP: "UYAP e-Tebligat", PTT: "PTT", KEP: "KEP", NOTER: "Noter", ELDEN: "Elden", DIGER: "Diğer" };
const DURUM: Record<string, { ad: string; sinif: string }> = {
  BEKLIYOR: { ad: "Bekliyor", sinif: "bg-[#ffd60a]/15 text-[#ffd60a]" },
  TEBLIG_EDILDI: { ad: "Tebliğ edildi", sinif: "bg-[#32d74b]/15 text-[#32d74b]" },
  IADE: { ad: "İade geldi", sinif: "bg-[#ff7a70]/15 text-[#ff7a70]" },
  GECERSIZ: { ad: "Geçersiz", sinif: "bg-white/10 text-white/60" },
};

const gunFormati = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC" });
const goster = (t: string | null) => (t ? gunFormati.format(new Date(`${t}T00:00:00Z`)) : "—");

// Kalan gun (yerel bugune gore); negatifse sure gecmistir.
function kalanGun(son: string): number {
  const b = new Date();
  const bugun = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((new Date(`${son}T00:00:00Z`).getTime() - bugun) / 86400000);
}

// PTT sayfasi baska sitelerde gomulemiyor (X-Frame-Options) ve barkodlu dogrudan adresi yok; bu yuzden Kokpit icinde
// yuzen kucuk bir panel acilir: barkod panoya kopyalanir, kucuk bir PTT penceresi (popup) acilir, sonuc panelden islenir.
type PttHedef = { barkod: string; tebligat: TebligatKaydi | null };

function pttPenceresiAc(barkod: string) {
  const temiz = barkod.replace(/\s+/g, "");
  try {
    void navigator.clipboard?.writeText(temiz);
  } catch {
    // pano izni yoksa pencere yine acilir
  }
  const w = 520;
  const h = 760;
  window.open("https://www.ptt.gov.tr/", "kokpit-ptt-sorgu", `popup=yes,width=${w},height=${h},left=${Math.max(0, window.screenX + window.outerWidth - w - 24)},top=${window.screenY + 60},resizable=yes,scrollbars=yes`);
}

function PttSorguPaneli({ dosyaId, hedef, kapat }: { dosyaId: string; hedef: PttHedef; kapat: () => void }) {
  const t = hedef.tebligat;
  const [durum, setDurum] = useState(t?.durum ?? "BEKLIYOR");
  const [tarih, setTarih] = useState(t?.tebligTarihi ?? "");
  const [mesaj, setMesaj] = useState<{ hata?: string; tamam?: boolean } | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [bekliyor, baslat] = useTransition();

  function ac() {
    pttPenceresiAc(hedef.barkod);
    setKopyalandi(true);
  }
  function isle() {
    if (!t) return;
    baslat(async () => {
      const s = await tebligatDurumGuncelle(dosyaId, t.id, durum, tarih);
      setMesaj(s.hata ? { hata: s.hata } : { tamam: true });
    });
  }

  return (
    <div className="glass fixed bottom-4 right-4 z-50 w-[min(92vw,22rem)] rounded-2xl border border-white/15 p-4 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">PTT gönderi sorgusu</h3>
        <button type="button" onClick={kapat} aria-label="Kapat" className="text-lg leading-none text-white/60 hover:text-white">×</button>
      </div>
      {t && <p className="mb-2 truncate text-xs text-white/55">{t.baslik}</p>}
      <p className="mb-2 rounded-lg bg-white/[0.06] px-3 py-2 font-mono text-sm text-white">{hedef.barkod}</p>
      <button type="button" onClick={ac} className="mb-1 w-full rounded-lg bg-[#ffd60a]/90 px-3 py-2 text-sm font-semibold text-black hover:bg-[#ffd60a]">
        Barkodu kopyala ve PTT penceresini aç
      </button>
      <p className="mb-3 text-[11px] text-white/50">
        {kopyalandi ? "Barkod panoya kopyalandı: açılan küçük PTT penceresinde “Gönderi takip no” kutusuna yapıştırıp Sorgula’ya basın (Ctrl+V)." : "Küçük bir PTT penceresi açılır; barkod panoya kopyalanır, kutuya yapıştırmanız yeterli."}
      </p>
      {t ? (
        <div className="border-t border-white/10 pt-3">
          <p className="mb-2 text-xs font-medium text-white/70">Sorgu sonucunu buraya işleyin</p>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <Secim value={durum} onChange={(e) => { setDurum(e.target.value); setMesaj(null); }}>
              {Object.entries(DURUM).map(([k, v]) => (
                <option key={k} value={k}>{v.ad}</option>
              ))}
            </Secim>
            <Girdi type="date" value={tarih} onChange={(e) => { setTarih(e.target.value); setMesaj(null); }} aria-label="Tebliğ tarihi" />
          </div>
          <div className="flex items-center gap-3">
            <Dugme type="button" onClick={isle} disabled={bekliyor}>{bekliyor ? "Kaydediliyor…" : "Kaydet"}</Dugme>
            {mesaj?.tamam && <span className="text-xs text-emerald-300">Kaydedildi</span>}
            {mesaj?.hata && <span className="text-xs text-red-300">{mesaj.hata}</span>}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Form({ dosyaId, kayit, karsiTaraflar, kapat, pttAc }: { dosyaId: string; kayit: TebligatKaydi | null; karsiTaraflar: string[]; kapat: () => void; pttAc: (h: PttHedef) => void }) {
  const [hata, setHata] = useState("");
  const [barkod, setBarkod] = useState(kayit?.barkod ?? "");
  const [bekliyor, baslat] = useTransition();
  const on = kayit?.id ?? "yeni";

  function kaydet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    baslat(async () => {
      const s = await tebligatKaydet(dosyaId, kayit?.id ?? null, f);
      if (s.hata) setHata(s.hata);
      else kapat();
    });
  }

  return (
    <form onSubmit={kaydet} onChange={() => setHata("")} className="alan-hucre mb-4">
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Alan>
          <Etiket htmlFor={`tb-baslik-${on}`}>Tebliğ edilen evrak</Etiket>
          <Girdi id={`tb-baslik-${on}`} name="baslik" defaultValue={kayit?.baslik ?? ""} placeholder="ör. Duruşma davetiyesi, cevap dilekçesi" required />
        </Alan>
        <Alan>
          <Etiket htmlFor={`tb-yon-${on}`}>Yön</Etiket>
          <Secim id={`tb-yon-${on}`} name="yon" defaultValue={kayit?.yon ?? "GELEN"}>
            <option value="GELEN">Gelen (bize tebliğ)</option>
            <option value="GIDEN">Giden (karşı tarafa)</option>
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor={`tb-muhatap-${on}`}>Muhatap</Etiket>
          <Girdi id={`tb-muhatap-${on}`} name="muhatap" list={`tb-muhatap-liste-${on}`} defaultValue={kayit?.muhatap ?? ""} placeholder="Taraf seçin ya da yazın" />
          <datalist id={`tb-muhatap-liste-${on}`}>
            {karsiTaraflar.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </Alan>
        <Alan>
          <Etiket htmlFor={`tb-yol-${on}`}>Tebliğ yolu</Etiket>
          <Secim id={`tb-yol-${on}`} name="yol" defaultValue={kayit?.yol ?? ""}>
            <option value="">Seçin…</option>
            {Object.entries(YOL_ADI).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor={`tb-barkod-${on}`}>PTT barkod / takip no</Etiket>
          <div className="flex gap-2">
            <Girdi id={`tb-barkod-${on}`} name="barkod" value={barkod} onChange={(e) => setBarkod(e.target.value)} placeholder="ör. 7270012345678" />
            <button type="button" disabled={!barkod.trim()} onClick={() => pttAc({ barkod, tebligat: kayit })} className="whitespace-nowrap rounded-lg bg-[#ffd60a]/90 px-3 text-xs font-semibold text-black hover:bg-[#ffd60a] disabled:opacity-40">
              PTT&apos;de sorgula
            </button>
          </div>
        </Alan>
        <Alan>
          <Etiket htmlFor={`tb-gtar-${on}`}>Gönderim / çıkarılma tarihi</Etiket>
          <Girdi id={`tb-gtar-${on}`} type="date" name="gonderimTarihi" defaultValue={kayit?.gonderimTarihi ?? ""} />
        </Alan>
        <Alan>
          <Etiket htmlFor={`tb-durum-${on}`}>Durum</Etiket>
          <Secim id={`tb-durum-${on}`} name="durum" defaultValue={kayit?.durum ?? "BEKLIYOR"}>
            {Object.entries(DURUM).map(([k, v]) => (
              <option key={k} value={k}>{v.ad}</option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor={`tb-ttar-${on}`}>Tebliğ tarihi</Etiket>
          <Girdi id={`tb-ttar-${on}`} type="date" name="tebligTarihi" defaultValue={kayit?.tebligTarihi ?? ""} />
        </Alan>
        <Alan>
          <Etiket htmlFor={`tb-sure-${on}`}>Süre (gün)</Etiket>
          <Girdi id={`tb-sure-${on}`} type="number" min={0} name="sureGun" defaultValue={kayit?.sureGun ?? ""} placeholder="ör. 14" />
        </Alan>
        <Alan>
          <Etiket htmlFor={`tb-son-${on}`}>Son tarih</Etiket>
          <Girdi id={`tb-son-${on}`} type="date" name="sonTarih" defaultValue={kayit?.sonTarih ?? ""} />
          <p className="mt-1 text-[11px] text-white/45">Boş bırakılırsa tebliğ tarihi + süreden hesaplanır.</p>
        </Alan>
      </div>
      <Alan>
        <Etiket htmlFor={`tb-not-${on}`}>Not</Etiket>
        <MetinAlani id={`tb-not-${on}`} name="not" rows={2} defaultValue={kayit?.not ?? ""} />
      </Alan>
      <label className="mb-3 flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" name="gorevAc" className="onay-kutusu" /> Son tarih için bana görev aç (Görevler sekmesinde görünür)
      </label>
      <div className="flex items-center gap-3">
        <Dugme type="submit" disabled={bekliyor}>{bekliyor ? "Kaydediliyor…" : "Kaydet"}</Dugme>
        <button type="button" onClick={kapat} className="text-sm text-white/60 hover:text-white">Vazgeç</button>
        {hata && <span className="text-sm text-red-300">{hata}</span>}
      </div>
    </form>
  );
}

// Dosya sayfasindaki "Tebligatlar" sekmesi: tebligat kaydi, PTT barkod sorgusu, durum, sure ve son gun takibi.
export function TebligatPaneli({ dosyaId, tebligatlar, karsiTaraflar }: { dosyaId: string; tebligatlar: TebligatKaydi[]; karsiTaraflar: string[] }) {
  const [form, setForm] = useState<string | null>(null); // "yeni" | tebligat id
  const [hizliBarkod, setHizliBarkod] = useState("");
  const [ptt, setPtt] = useState<PttHedef | null>(null);
  const [, baslat] = useTransition();

  return (
    <div className="glass max-w-4xl rounded-2xl p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">Dosya Tebligatları</h2>
        {form !== "yeni" && <Dugme onClick={() => setForm("yeni")}>+ Tebligat ekle</Dugme>}
      </div>
      <p className="mb-4 text-sm text-white/55">
        Bu dosyaya gelen ve dosyadan giden tebligatlar, tebliğ tarihleri ve süreleri buradan takip edilir. PTT barkodu ile gönderi sorgulanabilir.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (hizliBarkod.trim()) setPtt({ barkod: hizliBarkod.replace(/\s+/g, ""), tebligat: null }); }}
        className="alan-hucre mb-4 flex flex-wrap items-center gap-2"
      >
        <span className="text-sm font-medium text-white/80">PTT gönderi takip</span>
        <input
          value={hizliBarkod}
          onChange={(e) => setHizliBarkod(e.target.value)}
          placeholder="Barkod numarasını girin"
          className="alan-bmw min-w-0 flex-1"
        />
        <button type="submit" disabled={!hizliBarkod.trim()} className="rounded-lg bg-[#ffd60a]/90 px-4 py-1.5 text-sm font-semibold text-black hover:bg-[#ffd60a] disabled:opacity-40">
          Sorgula
        </button>
      </form>

      {form === "yeni" && <Form dosyaId={dosyaId} kayit={null} karsiTaraflar={karsiTaraflar} kapat={() => setForm(null)} pttAc={setPtt} />}
      {tebligatlar.length === 0 && form !== "yeni" && <p className="text-sm text-white/55">Henüz tebligat kaydı yok.</p>}
      <ul className="flex flex-col gap-2">
        {tebligatlar.map((t) => {
          if (form === t.id) return <li key={t.id}><Form dosyaId={dosyaId} kayit={t} karsiTaraflar={karsiTaraflar} kapat={() => setForm(null)} pttAc={setPtt} /></li>;
          const d = DURUM[t.durum] ?? DURUM.BEKLIYOR;
          const kalan = t.sonTarih && t.durum !== "GECERSIZ" ? kalanGun(t.sonTarih) : null;
          return (
            <li key={t.id} className="alan-hucre flex flex-wrap items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-white">
                  <span className="mr-2 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">{t.yon === "GIDEN" ? "Giden" : "Gelen"}</span>
                  {t.baslik}
                </p>
                <p className="mt-0.5 text-xs text-white/55">
                  {[t.muhatap, t.yol ? YOL_ADI[t.yol] : null, t.tebligTarihi ? `Tebliğ: ${goster(t.tebligTarihi)}` : t.gonderimTarihi ? `Gönderim: ${goster(t.gonderimTarihi)}` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                {t.barkod && (
                  <p className="mt-0.5 text-xs text-white/70">
                    Barkod: <span className="font-mono">{t.barkod}</span>{" "}
                    <button type="button" onClick={() => setPtt({ barkod: t.barkod!, tebligat: t })} className="ml-1 text-[#ffd60a] hover:underline">PTT&apos;de sorgula</button>
                  </p>
                )}
                {t.sonTarih && (
                  <p className={`mt-0.5 text-xs font-medium ${kalan !== null && kalan < 0 ? "text-[#ff7a70]" : kalan !== null && kalan <= 3 ? "text-[#ffd60a]" : "text-white/75"}`}>
                    Son tarih: {goster(t.sonTarih)}
                    {t.sureGun !== null ? ` (${t.sureGun} gün)` : ""}
                    {kalan !== null && ` · ${kalan < 0 ? `${-kalan} gün geçti` : kalan === 0 ? "bugün son gün" : `${kalan} gün kaldı`}`}
                  </p>
                )}
                {t.not && <p className="mt-1 whitespace-pre-wrap text-xs text-white/60">{t.not}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${d.sinif}`}>{d.ad}</span>
                <button type="button" onClick={() => setForm(t.id)} className="text-xs text-white/60 hover:text-white">Düzenle</button>
                <button
                  type="button"
                  onClick={() => { if (confirm("Bu tebligat kaydı silinsin mi?")) baslat(async () => { await tebligatSil(dosyaId, t.id); }); }}
                  className="text-xs text-[#ff7a70]/80 hover:text-[#ff7a70]"
                >
                  Sil
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {ptt && <PttSorguPaneli key={`${ptt.tebligat?.id ?? "hizli"}-${ptt.barkod}`} dosyaId={dosyaId} hedef={ptt} kapat={() => setPtt(null)} />}
    </div>
  );
}
