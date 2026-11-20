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
          aciklama: "Dosyası belli olan gelen ödemeyi dekontuyla girin; muhasebe teyit edene kadar “teyit bekliyor” olarak görünür.",
          yol: "/kokpit/hizli-veri-girisi/para-trafigi",
          rozet: teyitBekleyen > 0 ? `${teyitBekleyen} teyit bekliyor` : undefined,
        },
        ...(finansVar
          ? [
              {
                anahtar: "para-havuzu",
                ad: "Para Havuzu — sahibi belli olmayan para",
                aciklama: "Hangi dosyaya ait olduğu belli olmayan parayı havuza girin; sonra müvekkile ya da dosyaya aktarın.",
                yol: "/kokpit/finans/para-havuzu",
                rozet: havuzRozeti,
              },
              {
                anahtar: "kasa",
                ad: "Kasa hareketi (nakit)",
                aciklama: "Personele avans, büro gideri, bankaya yatırma gibi nakit giriş/çıkışlar.",
                yol: "/kokpit/finans/kasa",
              },
              {
                anahtar: "istenen-para",
                ad: "Müvekkilden para iste",
                aciklama: "Müvekkilden istenen ödemeyi kaydedin; geldi mi, hangi hesaba geldi takibi.",
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
        { anahtar: "yargi-dosyasi", ad: "Yeni Yargı dosyası", aciklama: "İcra, dava, ihtar ve diğer yargı dosyası açın.", yol: "/kokpit/dava-dosyalari/yeni" },
        { anahtar: "cmk-dosyasi", ad: "Yeni CMK dosyası", aciklama: "Zorunlu müdafilik / CMK görevlendirmesi girin.", yol: "/kokpit/cmk-dosyalari/yeni" },
        ...(avukatVar
          ? [{ anahtar: "haciz", ad: "Haciz raporu", aciklama: "Saha haciz raporunu ya da masrafını girin.", yol: "/kokpit/haciz-artcilari/yeni" }]
          : []),
      ],
    },
    {
      ad: "Müvekkil",
      renk: "#8b5cf6",
      girisler: [{ anahtar: "muvekkil", ad: "Yeni müvekkil", aciklama: "Müvekkil kartı açın.", yol: "/kokpit/musteriler/yeni" }],
    },
    {
      ad: "Görev ve takvim",
      renk: "#14b8c4",
      girisler: [
        { anahtar: "gorev", ad: "Görev / iş oluştur", aciklama: "Bir kişiye görev atayın, dosyaya bağlayın.", yol: "/kokpit/isler" },
        { anahtar: "takvim", ad: "Takvim kaydı", aciklama: "Duruşma, toplantı, not ya da doğum günü ekleyin.", yol: "/kokpit/takvim" },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-4xl pt-3">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Hızlı Veri Girişi</h1>
      <p className="mb-6 text-sm text-white/55">
        Her tür veri girişi tek kapıdan: girmek istediğiniz kaydı seçin, ilgili modüle işlenir. Yetkiniz olmayan modüllerin girişleri görünmez.
      </p>
      <div className="flex flex-col gap-6">
        {gruplar.map((grup) => (
          <section key={grup.ad}>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">{grup.ad}</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {grup.girisler.map((g) => (
                <Link key={g.anahtar} href={g.yol} className="glass block rounded-2xl border-l-4 p-4 transition-colors hover:bg-white/[0.06]" style={{ borderLeftColor: grup.renk }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{g.ad}</p>
                    {g.rozet && <span className="rounded-full bg-[#f2b04c]/25 px-2 py-0.5 text-xs font-medium text-[#f2b04c]">{g.rozet}</span>}
                  </div>
                  <p className="mt-1 text-sm text-white/55">{g.aciklama}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
