import { NextResponse } from "next/server";
import { prisma } from "@/core/db/prisma";
import { finansYetkilileri, turBildirimiGonder } from "@/core/bildirim/tur-bildirimi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESIK_GUN = 3;
const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// Günlük hatırlatma (vercel.json crons): müvekkilden istenip ESIK_GUN günden uzun süredir gelmeyen paralar.
// Sorumlu kişiye kendi talepleri, finans yetkililerine tümünün özeti gider.
export async function GET(request: Request) {
  const sir = process.env.CRON_SECRET;
  if (!sir || request.headers.get("authorization") !== `Bearer ${sir}`) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const kayitlar = await prisma.hesapOzetiKaydi.findMany({
    where: { sonuc: "GONDERILDI", geldiMi: false },
    include: { musteri: { select: { adSoyadUnvan: true } } },
  });
  const simdi = Date.now();
  const gecikenler = kayitlar
    .map((k) => {
      const istenme = k.istenmeTarihi ?? k.sonucTarihi;
      return { k, gun: istenme ? Math.floor((simdi - istenme.getTime()) / 86_400_000) : 0 };
    })
    .filter((x) => x.gun >= ESIK_GUN);
  if (gecikenler.length === 0) return NextResponse.json({ gonderilen: 0 });

  const sorumluya = new Map<string, typeof gecikenler>();
  for (const g of gecikenler) {
    const kime = g.k.sorumluId ?? g.k.olusturanId;
    if (kime) sorumluya.set(kime, [...(sorumluya.get(kime) ?? []), g]);
  }
  for (const [kime, liste] of sorumluya) {
    const en = liste.reduce((a, b) => (b.gun > a.gun ? b : a));
    await turBildirimiGonder([kime], "para-gecikti", {
      baslik: `İstediğiniz ${liste.length} ödeme gelmedi`,
      metin: `En uzun: ${en.k.musteri.adSoyadUnvan} — ${para.format(en.k.toplam)}, ${en.gun} gündür bekliyor.`,
      url: "/kokpit/finans/istenen-paralar",
      etiket: `para-gecikti-${kime}`,
    });
  }
  const toplam = gecikenler.reduce((t, g) => t + g.k.toplam, 0);
  const enUzun = Math.max(...gecikenler.map((g) => g.gun));
  await turBildirimiGonder(await finansYetkilileri(), "para-gecikti", {
    baslik: `${gecikenler.length} istenen ödeme gelmedi`,
    metin: `Toplam ${para.format(toplam)}; en uzun bekleyen ${enUzun} gün.`,
    url: "/kokpit/finans/istenen-paralar",
    etiket: "para-gecikti-finans",
  });
  return NextResponse.json({ gonderilen: gecikenler.length });
}
