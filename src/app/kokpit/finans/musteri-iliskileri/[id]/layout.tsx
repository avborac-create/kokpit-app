import Link from "next/link";
import { prisma } from "@/core/db/prisma";
import { KunyeSeridi } from "@/core/ui/kunye-seridi";

// Muvekkil finans sayfalarinda (cari hesap, odeme talebi, hareket duzenleme)
// hangi muvekkilde oldugumuz bilgisi kaydirirken de ustte sabit kalir.
export default async function MusteriFinansLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const musteri = await prisma.musteri.findUnique({ where: { id }, select: { adSoyadUnvan: true } });
  return (
    <>
      <KunyeSeridi className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/45">Müvekkil</span>
        <Link href={`/kokpit/musteriler/${id}`} className="text-base font-semibold text-white hover:text-[#6db8ff] hover:underline">
          {musteri?.adSoyadUnvan ?? "—"}
        </Link>
      </KunyeSeridi>
      {children}
    </>
  );
}
