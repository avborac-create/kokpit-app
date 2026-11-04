import { davaDosyasiOlustur } from "@/modules/dava-dosyasi/lib/actions";
import { prisma } from "@/core/db/prisma";
import { kokpitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { DavaDosyasiFormu } from "@/modules/dava-dosyasi/components/dava-dosyasi-formu";

export default async function YeniDavaDosyasiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ musteriId?: string; anaDosyaId?: string }>;
}) {
  const { musteriId, anaDosyaId } = await searchParams;

  // Alt dosya: ana dosyanin müvekkil ve karşı tarafı önceden gelir. Alt dosyanın altına alt dosya açılamaz.
  const ana = anaDosyaId
    ? await prisma.davaDosyasi.findUnique({
        where: { id: anaDosyaId },
        select: {
          id: true,
          kayitNo: true,
          anaDosyaId: true,
          konu: true,
          muvekkiller: { select: { musteriId: true } },
          karsiTaraflar: { select: { karsiTarafId: true, karsiTaraf: { select: { ad: true, tanimlayiciKod: true, detsisNo: true } } } },
        },
      })
    : null;
  const anaDosyaOn =
    ana && !ana.anaDosyaId
      ? {
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
