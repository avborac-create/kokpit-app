import Link from "next/link";
import { notFound } from "next/navigation";
import { masrafDokumu, odemeTalebiVarsayilanlari } from "@/modules/dava-dosyasi/lib/odeme-talebi";
import { OdemeTalebiFormu } from "@/modules/dava-dosyasi/components/ekonomi/odeme-talebi-formu";

export default async function OdemeTalebiSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [varsayilan, dokum] = await Promise.all([odemeTalebiVarsayilanlari(id), masrafDokumu(id)]);
  if (!varsayilan.musteriAdi) notFound();

  // Muvekkilin bizde bekleyen parasi varsa, toplamdan dusulecek eksi tutarli bir satir olarak onerilir.
  const satirlar = [...varsayilan.satirlar];
  if (varsayilan.bekleyenPara > 0) {
    satirlar.push({
      baslik: "Hesabınızda bekleyen ödemeniz",
      aciklama: "Büroya daha önce ulaşan, henüz bir kaleme mahsup edilmemiş tutar (düşülür)",
      tutar: -varsayilan.bekleyenPara,
    });
  }

  return (
    <div className="pt-3">
      <Link
        href={`/kokpit/finans/musteri-iliskileri/${id}/cari-hesap`}
        className="text-sm text-[#6db8ff] hover:underline"
      >
        ‹ {varsayilan.musteriAdi} — Müvekkil Ekonomisi
      </Link>
      <h1 className="mb-1 mt-1 text-2xl font-semibold tracking-tight text-white">Müvekkil Hesap Özeti</h1>
      <p className="mb-6 text-sm text-white/45">
        Müvekkile gönderilecek, ne için ne kadar ödenmesi gerektiğini sade bir dille anlatan A4 belge.
      </p>
      <OdemeTalebiFormu
        musteriId={id}
        musteriAdi={varsayilan.musteriAdi}
        baslangicSatirlari={satirlar}
        dokumSayisi={dokum.length}
        dokumToplami={Math.round(dokum.reduce((t, m) => t + m.tutar, 0) * 100) / 100}
      />
    </div>
  );
}
