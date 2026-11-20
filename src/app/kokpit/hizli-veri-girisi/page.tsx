import Link from "next/link";
import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { prisma } from "@/core/db/prisma";

type Giris = { anahtar: string; ad: string; aciklama: string; yol: string; rozet?: string };
type Grup = { ad: string; renk: string; girisler: Giris[] };

export default async function HizliVeriGirisiSayfasi() {
  const k = await mevcutKullanici();
  if (!k) redirect("/kokpit");
  const [finansVar, avukatVar, teyitBekleyen, havuzGirisleri] = await Promise.all([
    modulErisimiVarMi("finans"),
    modulErisimiVarMi("avukat"),
    prisma.gelenOdemeKaydi.count({ where: { durum: "TEYIT_BEKLIYOR" } }),
    prisma.paraHavuzuGirisi.findMany({ select: { tutar: true, dagitimlar: { select: { tutar: true } } } }),
  ]);
  const havuzdaBekleyen = havuzGirisleri.reduce((t, g) => t + Number(g.tutar) - g.dagitimlar.reduce((a, d) => a + Number(d.tutar), 0), 0);
  const havuzRozeti = havuzdaBekleyen > 0.001 ? `${havuzdaBekleyen.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺ havuzda` : undefined;

  const gruplar: Grup[] = [
    {
      ad: "Para girişi",
      renk: "#10b981",
      girisler: [
        {
          anahtar: "para-trafigi",
          ad: "Para Trafiği Kaydet",
          aciklama: "Dosyası belli gelen ödeme, dekontlu",
          yol: "/kokpit/hizli-veri-girisi/para-trafigi",
          rozet: teyitBekleyen > 0 ? `${teyitBekleyen} teyit bekliyor` : undefined,
        },
        ...(finansVar
          ? [
              {
                anahtar: "para-havuzu",
                ad: "Para Havuzu",
                aciklama: "Sahibi belli olmayan para",
                yol: "/kokpit/finans/para-havuzu",
                rozet: havuzRozeti,
              },
              {
                anahtar: "kasa",
                ad: "Kasa hareketi (nakit)",
                aciklama: "Avans, büro gideri, bankaya yatırma",
                yol: "/kokpit/finans/kasa",
              },
              {
                anahtar: "istenen-para",
                ad: "Müvekkilden para iste",
                aciklama: "İstenen ödemenin takibi",
                yol: "/kokpit/finans/istenen-paralar",
              },
            ]
          : []),
      ],
    },
    {
      ad: "Dosya",
      renk: "#f59e0b",
      girisler: [
        { anahtar: "yargi-dosyasi", ad: "Yeni Yargı dosyası", aciklama: "İcra, dava, ihtar ve diğerleri", yol: "/kokpit/dava-dosyalari/yeni" },
        { anahtar: "cmk-dosyasi", ad: "Yeni CMK dosyası", aciklama: "Zorunlu müdafilik görevlendirmesi", yol: "/kokpit/cmk-dosyalari/yeni" },
        ...(avukatVar
          ? [{ anahtar: "haciz", ad: "Haciz raporu", aciklama: "Saha raporu veya masrafı", yol: "/kokpit/haciz-artcilari/yeni" }]
          : []),
      ],
    },
    {
      ad: "Müvekkil",
      renk: "#8b5cf6",
      girisler: [{ anahtar: "muvekkil", ad: "Yeni müvekkil", aciklama: "Yeni müvekkil kartı", yol: "/kokpit/musteriler/yeni" }],
    },
    {
      ad: "Görev ve takvim",
      renk: "#14b8c4",
      girisler: [
        { anahtar: "gorev", ad: "Görev / iş oluştur", aciklama: "Kişiye ata, dosyaya bağla", yol: "/kokpit/isler" },
        { anahtar: "takvim", ad: "Takvim kaydı", aciklama: "Duruşma, toplantı, not, doğum günü", yol: "/kokpit/takvim" },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-2xl pt-3">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Hızlı Veri Girişi</h1>
      <p className="mb-8 text-sm text-white/55">Girmek istediğiniz kaydı seçin.</p>
      <div className="flex flex-col gap-7">
        {gruplar.map((grup) => (
          <section key={grup.ad}>
            <h2 className="mb-2 px-4 text-xs font-medium text-white/50">{grup.ad}</h2>
            <div className="glass divide-y divide-white/10 overflow-hidden rounded-2xl">
              {grup.girisler.map((g) => (
                <Link key={g.anahtar} href={g.yol} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.06]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: grup.renk }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-white">{g.ad}</p>
                    <p className="truncate text-xs text-white/50">{g.aciklama}</p>
                  </div>
                  {g.rozet && <span className="shrink-0 rounded-full bg-[#f2b04c]/25 px-2 py-0.5 text-xs font-medium text-[#f2b04c]">{g.rozet}</span>}
                  <span className="shrink-0 text-lg leading-none text-white/30 transition-colors group-hover:text-white/60">›</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
