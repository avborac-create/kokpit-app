import { davaDosyasiOlustur } from "@/modules/dava-dosyasi/lib/actions";
import { prisma } from "@/core/db/prisma";
import { kokpitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { DavaDosyasiFormu } from "@/modules/dava-dosyasi/components/dava-dosyasi-formu";

export default async function YeniDavaDosyasiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ musteriId?: string; bagliDosyaId?: string }>;
}) {
  const { musteriId, bagliDosyaId } = await searchParams;

  // Bağlı dosya: bağlanılacak dosyanın müvekkil ve karşı tarafı önceden gelir.
  const ana = bagliDosyaId
    ? await prisma.davaDosyasi.findUnique({
        where: { id: bagliDosyaId },
        select: {
          id: true,
          kayitNo: true,
          anaDosyaId: true,
          _count: { select: { altDosyalar: true } },
          konu: true,
          muvekkiller: { select: { musteriId: true } },
          karsiTaraflar: { select: { karsiTarafId: true, karsiTaraf: { select: { ad: true, tanimlayiciKod: true, detsisNo: true } } } },
        },
      })
    : null;
  const anaDosyaOn = ana
    ? {
          // Yeni dosya, bağlanılan dosyanın ALTI olabilir (o dosya başka bir dosyanın altında değilse);
          // ÜSTÜ (ana) olabilir (o dosyanın ne üstü ne de alt dosyası varsa); "yalnız bağlı" her zaman olur.
          altOlabilir: !ana.anaDosyaId,
          ustOlabilir: !ana.anaDosyaId && ana._count.altDosyalar === 0,
          id: ana.id,
          etiket: `${kokpitNoGoster({ kayitNo: ana.kayitNo })}${ana.konu ? ` · ${ana.konu}` : ""}`,
          musteriIdleri: ana.muvekkiller.map((m) => m.musteriId),
          karsiTaraflar: ana.karsiTaraflar.map((k) => ({ id: k.karsiTarafId, ad: k.karsiTaraf.ad, tc: k.karsiTaraf.tanimlayiciKod, detsis: k.karsiTaraf.detsisNo })),
        }
    : undefined;

  return (
    <div className="pt-3">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">Yeni Dosya</h1>
      <DavaDosyasiFormu
        action={davaDosyasiOlustur}
        gonderButonuMetni="Oluştur"
        onSecilenMusteriId={musteriId}
        anaDosyaOn={anaDosyaOn}
      />
    </div>
  );
}
