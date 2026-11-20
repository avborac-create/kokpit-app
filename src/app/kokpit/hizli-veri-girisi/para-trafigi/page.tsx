import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { ekonomiDuzenleyebilirMi } from "@/core/auth/finans-yetki";
import { dosyaSecenekleriGetir } from "@/modules/avukat/lib/dosya-secenekleri";
import { dosyaEtiketiYaz } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { duzeltmeOnaylayabilirMi } from "../duzeltme-onay";
import { DekontEkleDugmesi, DuzeltmeKarari, DuzeltmeTalebiDugmesi, KayitDuzenleDugmesi, KayitSilDugmesi, TeyitEylemleri, YeniOdemeFormu } from "./formlar";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const gun = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

const DURUMLAR: Record<string, { ad: string; sinif: string }> = {
  TEYIT_BEKLIYOR: { ad: "Muhasebe teyidi bekliyor", sinif: "bg-[#f2b04c]/20 text-[#f2b04c]" },
  TEYIT_EDILDI: { ad: "Teyit edildi", sinif: "bg-[#32d74b]/20 text-[#5fd97a]" },
  TEYIT_EDILEMEDI: { ad: "Teyit edilemedi", sinif: "bg-[#ff7a70]/20 text-[#ff9b92]" },
};

export default async function ParaTrafigiKaydetSayfasi({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const k = await mevcutKullanici();
  if (!k) redirect("/kokpit");
  const { g } = await searchParams;
  const sekme = g === "hepsi" ? "hepsi" : "acik";

  const [kayitlar, dosyaSecenekleri, yetkili] = await Promise.all([
    prisma.gelenOdemeKaydi.findMany({ orderBy: [{ olusturmaTarihi: "desc" }], take: 300 }),
    dosyaSecenekleriGetir(),
    ekonomiDuzenleyebilirMi(),
  ]);
  const talepler = await prisma.gelenOdemeDuzeltmeTalebi.findMany({
    where: { kayitId: { in: kayitlar.map((x) => x.id) }, durum: "BEKLIYOR" },
  });
  const talepVar = new Map(talepler.map((t) => [t.kayitId, t]));
  const dosyaIdleri = [...new Set(kayitlar.map((x) => x.dosyaId).filter((v): v is string => !!v))];
  const [dosyalar, muvekkiller, kullanicilar] = await Promise.all([
    prisma.davaDosyasi.findMany({
      where: { id: { in: dosyaIdleri } },
      select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, anaDosya: { select: { kayitNo: true } } },
    }),
    prisma.dosyaMuvekkili.findMany({ where: { dosyaId: { in: dosyaIdleri } }, select: { dosyaId: true, musteri: { select: { id: true, adSoyadUnvan: true } } } }),
    prisma.kullanici.findMany({ select: { id: true, adSoyad: true, aktifMi: true } }),
  ]);
  const dosyaEtiketi = new Map(dosyalar.map((d) => [d.id, dosyaEtiketiYaz(d)]));
  const kisi = new Map(kullanicilar.map((u) => [u.id, u.adSoyad]));
  const kullaniciAktif = new Map(kullanicilar.map((u) => [u.id, u.aktifMi]));

  const bekleyenler = kayitlar.filter((x) => x.durum === "TEYIT_BEKLIYOR");
  const bekleyenToplam = bekleyenler.reduce((t, x) => t + Number(x.tutar), 0);
  const liste = sekme === "acik" ? kayitlar.filter((x) => x.durum !== "TEYIT_EDILDI" || talepVar.has(x.id)) : kayitlar;

  return (
    <div className="mx-auto max-w-4xl pt-3">
      <Link href="/kokpit/hizli-veri-girisi" className="text-xs text-white/50 hover:underline">
        ← Hızlı Veri Girişi
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Para Trafiği Kaydet</h1>
      <p className="mb-5 mt-1 text-sm text-white/55">
        Gelen ödemeyi dekontuyla girin. Muhasebe bankadan bakıp teyit edene kadar kayıt bakiyeye <b>katılmaz</b>; dosyada ve burada “teyit bekliyor” uyarısı olarak görünür.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Teyit bekleyen tutar</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[#f2b04c]">{para.format(bekleyenToplam)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Teyit bekleyen kayıt</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-white">{bekleyenler.length}</p>
        </div>
      </div>

      <YeniOdemeFormu dosyalar={dosyaSecenekleri} />

      <div className="mb-3 flex gap-2">
        {[
          { k: "acik", ad: "Açık olanlar" },
          { k: "hepsi", ad: "Tümü" },
        ].map((x) => (
          <Link key={x.k} href={`/kokpit/hizli-veri-girisi/para-trafigi?g=${x.k}`} className={`border px-3 py-1.5 text-sm ${sekme === x.k ? "border-[var(--accent)] bg-[var(--accent)]/25 text-white" : "border-white/15 text-white/60 hover:bg-white/10"}`}>
            {x.ad}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {liste.length === 0 && <p className="glass rounded-2xl p-4 text-sm text-white/45">Gösterilecek kayıt yok.</p>}
        {liste.map((x) => {
          const d = DURUMLAR[x.durum] ?? DURUMLAR.TEYIT_BEKLIYOR;
          const musteriler = x.dosyaId && !x.musteriId ? muvekkiller.filter((m) => m.dosyaId === x.dosyaId).map((m) => ({ id: m.musteri.id, ad: m.musteri.adSoyadUnvan })) : [];
          return (
            <div key={x.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white/60">
                    {gun.format(x.tarih)} · giren: {kisi.get(x.olusturanId ?? "") ?? "—"}
                  </p>
                  <p className="mt-0.5 font-medium text-white">{x.odeyenAdi || "Ödeyen belirtilmedi"}</p>
                  <p className="text-sm text-white/55">
                    {x.dosyaId ? (
                      <Link href={`/kokpit/dava-dosyalari/${x.dosyaId}`} className="text-[#6db8ff] hover:underline">
                        {dosyaEtiketi.get(x.dosyaId) ?? "Dosya"}
                      </Link>
                    ) : (
                      "Dosya belirsiz (teyitte Para Havuzu’na düşer)"
                    )}
                    {x.aciklama ? ` · ${x.aciklama}` : ""}
                  </p>
                  {!x.belgeUrl && x.durum !== "TEYIT_EDILDI" && <p className="mt-1 text-xs text-[#f2b04c]">Dekont bekleniyor</p>}
                  {!x.belgeUrl && (x.olusturanId === k.kullaniciId || yetkili) && x.durum !== "TEYIT_EDILDI" && <DekontEkleDugmesi id={x.id} />}
                  {x.belgeUrl && (
                    <a href={`/api/hizli-giris/dekont?id=${x.id}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#8fd8ff] hover:underline">
                      📎 Dekontu aç
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tabular-nums text-white">{para.format(Number(x.tutar))}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${d.sinif}`}>{d.ad}</span>
                </div>
              </div>
              {x.durum === "TEYIT_EDILEMEDI" && x.teyitNotu && <p className="mt-2 text-xs text-[#ff9b92]">Neden: {x.teyitNotu}</p>}
              {x.durum === "TEYIT_EDILDI" && (
                <p className="mt-2 text-xs text-white/45">
                  {kisi.get(x.teyitEdenId ?? "") ?? "Muhasebe"} teyit etti{x.teyitZamani ? ` · ${gun.format(x.teyitZamani)}` : ""} · {x.dosyaId ? "dosyanın Para Trafiği hesabına işlendi" : "Para Havuzu’na alındı"}
                </p>
              )}
              {x.durum === "TEYIT_EDILDI" &&
                (() => {
                  const t = talepVar.get(x.id);
                  if (t) {
                    const satirlar: { ad: string; eski: string; yeni: string }[] = [];
                    if (Number(t.eskiTutar) !== Number(t.yeniTutar)) satirlar.push({ ad: "Tutar", eski: para.format(Number(t.eskiTutar)), yeni: para.format(Number(t.yeniTutar)) });
                    if (t.eskiTarih.getTime() !== t.yeniTarih.getTime()) satirlar.push({ ad: "Tarih", eski: gun.format(t.eskiTarih), yeni: gun.format(t.yeniTarih) });
                    if ((t.eskiOdeyenAdi ?? "") !== (t.yeniOdeyenAdi ?? "")) satirlar.push({ ad: "Ödeyen", eski: t.eskiOdeyenAdi || "—", yeni: t.yeniOdeyenAdi || "—" });
                    if ((t.eskiAciklama ?? "") !== (t.yeniAciklama ?? "")) satirlar.push({ ad: "Not", eski: t.eskiAciklama || "—", yeni: t.yeniAciklama || "—" });
                    return (
                      <DuzeltmeKarari
                        talepId={t.id}
                        onaylayabilir={duzeltmeOnaylayabilirMi({ kullaniciId: k.kullaniciId, yetkili, talepEdenId: t.talepEdenId, teyitEdenId: x.teyitEdenId, teyitEdenAktif: kullaniciAktif.get(x.teyitEdenId ?? "") ?? false })}
                        ozet={{ talepEden: kisi.get(t.talepEdenId ?? "") ?? "—", gerekce: t.gerekce ?? "—", satirlar }}
                      />
                    );
                  }
                  if (x.olusturanId === k.kullaniciId || yetkili) {
                    return (
                      <div className="mt-2">
                        <DuzeltmeTalebiDugmesi id={x.id} tutar={Number(x.tutar)} tarih={x.tarih.toISOString().slice(0, 10)} odeyenAdi={x.odeyenAdi ?? ""} aciklama={x.aciklama ?? ""} />
                      </div>
                    );
                  }
                  return null;
                })()}
              {x.durum !== "TEYIT_EDILDI" && (
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <TeyitEylemleri id={x.id} yetkili={yetkili && x.durum === "TEYIT_BEKLIYOR"} kendiKaydi={x.olusturanId === k.kullaniciId} musteriSecimi={musteriler} />
                  {(x.olusturanId === k.kullaniciId || yetkili) && (
                    <div className="flex items-center gap-4">
                      <KayitDuzenleDugmesi
                        id={x.id}
                        tutar={Number(x.tutar)}
                        tarih={x.tarih.toISOString().slice(0, 10)}
                        odeyenAdi={x.odeyenAdi ?? ""}
                        aciklama={x.aciklama ?? ""}
                        dosyaId={x.dosyaId ?? ""}
                        dosyalar={dosyaSecenekleri}
                      />
                      <KayitSilDugmesi id={x.id} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
