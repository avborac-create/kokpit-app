import Link from "next/link";
import { prisma } from "@/core/db/prisma";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// Dosya kartinda (tum sekmelerde): bu dosyaya girilmis ama muhasebe teyidi bekleyen ya da teyit
// edilemeyen odemeler. Bakiyeye katilmadiklarini acikca soyler.
export async function TeyitBekleyenOdemeUyarisi({ dosyaId }: { dosyaId: string }) {
  const kayitlar = await prisma.gelenOdemeKaydi.findMany({
    where: { dosyaId, durum: { in: ["TEYIT_BEKLIYOR", "TEYIT_EDILEMEDI"] } },
    orderBy: { olusturmaTarihi: "desc" },
    select: { id: true, tutar: true, durum: true, odeyenAdi: true, teyitNotu: true },
  });
  if (kayitlar.length === 0) return null;
  const bekleyen = kayitlar.filter((x) => x.durum === "TEYIT_BEKLIYOR");
  const edilemeyen = kayitlar.filter((x) => x.durum === "TEYIT_EDILEMEDI");
  const toplam = bekleyen.reduce((t, x) => t + Number(x.tutar), 0);
  return (
    <div role="status" className="mb-3 rounded-xl border border-[#f2b04c]/50 bg-[#f2b04c]/10 px-4 py-2.5 text-sm text-[#f2b04c]">
      {bekleyen.length > 0 && (
        <p>
          ⚠️ Bu dosyada <b>teyit bekleyen {para.format(toplam)}</b> ödeme var ({bekleyen.length} kayıt). Muhasebe teyit edene kadar bakiyeye <b>katılmaz</b>.{" "}
          <Link href="/kokpit/hizli-veri-girisi/para-trafigi" className="underline">Kayıtları gör</Link>
        </p>
      )}
      {edilemeyen.length > 0 && (
        <p className="text-[#ff9b92]">
          ⛔ {edilemeyen.length} ödeme teyit edilemedi{edilemeyen[0].teyitNotu ? `: ${edilemeyen[0].teyitNotu}` : ""}.{" "}
          <Link href="/kokpit/hizli-veri-girisi/para-trafigi" className="underline">İncele</Link>
        </p>
      )}
    </div>
  );
}
