import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { IsDetayi } from "./is-detayi";

export default async function IsSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = await mevcutKullanici();
  const [is, kisiler] = await Promise.all([
    prisma.is.findUnique({ where: { id }, include: { yardimlar: true, maddeler: { orderBy: { sira: "asc" } }, yorumlar: { orderBy: { tarih: "asc" }, include: { ekler: true } } } }),
    prisma.kullanici.findMany({ where: { aktifMi: true }, select: { id: true, adSoyad: true }, orderBy: { adSoyad: "asc" } }),
  ]);
  if (!is) notFound();
  const ad = new Map(kisiler.map((x) => [x.id, x.adSoyad]));
  const tarihSaat = (d: Date) => d.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

  return (
    <div className="mx-auto max-w-3xl pt-3">
      <Link href="/kokpit/isler" className="text-sm text-white/55 hover:text-white">
        ← İşler
      </Link>
      <IsDetayi
        benimId={k?.kullaniciId ?? ""}
        kisiler={kisiler}
        is={{
          id: is.id,
          baslik: is.baslik,
          aciklama: is.aciklama,
          durum: is.durum,
          sorumluId: is.sorumluId ?? "",
          olusturan: is.olusturanId ? (ad.get(is.olusturanId) ?? "—") : "—",
          yardimlar: is.yardimlar.map((y) => ({ id: y.id, ad: ad.get(y.yardimciId) ?? "—", isteyen: ad.get(y.isteyenId) ?? "—", yardimciId: y.yardimciId })),
          maddeler: is.maddeler.map((m) => ({ id: m.id, metin: m.metin, tamam: m.tamam })),
          yorumlar: is.yorumlar.map((y) => ({ id: y.id, yazan: y.yazanId ? (ad.get(y.yazanId) ?? "—") : "—", benim: y.yazanId === k?.kullaniciId, metin: y.metin, zaman: tarihSaat(y.tarih), ekler: y.ekler.map((e) => ({ id: e.id, ad: e.ad, tur: e.tur })) })),
        }}
      />
    </div>
  );
}
