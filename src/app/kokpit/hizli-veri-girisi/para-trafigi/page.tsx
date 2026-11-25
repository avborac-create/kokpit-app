import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { ekonomiDuzenleyebilirMi } from "@/core/auth/finans-yetki";
import { dosyaSecenekleriGetir } from "@/modules/avukat/lib/dosya-secenekleri";
import { dosyaEtiketiYaz } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { duzeltmeOnaylayabilirMi } from "../duzeltme-onay";
import { silebilirMi } from "@/core/auth/yetki";
import { aktifHesaplar } from "@/core/hesap/hesaplar";
import {
  SatirSecimKutusu,
  TopluIslemCubugu,
  TopluSecimSaglayici,
} from "./toplu";
import {
  DekontEkleDugmesi,
  DuzeltmeKarari,
  DuzeltmeTalebiDugmesi,
  HesapDegistirDugmesi,
  TeyidiGeriCekDugmesi,
  KayitDuzenleDugmesi,
  KayitSilDugmesi,
  OtomatikYenile,
  TeyitEylemleri,
  YeniOdemeFormu,
} from "./formlar";

const para = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});
const gun = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DURUMLAR: Record<string, { ad: string; sinif: string }> = {
  TEYIT_BEKLIYOR: {
    ad: "Muhasebe teyidi bekliyor",
    sinif: "bg-[#f2b04c]/20 text-[#f2b04c]",
  },
  TEYIT_EDILDI: { ad: "Teyit edildi", sinif: "bg-[#32d74b]/20 text-[#5fd97a]" },
  TEYIT_EDILEMEDI: {
    ad: "Teyit edilemedi",
    sinif: "bg-[#ff7a70]/20 text-[#ff9b92]",
  },
};

export default async function ParaTrafigiKaydetSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>;
}) {
  const k = await mevcutKullanici();
  if (!k) redirect("/kokpit");
  const { g } = await searchParams;
  const sekme = g === "hepsi" ? "hepsi" : "acik";

  const hesaplar = await aktifHesaplar();
  const hesapAdlari = new Map(hesaplar.map((h) => [h.id, h.ad]));
  const [kayitlar, dosyaSecenekleri, yetkili] = await Promise.all([
    prisma.gelenOdemeKaydi.findMany({
      orderBy: [{ olusturmaTarihi: "desc" }],
      take: 300,
    }),
    dosyaSecenekleriGetir(),
    ekonomiDuzenleyebilirMi(),
  ]);
  const talepler = await prisma.gelenOdemeDuzeltmeTalebi.findMany({
    where: { kayitId: { in: kayitlar.map((x) => x.id) }, durum: "BEKLIYOR" },
  });
  const talepVar = new Map(talepler.map((t) => [t.kayitId, t]));
  const dosyaIdleri = [
    ...new Set(kayitlar.map((x) => x.dosyaId).filter((v): v is string => !!v)),
  ];
  const [dosyalar, muvekkiller, kullanicilar] = await Promise.all([
    prisma.davaDosyasi.findMany({
      where: { id: { in: dosyaIdleri } },
      select: {
        id: true,
        kayitNo: true,
        altSiraNo: true,
        buroNo: true,
        dosyaNo: true,
        birimAdi: true,
        konu: true,
        davaKonusu: true,
        anaDosya: { select: { kayitNo: true } },
        tur: { select: { etiket: true } },
        durum: { select: { etiket: true } },
        muvekkiller: {
          select: { musteri: { select: { adSoyadUnvan: true } } },
        },
        karsiTaraflar: { select: { karsiTaraf: { select: { ad: true } } } },
      },
    }),
    prisma.dosyaMuvekkili.findMany({
      where: { dosyaId: { in: dosyaIdleri } },
      select: {
        dosyaId: true,
        musteri: { select: { id: true, adSoyadUnvan: true } },
      },
    }),
    prisma.kullanici.findMany({
      select: { id: true, adSoyad: true, aktifMi: true },
    }),
  ]);
  const dosyaEtiketi = new Map(dosyalar.map((d) => [d.id, dosyaEtiketiYaz(d)]));
  const dosyaBilgi = new Map(dosyalar.map((d) => [d.id, d]));
  const secilebilirIdler = kayitlar
    .filter(
      (x) =>
        x.durum !== "TEYIT_EDILDI" &&
        (x.olusturanId === k.kullaniciId || yetkili),
    )
    .map((x) => x.id);
  const kisi = new Map(kullanicilar.map((u) => [u.id, u.adSoyad]));
  const kullaniciAktif = new Map(kullanicilar.map((u) => [u.id, u.aktifMi]));

  const bekleyenler = kayitlar.filter((x) => x.durum === "TEYIT_BEKLIYOR");
  const bekleyenToplam = bekleyenler.reduce((t, x) => t + Number(x.tutar), 0);
  const liste =
    sekme === "acik"
      ? kayitlar.filter((x) => x.durum !== "TEYIT_EDILDI" || talepVar.has(x.id))
      : kayitlar;

  return (
    <div className="mx-auto max-w-4xl pt-3">
      <Link
        href="/kokpit/hizli-veri-girisi"
        className="text-xs text-white/50 hover:underline"
      >
        ← Hızlı Veri Girişi
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Para Trafiği Kaydet
      </h1>
      <p className="mb-5 mt-1 text-sm text-white/55">
        Gelen ödemeyi dekontuyla girin. Muhasebe bankadan bakıp teyit edene
        kadar kayıt bakiyeye <b>katılmaz</b>; dosyada ve burada “teyit bekliyor”
        uyarısı olarak görünür.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Teyit bekleyen tutar
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[#f2b04c]">
            {para.format(bekleyenToplam)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Teyit bekleyen kayıt
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-white">
            {bekleyenler.length}
          </p>
        </div>
      </div>

      <OtomatikYenile />
      <YeniOdemeFormu dosyalar={dosyaSecenekleri} hesaplar={hesaplar} />

      <div className="mb-3 flex gap-2">
        {[
          { k: "acik", ad: "Açık olanlar" },
          { k: "hepsi", ad: "Tümü" },
        ].map((x) => (
          <Link
            key={x.k}
            href={`/kokpit/hizli-veri-girisi/para-trafigi?g=${x.k}`}
            className={`border px-3 py-1.5 text-sm ${sekme === x.k ? "border-[var(--accent)] bg-[var(--accent)]/25 text-white" : "border-white/15 text-white/60 hover:bg-white/10"}`}
          >
            {x.ad}
          </Link>
        ))}
      </div>

      <TopluSecimSaglayici>
        <TopluIslemCubugu
          secilebilirIdler={secilebilirIdler}
          yetkili={yetkili}
          dosyalar={dosyaSecenekleri}
        />
        <div className="flex flex-col gap-3">
          {liste.length === 0 && (
            <p className="glass rounded-2xl p-4 text-sm text-white/45">
              Gösterilecek kayıt yok.
            </p>
          )}
          {liste.map((x) => {
            const incelemede = x.durum === "TEYIT_BEKLIYOR" && !!x.incelemeyeAlanId;
            const d = incelemede
              ? { ad: `İnceleniyor · ${kisi.get(x.incelemeyeAlanId ?? "") ?? "Muhasebe"}`, sinif: "bg-[#6db8ff]/20 text-[#8fd8ff]" }
              : x.durum === "TEYIT_EDILDI" && x.tamamlanmaBicimi === "DOSYADA_KAYITLI"
                ? { ad: "Tamamlandı · dosyada zaten kayıtlı", sinif: "bg-[#b58cff]/20 text-[#cbb0ff]" }
                : (DURUMLAR[x.durum] ?? DURUMLAR.TEYIT_BEKLIYOR);
            const incelemeDurumu: "yok" | "ben" | "baskasi" = !incelemede ? "yok" : x.incelemeyeAlanId === k.kullaniciId ? "ben" : "baskasi";
            const musteriler =
              x.dosyaId && !x.musteriId
                ? muvekkiller
                    .filter((m) => m.dosyaId === x.dosyaId)
                    .map((m) => ({
                      id: m.musteri.id,
                      ad: m.musteri.adSoyadUnvan,
                    }))
                : [];
            return (
              <div key={x.id} className="glass rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {secilebilirIdler.includes(x.id) && (
                    <SatirSecimKutusu id={x.id} />
                  )}
                  <div className="min-w-0 flex-[1_1_16rem]">
                    <p className="text-sm text-white/60">
                      {gun.format(x.tarih)} · Oluşturan:{" "}
                      {kisi.get(x.olusturanId ?? "") ?? "—"}
                    </p>
                    <p className="mt-0.5 font-medium text-white">
                      <span className="font-normal text-white/70">Gönderen kişi: </span>
                      {x.odeyenAdi || "belirtilmedi"}
                    </p>
                    {(x.olusturanId === k.kullaniciId || yetkili) ? (
                      <HesapDegistirDugmesi id={x.id} hesapId={x.hesapId ?? ""} hesapAdi={hesapAdlari.get(x.hesapId ?? "") ?? ""} hesaplar={hesaplar} />
                    ) : (
                      <p className="mt-1 text-xs text-white/60">Hesap: <b>{hesapAdlari.get(x.hesapId ?? "") ?? "belirtilmedi"}</b></p>
                    )}
                    {x.dosyaId ? (
                      (() => {
                        const d = dosyaBilgi.get(x.dosyaId);
                        const bilgiler = d
                          ? (
                              [
                                ["Birim", d.birimAdi],
                                ["Esas no", d.dosyaNo],
                                ["Büro no", d.buroNo],
                                ["Tür", d.tur?.etiket],
                                ["Durum", d.durum?.etiket],
                                ["Konu", d.davaKonusu || d.konu],
                                [
                                  "Müvekkil",
                                  d.muvekkiller
                                    .map((m) => m.musteri.adSoyadUnvan)
                                    .join(", "),
                                ],
                                [
                                  "Karşı taraf",
                                  d.karsiTaraflar
                                    .map((c) => c.karsiTaraf.ad)
                                    .join(", "),
                                ],
                              ] as [string, string | null | undefined][]
                            ).filter(([, v]) => v)
                          : [];
                        return (
                          <div className="mt-1 min-w-0 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm">
                            <Link
                              href={`/kokpit/dava-dosyalari/${x.dosyaId}`}
                              className="font-medium text-[#6db8ff] hover:underline"
                            >
                              {dosyaEtiketi.get(x.dosyaId) ?? "Dosya"}
                            </Link>
                            {bilgiler.length > 0 && (
                              <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
                                {bilgiler.map(([ad, v]) => (
                                  <div key={ad} className="contents">
                                    <dt className="text-white/40">{ad}</dt>
                                    <dd className="break-words text-white/75">{v}</dd>
                                  </div>
                                ))}
                              </dl>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-sm text-white/55">
                        Dosya belirsiz (teyitte Para Havuzu’na düşer)
                      </p>
                    )}
                    {x.aciklama ? (
                      <p className="mt-1 text-sm text-white/70">
                        <span className="text-white/40">Geliş sebebi:</span>{" "}
                        {x.aciklama}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs font-medium text-[#ff9b92]">
                        Paranın geliş sebebi yazılmamış — “Düzelt” ile yazın
                        (yazılmadan teyit edilemez)
                      </p>
                    )}
                    {!x.belgeUrl && x.durum !== "TEYIT_EDILDI" && (
                      <p className="mt-1 text-xs text-[#f2b04c]">
                        Dekont bekleniyor
                      </p>
                    )}
                    {!x.belgeUrl &&
                      (x.olusturanId === k.kullaniciId || yetkili) &&
                      x.durum !== "TEYIT_EDILDI" && (
                        <DekontEkleDugmesi id={x.id} />
                      )}
                    {x.belgeUrl && (
                      <a
                        href={`/api/hizli-giris/dekont?id=${x.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-[#8fd8ff] hover:underline"
                      >
                        📎 Dekontu aç
                      </a>
                    )}
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-lg font-semibold tabular-nums text-white">
                      {para.format(Number(x.tutar))}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${d.sinif}`}
                    >
                      {d.ad}
                    </span>
                    {incelemede && x.incelemeZamani && (
                      <p className="mt-1 text-[11px] text-white/40">
                        {x.incelemeZamani.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} itibarıyla
                      </p>
                    )}
                  </div>
                </div>
                {x.durum === "TEYIT_EDILEMEDI" && x.teyitNotu && (
                  <p className="mt-2 text-xs text-[#ff9b92]">
                    Neden: {x.teyitNotu}
                  </p>
                )}
                {x.durum === "TEYIT_EDILDI" && (
                  <p className="mt-2 text-xs text-white/45">
                    {kisi.get(x.teyitEdenId ?? "") ?? "Muhasebe"}{" "}
                    {x.tamamlanmaBicimi === "DOSYADA_KAYITLI" ? "dosyada zaten kayıtlı olarak tamamladı" : "teyit etti"}
                    {x.teyitZamani ? ` · ${gun.format(x.teyitZamani)}` : ""} ·{" "}
                    {x.tamamlanmaBicimi === "DOSYADA_KAYITLI"
                      ? "dosyaya yeni cari hareket eklenmedi"
                      : x.dosyaId
                        ? "dosyanın Para Trafiği hesabına işlendi"
                        : "Para Havuzu’na alındı"}
                  </p>
                )}
                {x.durum === "TEYIT_EDILDI" && x.teyitNotu && (
                  <p className="mt-1 whitespace-pre-line text-xs text-[#ffcf6b]">{x.teyitNotu}</p>
                )}
                {x.durum === "TEYIT_EDILDI" && yetkili && <TeyidiGeriCekDugmesi id={x.id} />}
                {x.durum === "TEYIT_EDILDI" &&
                  (() => {
                    const t = talepVar.get(x.id);
                    if (t) {
                      const satirlar: {
                        ad: string;
                        eski: string;
                        yeni: string;
                      }[] = [];
                      if (Number(t.eskiTutar) !== Number(t.yeniTutar))
                        satirlar.push({
                          ad: "Tutar",
                          eski: para.format(Number(t.eskiTutar)),
                          yeni: para.format(Number(t.yeniTutar)),
                        });
                      if (t.eskiTarih.getTime() !== t.yeniTarih.getTime())
                        satirlar.push({
                          ad: "Tarih",
                          eski: gun.format(t.eskiTarih),
                          yeni: gun.format(t.yeniTarih),
                        });
                      if ((t.eskiOdeyenAdi ?? "") !== (t.yeniOdeyenAdi ?? ""))
                        satirlar.push({
                          ad: "Gönderen kişi",
                          eski: t.eskiOdeyenAdi || "—",
                          yeni: t.yeniOdeyenAdi || "—",
                        });
                      if ((t.eskiAciklama ?? "") !== (t.yeniAciklama ?? ""))
                        satirlar.push({
                          ad: "Not",
                          eski: t.eskiAciklama || "—",
                          yeni: t.yeniAciklama || "—",
                        });
                      return (
                        <DuzeltmeKarari
                          talepId={t.id}
                          onaylayabilir={duzeltmeOnaylayabilirMi({
                            kullaniciId: k.kullaniciId,
                            yetkili,
                            talepEdenId: t.talepEdenId,
                            teyitEdenId: x.teyitEdenId,
                            teyitEdenAktif:
                              kullaniciAktif.get(x.teyitEdenId ?? "") ?? false,
                          })}
                          ozet={{
                            talepEden: kisi.get(t.talepEdenId ?? "") ?? "—",
                            gerekce: t.gerekce ?? "—",
                            satirlar,
                          }}
                        />
                      );
                    }
                    if (x.olusturanId === k.kullaniciId || yetkili) {
                      return (
                        <div className="mt-2">
                          <DuzeltmeTalebiDugmesi
                            id={x.id}
                            tutar={Number(x.tutar)}
                            tarih={x.tarih.toISOString().slice(0, 10)}
                            odeyenAdi={x.odeyenAdi ?? ""}
                            aciklama={x.aciklama ?? ""}
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}
                {x.durum !== "TEYIT_EDILDI" && (
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <TeyitEylemleri
                      id={x.id}
                      yetkili={yetkili && x.durum === "TEYIT_BEKLIYOR"}
                      kendiKaydi={x.olusturanId === k.kullaniciId && !silebilirMi(k.rol)}
                      musteriSecimi={musteriler}
                      inceleme={incelemeDurumu}
                    />
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
      </TopluSecimSaglayici>
    </div>
  );
}
