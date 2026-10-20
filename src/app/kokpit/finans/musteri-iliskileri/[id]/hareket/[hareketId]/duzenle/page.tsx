import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { hareketGuncelle } from "@/modules/dava-dosyasi/lib/cari-sistem-actions";
import { HareketDuzenlemeFormu } from "@/modules/dava-dosyasi/components/ekonomi/formlar";

export default async function HareketDuzenlemeSayfasi({
  params,
}: {
  params: Promise<{ id: string; hareketId: string }>;
}) {
  const { id, hareketId } = await params;
  const hareket = await prisma.cariHareketi.findUnique({
    where: { id: hareketId },
    include: { hesap: true, dosya: { select: { dosyaNo: true, konu: true } } },
  });
  if (!hareket || hareket.musteriId !== id || hareket.virmanId) notFound();
  // Para Trafigi odemelerinde odeme sekli de degistirilebilir.
  const yontemler = hareket.hesap.paraHesabiMi
    ? (await prisma.secenekDegeri.findMany({
        where: { liste: { anahtar: "odeme_yontemi" }, aktifMi: true },
        orderBy: { siraNo: "asc" },
        select: { id: true, etiket: true },
      }))
    : undefined;

  return (
    <div className="pt-3">
      <div className="mb-6">
        <Link
          href={`/kokpit/finans/musteri-iliskileri/${id}/cari-hesap?sayfa=${hareket.dosyaId ?? "genel"}&alt=${hareket.hesap.no}`}
          className="text-sm text-[#6db8ff] hover:underline"
        >
          ‹ {hareket.hesap.no} {hareket.hesap.ad}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Kaydı Düzenle</h1>
        <p className="mt-1 text-sm text-white/45">
          {hareket.dosya ? `Dosya: ${hareket.dosya.dosyaNo ?? hareket.dosya.konu} · ` : "Dosyasız (müvekkil havuzu) · "}
          Tarih, tutar ve açıklama düzeltilebilir. Para Trafiği, virmanla kullanılmış tutarın altına indirilemez.
        </p>
      </div>
      <HareketDuzenlemeFormu
        action={hareketGuncelle.bind(null, hareketId)}
        veri={{
          tarih: hareket.tarih.toISOString().slice(0, 10),
          tutar: Number(hareket.tutar),
          aciklama: hareket.aciklama ?? "",
          yontemId: hareket.odemeYontemiId ?? undefined,
        }}
        yontemler={yontemler}
      />
    </div>
  );
}
