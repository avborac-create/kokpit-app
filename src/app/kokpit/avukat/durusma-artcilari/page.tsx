import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { kayitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { kullaniciSecenekleriGetir } from "@/modules/avukat/lib/dosya-secenekleri";
import {
  durusmaMasrafiEkle,
  durusmaMasrafiSil,
  durusmaSonucuKaydet,
  muvekkileBilgiVerildi,
  siradakiIsEkle,
} from "@/modules/avukat/lib/durusma-artci-actions";
import { KopyalaButonu } from "./kopyala-butonu";

const tarihSaat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
const tarihKisa = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });
const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const bugunYmd = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(new Date());

const KALEMLER = ["Yol", "Vestiyer", "Yol + vestiyer", "Otopark", "Köprü / otoyol", "Yemek", "Harç / gider pulu", "Diğer"];

function bilgiMetni(d: { durusmaTarihi: Date; birimAdi: string | null; dosyaNo: string | null }, a: { sonuc: string; yeniDurusmaTarihi: Date | null; akibet: string | null; notlar: string | null; yasalSureSonu: Date | null }) {
  const baslik = `Sayın Müvekkilimiz, ${tarihKisa.format(d.durusmaTarihi)} tarihli duruşma hakkında bilgi vermek isteriz.`;
  const dosya = `Dosya: ${[d.birimAdi, d.dosyaNo].filter(Boolean).join(" ")}`;
  const sonuc =
    a.sonuc === "ILERI_TARIH"
      ? `Duruşma ileri tarihe bırakılmıştır. Yeni duruşma günü: ${a.yeniDurusmaTarihi ? tarihSaat.format(a.yeniDurusmaTarihi) : "—"}.`
      : `Dosyada karar verilmiştir. Karar: ${a.akibet ?? "—"}. Gerekçeli kararın yazılmasını takip ediyoruz; yazıldığında ayrıca bilgi vereceğiz.`;
  return [baslik, dosya, sonuc, a.notlar ? `Not: ${a.notlar}` : null].filter(Boolean).join("\n");
}

export default async function DurusmaArtcilariSayfasi({ searchParams }: { searchParams: Promise<{ avukat?: string }> }) {
  if (!(await modulErisimiVarMi("avukat"))) redirect("/kokpit");
  const kullanici = await mevcutKullanici();
  const { avukat: avukatSuzgeci } = await searchParams;
  const simdi = new Date();
  const baslangic = new Date(simdi);
  baslangic.setDate(baslangic.getDate() - 30);
  const [dosyalar, kullanicilar, acikIsler] = await Promise.all([
    prisma.davaDosyasi.findMany({
      where: {
        durusmaTarihi: { gte: baslangic },
        ...(avukatSuzgeci === "ben" && kullanici ? { sorumluAvukatId: kullanici.kullaniciId } : avukatSuzgeci ? { sorumluAvukatId: avukatSuzgeci } : {}),
      },
      orderBy: { durusmaTarihi: "asc" },
      select: {
        sorumluAvukatId: true,
        id: true, kayitNo: true, dosyaNo: true, birimAdi: true, konu: true, durusmaTarihi: true,
        yargiKolu: { select: { etiket: true } },
      },
    }),
    kullaniciSecenekleriGetir(),
    prisma.is.findMany({ where: { kaynak: { startsWith: "durusma:" } }, select: { id: true, baslik: true, durum: true, kaynak: true, vade: true } }),
  ]);
  const dosyaIdleri = dosyalar.map((d) => d.id);
  const [artcilar, masraflar] = await Promise.all([
    prisma.durusmaArtcisi.findMany({ where: { davaDosyasiId: { in: dosyaIdleri } } }),
    prisma.durusmaMasrafi.findMany({ where: { davaDosyasiId: { in: dosyaIdleri } }, orderBy: { olusturmaTarihi: "asc" } }),
  ]);

  return (
    <div className="pt-3">
      <Link href="/kokpit/avukat" className="text-sm text-white/50 hover:text-white">← Avukat</Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold tracking-tight text-white">Duruşma Artçıları</h1>
      <p className="mb-4 text-sm text-white/55">Duruşmadan çıkınca sırayla: masraf → sonuç → gerekçeli karar takibi → müvekkile bilgi. Hepsi bu kartta.</p>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Link href="/kokpit/avukat/durusma-artcilari" className={`rounded-full px-3 py-1 ${!avukatSuzgeci ? "bg-white/20 text-white" : "bg-white/[0.06] text-white/60 hover:text-white"}`}>Hepsi</Link>
        <Link href="?avukat=ben" className={`rounded-full px-3 py-1 ${avukatSuzgeci === "ben" ? "bg-white/20 text-white" : "bg-white/[0.06] text-white/60 hover:text-white"}`}>Benim dosyalarım</Link>
        {kullanicilar.map((k) => (
          <Link key={k.id} href={`?avukat=${k.id}`} className={`rounded-full px-3 py-1 ${avukatSuzgeci === k.id ? "bg-white/20 text-white" : "bg-white/[0.06] text-white/60 hover:text-white"}`}>{k.adSoyad.split(" ")[0]}</Link>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {dosyalar.map((d) => {
          const durusma = d.durusmaTarihi!;
          const ms = durusma.getTime();
          const gecti = durusma < simdi;
          const artci = artcilar.find((a) => a.davaDosyasiId === d.id && a.durusmaTarihi.getTime() === ms);
          const dMasraflar = masraflar.filter((m) => m.davaDosyasiId === d.id && m.durusmaTarihi?.getTime() === ms);
          const toplam = dMasraflar.reduce((t, m) => t + Number(m.tutar), 0);
          const isler = acikIsler.filter((i) => i.kaynak === `durusma:${d.id}`);
          const cezaMi = /ceza/i.test(d.yargiKolu?.etiket ?? "");
          return (
            <div key={d.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${gecti ? "bg-white/[0.08] text-white/60" : "bg-[#e5373d]/20 text-[#ff7a70]"}`}>{gecti ? "Geçti" : "Yaklaşıyor"}</span>
                {artci && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">Sonuç işlendi</span>}
                <span className="text-sm font-medium text-white">{tarihSaat.format(durusma)}</span>
                <Link href={`/kokpit/dava-dosyalari/${d.id}`} className="text-sm text-[#6db8ff] hover:underline">{kayitNoGoster(d.kayitNo)} · {d.dosyaNo ?? "Esas no yok"}</Link>
              </div>
              <p className="mt-1 text-sm text-white/60">{[d.birimAdi, d.konu].filter(Boolean).join(" — ")}</p>

              {isler.length > 0 && (
                <ul className="mt-2 text-xs text-white/55">
                  {isler.map((i) => (
                    <li key={i.id}>
                      <Link href={`/kokpit/isler/${i.id}`} className="hover:text-white">• {i.baslik} ({i.durum === "TAMAMLANDI" ? "tamamlandı" : "açık"}{i.vade ? ` · ${tarihKisa.format(i.vade)}` : ""})</Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* 1. MASRAF */}
              <details className="mt-3" open={gecti && !artci}>
                <summary className="cursor-pointer text-sm font-medium text-white/80 hover:text-white">1. Masraf girişi {dMasraflar.length > 0 && <span className="text-white/50">· {para.format(toplam)}</span>}</summary>
                {dMasraflar.length > 0 && (
                  <ul className="mt-2 divide-y divide-white/10 text-sm">
                    {dMasraflar.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 py-1.5 text-white/75">
                        <span className="flex-1">{m.kalem}{m.aciklama ? ` — ${m.aciklama}` : ""} <span className="text-xs text-white/40">({m.odeyen === "AVUKAT" ? "cebimden" : m.odeyen === "BURO" ? "büro" : "müvekkil"}{m.belgeVar ? ", belgeli" : ", belgesiz"})</span></span>
                        <span>{para.format(Number(m.tutar))}</span>
                        {m.personelId === kullanici?.kullaniciId && (
                          <form action={durusmaMasrafiSil.bind(null, m.id)}><button className="text-xs text-white/40 hover:text-red-300" aria-label="Sil">Sil</button></form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <form action={durusmaMasrafiEkle.bind(null, d.id, ms)} className="mt-3 grid grid-cols-1 gap-x-3 sm:grid-cols-4">
                  <Alan>
                    <Etiket>Kalem</Etiket>
                    <Girdi name="kalem" list="durusma-kalemleri" required placeholder="Yol + vestiyer" />
                  </Alan>
                  <Alan><Etiket>Tutar (₺)</Etiket><Girdi name="tutar" inputMode="decimal" required placeholder="300" /></Alan>
                  <Alan><Etiket>Tarih</Etiket><Girdi name="tarih" type="date" defaultValue={bugunYmd()} /></Alan>
                  <Alan>
                    <Etiket>Kim ödedi</Etiket>
                    <Secim name="odeyen" defaultValue="AVUKAT">
                      <option value="AVUKAT">Cebimden (avans)</option>
                      <option value="BURO">Büro</option>
                      <option value="MUVEKKIL">Müvekkil</option>
                    </Secim>
                  </Alan>
                  <Alan>
                    <Etiket>Duruşmaya giren</Etiket>
                    <Secim name="personelId" defaultValue={d.sorumluAvukatId ?? kullanici?.kullaniciId ?? ""}>
                      {kullanicilar.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
                    </Secim>
                  </Alan>
                  <label className="mb-4 flex items-center gap-2 text-sm text-white/70 sm:col-span-4"><input type="checkbox" name="belgeVar" /> Belge/makbuz var</label>
                  <div className="sm:col-span-4"><GonderButonu>Masrafı ekle</GonderButonu></div>
                </form>
              </details>

              {/* 2. SONUÇ + 3. GEREKÇELİ KARAR */}
              <details className="mt-2" open={gecti && !artci}>
                <summary className="cursor-pointer text-sm font-medium text-white/80 hover:text-white">2. Sonuç ve gerekçeli karar takibi</summary>
                {artci ? (
                  <p className="mt-2 text-sm text-white/70">
                    {artci.sonuc === "ILERI_TARIH"
                      ? `İleri tarihe bırakıldı → yeni duruşma: ${artci.yeniDurusmaTarihi ? tarihSaat.format(artci.yeniDurusmaTarihi) : "—"} (dosya ve takvim güncellendi).`
                      : `Karara çıktı: ${artci.akibet}. Yasal süre sonu: ${artci.yasalSureSonu ? tarihKisa.format(artci.yasalSureSonu) : "—"}${artci.takipPeriyotGun ? ` · sıkı takip: ${artci.takipPeriyotGun === 1 ? "her gün" : artci.takipPeriyotGun === 2 ? "2 günde 1" : "haftada 1"}` : ""}.`}
                  </p>
                ) : (
                  <form action={durusmaSonucuKaydet.bind(null, d.id, ms)} className="mt-3 grid grid-cols-1 gap-x-3 sm:grid-cols-3">
                    <Alan>
                      <Etiket>Sonuç</Etiket>
                      <Secim name="sonuc" required defaultValue="">
                        <option value="" disabled>Seçiniz…</option>
                        <option value="ILERI_TARIH">İleri tarihe bırakıldı</option>
                        <option value="KARARA_CIKTI">Karara çıktı</option>
                      </Secim>
                    </Alan>
                    <Alan><Etiket>Yeni duruşma (ileri tarihse)</Etiket><Girdi name="yeniDurusmaTarihi" type="datetime-local" /></Alan>
                    <Alan><Etiket>Karar akıbeti (karara çıktıysa)</Etiket><Girdi name="akibet" placeholder="Örn. mahkûmiyet / ret / kabul" /></Alan>
                    <Alan>
                      <Etiket>Dava türü (süre)</Etiket>
                      <Secim name="yargiKolu" defaultValue={cezaMi ? "CEZA" : "HUKUK"}>
                        <option value="CEZA">Ceza — yasal süre 15 gün</option>
                        <option value="HUKUK">Hukuk — yasal süre 1 ay</option>
                      </Secim>
                    </Alan>
                    <Alan><Etiket>İlk kontrol (karardan kaç gün sonra)</Etiket><Girdi name="ilkKontrolGun" type="number" min={0} max={30} defaultValue={3} /></Alan>
                    <Alan>
                      <Etiket>Sıkı takip</Etiket>
                      <Secim name="sikiPeriyot" defaultValue="">
                        <option value="">Yok (standart)</option>
                        <option value="1">Her gün</option>
                        <option value="2">2 günde 1</option>
                        <option value="7">Haftada 1</option>
                      </Secim>
                    </Alan>
                    <Alan>
                      <Etiket>Takip sorumlusu</Etiket>
                      <Secim name="sorumluId" defaultValue={d.sorumluAvukatId ?? kullanici?.kullaniciId ?? ""}>
                        {kullanicilar.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
                      </Secim>
                    </Alan>
                    <div className="sm:col-span-2"><Alan><Etiket>Not</Etiket><MetinAlani name="notlar" rows={2} /></Alan></div>
                    <div className="sm:col-span-3"><GonderButonu>Sonucu işle</GonderButonu></div>
                  </form>
                )}
              </details>

              {/* 4. MÜVEKKİLE BİLGİ */}
              {artci && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-white/80 hover:text-white">
                    4. Müvekkile bilgi {artci.muvekkileBilgiTarihi && <span className="text-emerald-300">· verildi ({tarihKisa.format(artci.muvekkileBilgiTarihi)})</span>}
                  </summary>
                  <div className="mt-2">
                    <pre className="whitespace-pre-wrap rounded-xl bg-white/[0.06] p-3 text-sm text-white/80">{bilgiMetni({ durusmaTarihi: durusma, birimAdi: d.birimAdi, dosyaNo: d.dosyaNo }, artci)}</pre>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <KopyalaButonu metin={bilgiMetni({ durusmaTarihi: durusma, birimAdi: d.birimAdi, dosyaNo: d.dosyaNo }, artci)} />
                      {!artci.muvekkileBilgiTarihi && (
                        <form action={muvekkileBilgiVerildi.bind(null, artci.id)}><button className="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-sm text-white hover:bg-emerald-600">Bilgi verildi olarak işle</button></form>
                      )}
                    </div>
                  </div>
                </details>
              )}

              {/* SIRADAKİ İŞ */}
              {artci && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-white/80 hover:text-white">+ Sıradaki iş ekle</summary>
                  <form action={siradakiIsEkle.bind(null, d.id)} className="mt-3 grid grid-cols-1 gap-x-3 sm:grid-cols-3">
                    <Alan><Etiket>İş</Etiket><Girdi name="baslik" required placeholder="Örn. istinaf var mı kontrol et" /></Alan>
                    <Alan>
                      <Etiket>Sorumlu</Etiket>
                      <Secim name="sorumluId" defaultValue={kullanici?.kullaniciId ?? ""}>
                        {kullanicilar.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
                      </Secim>
                    </Alan>
                    <Alan><Etiket>Son tarih</Etiket><Girdi name="vade" type="date" /></Alan>
                    <div className="sm:col-span-3"><GonderButonu>Görevi ekle</GonderButonu></div>
                  </form>
                </details>
              )}
            </div>
          );
        })}
        {dosyalar.length === 0 && <p className="glass rounded-2xl p-6 text-center text-white/40">Yaklaşan veya yeni geçmiş duruşma kaydı yok.</p>}
      </div>
      <datalist id="durusma-kalemleri">{KALEMLER.map((k) => <option key={k} value={k} />)}</datalist>
    </div>
  );
}
