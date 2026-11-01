import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { GorevListesi } from "./gorev-listesi";

// Zamana bagli olmayan, insanlarin yapmasi gereken isler. Tarihli/saatli isler Buro Takvimi'nde kalir.
export default async function BekleyenGorevlerSayfasi({ searchParams }: { searchParams: Promise<{ kimin?: string }> }) {
  const { kimin } = await searchParams;
  const k = await mevcutKullanici();
  const [gorevler, kisiler] = await Promise.all([
    prisma.bekleyenGorev.findMany({
      orderBy: [{ tamamlandiMi: "asc" }, { olusturmaTarihi: "desc" }],
      take: 300,
    }),
    prisma.kullanici.findMany({ where: { aktifMi: true }, select: { id: true, adSoyad: true }, orderBy: { adSoyad: "asc" } }),
  ]);
  const ad = new Map(kisiler.map((x) => [x.id, x.adSoyad]));

  return (
    <div className="mx-auto max-w-3xl pt-3">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Bekleyen Görevler</h1>
      <p className="mb-5 mt-1 text-sm text-white/55">Zamana bağlı olmayan, yapılması gereken işler. Tarihi ve saati olan işler Büro Takvimi’nde durur.</p>
      <GorevListesi
        benimId={k?.kullaniciId ?? ""}
        tumBuro={kimin === "buro"}
        kisiler={kisiler}
        gorevler={gorevler.map((g) => ({
          id: g.id,
          baslik: g.baslik,
          aciklama: g.aciklama,
          sorumluId: g.sorumluId,
          sorumluAd: g.sorumluId ? (ad.get(g.sorumluId) ?? "—") : "Atanmadı",
          tamam: g.tamamlandiMi,
          otomatik: Boolean(g.kaynak),
          tarih: g.olusturmaTarihi.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" }),
        }))}
      />
    </div>
  );
}
