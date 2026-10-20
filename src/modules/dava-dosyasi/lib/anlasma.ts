import { prisma } from "@/core/db/prisma";
import { dosyaEtiketiYaz } from "@/modules/dava-dosyasi/lib/cari-sistem";

// Muvekkil ile buro arasindaki ucret anlasmasi.
//  - dosyaId BOS: muvekkil GENELI (o muvekkilin dosyalari icin varsayilan)
//  - dosyaId DOLU: o dosyaya OZEL anlasma (varsa genelin yerine gecer)

export type AnlasmaVerisi = {
  id: string;
  dosyaId: string | null;
  hizmetBedeli: number | null;
  kdvDahilMi: boolean | null;
  kdvOrani: number;
  odemeSekliId: string | null;
  odemeSekli: string | null;
  odemePlani: string | null;
  basariPrimi: string | null;
  masrafSorumlusuId: string | null;
  masrafSorumlusu: string | null;
  anlasmaTarihi: Date | null;
  belgeReferansi: string | null;
  notlar: string | null;
};

const sayi = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function veriyeCevir(
  a: NonNullable<Awaited<ReturnType<typeof prisma.muvekkilAnlasma.findFirst>>> & {
    odemeSekli: { etiket: string } | null;
    masrafSorumlusu: { etiket: string } | null;
  },
): AnlasmaVerisi {
  return {
    id: a.id,
    dosyaId: a.dosyaId,
    hizmetBedeli: sayi(a.hizmetBedeli),
    kdvDahilMi: a.kdvDahilMi,
    kdvOrani: Number(a.kdvOrani),
    odemeSekliId: a.odemeSekliId,
    odemeSekli: a.odemeSekli?.etiket ?? null,
    odemePlani: a.odemePlani,
    basariPrimi: a.basariPrimi,
    masrafSorumlusuId: a.masrafSorumlusuId,
    masrafSorumlusu: a.masrafSorumlusu?.etiket ?? null,
    anlasmaTarihi: a.anlasmaTarihi,
    belgeReferansi: a.belgeReferansi,
    notlar: a.notlar,
  };
}

const iliski = { odemeSekli: { select: { etiket: true } }, masrafSorumlusu: { select: { etiket: true } } } as const;

// Tam olarak bu kapsamin (muvekkil geneli ya da dosya) kendi anlasmasi.
export async function anlasmaGetir(musteriId: string, dosyaId: string | null): Promise<AnlasmaVerisi | null> {
  const a = await prisma.muvekkilAnlasma.findFirst({ where: { musteriId, dosyaId }, include: iliski });
  return a ? veriyeCevir(a) : null;
}

// Bir dosya icin gecerli anlasma: dosyaya ozel varsa o, yoksa muvekkil geneli.
export async function etkinAnlasma(musteriId: string, dosyaId: string) {
  const ozel = await anlasmaGetir(musteriId, dosyaId);
  if (ozel) return { kaynak: "dosya" as const, anlasma: ozel };
  const genel = await anlasmaGetir(musteriId, null);
  return genel ? { kaynak: "muvekkil" as const, anlasma: genel } : { kaynak: null, anlasma: null };
}

// Muvekkil ekraninda: dosyalara ozel anlasmalarin listesi.
export async function dosyaAnlasmalari(musteriId: string) {
  const liste = await prisma.muvekkilAnlasma.findMany({
    where: { musteriId, dosyaId: { not: null } },
    include: {
      ...iliski,
      dosya: { select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, anaDosya: { select: { kayitNo: true } } } },
    },
    orderBy: { olusturmaTarihi: "asc" },
  });
  return liste.map((a) => ({
    ...veriyeCevir(a),
    dosyaEtiketi: a.dosya ? dosyaEtiketiYaz(a.dosya) : "—",
  }));
}

// KDV'li (toplam) tutar: bedel KDV dahilse kendisi, haricse bedel + KDV.
export function kdvliTutar(a: Pick<AnlasmaVerisi, "hizmetBedeli" | "kdvDahilMi" | "kdvOrani">): number | null {
  if (a.hizmetBedeli === null) return null;
  const toplam = a.kdvDahilMi === false ? a.hizmetBedeli * (1 + a.kdvOrani / 100) : a.hizmetBedeli;
  return Math.round(toplam * 100) / 100;
}
