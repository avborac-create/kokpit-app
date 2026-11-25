import Link from "next/link";
import { redirect } from "next/navigation";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { prisma } from "@/core/db/prisma";
import { kasaOzeti } from "./kasa/kasa-veri";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

type Kart = { ad: string; aciklama: string; yol: string; aktif: boolean };
type Grup = { ad: string; ozet: string; renk: string; kartlar: Kart[] };

// Hesap mantığına göre gruplama: paranın NEREDE durduğu ve KİME ait olduğu.
const GRUPLAR: Grup[] = [
  {
    ad: "1 · Büronun varlıkları",
    ozet: "Büronun elinde fiilen duran para.",
    renk: "#f2b04c",
    kartlar: [
      { ad: "Kasa / Nakit Yönetimi", aciklama: "Nakit tahsilatlar, personele avans/ödeme, bankaya yatırma, kod bazlı takip ve gün sonu sayımı.", yol: "/kokpit/finans/kasa", aktif: true },
      { ad: "Para Hesapları", aciklama: "Büro hesabı, nakit kasa ve sigortalı avukatın kişisel hesabı: hangi para nereden çıktı/nereye geldi, büro ile avukat arasındaki mahsup.", yol: "/kokpit/finans/hesaplar", aktif: true },
      { ad: "Banka", aciklama: "Banka hesapları, hareketler ve mutabakat.", yol: "/kokpit/finans/banka", aktif: false },
    ],
  },
  {
    ad: "2 · Müvekkil emanet hesapları",
    ozet: "Müvekkile ait olup büroda duran ya da müvekkilden beklenen para; büronun geliri sayılmaz.",
    renk: "#8b6cf0",
    kartlar: [
      { ad: "Müvekkil Finansal İlişkiler", aciklama: "Cari hesaplar: para trafiği, masraf, vekalet, bloke para ve dosya bazlı bakiye takibi.", yol: "/kokpit/finans/musteri-iliskileri", aktif: true },
      { ad: "İadesi Bekleyen Tutarlar", aciklama: "Dosyalarda artan ve müvekkile geri ödenecek paralar (109 - İade Edilecek Tutarlar): kim, hangi dosya, ne kadar bekliyor.", yol: "/kokpit/finans/iade-bekleyenler", aktif: true },
      { ad: "Müvekkilden İstenen Paralar", aciklama: "İstenen ödemeler: ne zaman istendi, geldi mi, hangi hesaba geldi; para geldi teyidi.", yol: "/kokpit/finans/istenen-paralar", aktif: true },
    ],
  },
  {
    ad: "3 · Askıdaki tahsilat",
    ozet: "Gelmiş ama henüz kime/hangi dosyaya ait olduğu kesinleşmemiş para.",
    renk: "#2fb5c9",
    kartlar: [
      { ad: "Para Havuzu", aciklama: "Sahibi belli olmayan para önce havuza girilir; avukattan öğrenilince müvekkile ya da dosyaya aktarılır.", yol: "/kokpit/finans/para-havuzu", aktif: true },
      { ad: "Teyit bekleyen ödemeler", aciklama: "Dekontla girilmiş, muhasebe teyidi bekleyen gelen ödemeler.", yol: "/kokpit/hizli-veri-girisi/para-trafigi", aktif: true },
    ],
  },
  {
    ad: "4 · Gelir ve gider",
    ozet: "Büronun kendi kazancı ve harcamaları.",
    renk: "#ef6a5b",
    kartlar: [
      { ad: "Tahsilat Listesi", aciklama: "Tüm tahsilatların tek listede takibi ve raporu.", yol: "/kokpit/finans/tahsilat-listesi", aktif: false },
      { ad: "Büro Genel Giderleri", aciklama: "Kira, personel, sabit giderler gibi büronun kendi masrafları.", yol: "/kokpit/finans/buro-giderleri", aktif: false },
    ],
  },
];

export default async function FinansSayfasi() {
  if (!(await modulErisimiVarMi("finans"))) redirect("/kokpit");
  const [kasa, havuzlar, teyitBekleyen] = await Promise.all([
    kasaOzeti(),
    prisma.paraHavuzuGirisi.findMany({ select: { tutar: true, dagitimlar: { select: { tutar: true } } } }),
    prisma.gelenOdemeKaydi.count({ where: { durum: "TEYIT_BEKLIYOR" } }),
  ]);
  const havuz = havuzlar.reduce((t, g) => t + Number(g.tutar) - g.dagitimlar.reduce((a, d) => a + Number(d.tutar), 0), 0);

  const ozetler = [
    { ad: "Kasadaki nakit", deger: para.format(kasa.bakiye), renk: "#f2b04c" },
    { ad: "Havuzda bekleyen", deger: para.format(havuz), renk: "#2fb5c9" },
    { ad: "Teyit bekleyen ödeme", deger: String(teyitBekleyen), renk: "#8b6cf0" },
  ];

  return (
    <div className="mx-auto max-w-4xl pt-3">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Finans / Muhasebe</h1>
      <p className="mb-5 text-sm text-white/55">
        Ekranlar paranın nerede durduğuna ve kime ait olduğuna göre gruplandı. Yeni kayıt girmek için sol menüdeki <b>Hızlı Veri Girişi</b>&apos;ni kullanın.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ozetler.map((o) => (
          <div key={o.ad} className="glass rounded-2xl p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{o.ad}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: o.renk }}>
              {o.deger}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {GRUPLAR.map((g) => (
          <section key={g.ad}>
            <h2 className="text-sm font-semibold text-white">{g.ad}</h2>
            <p className="mb-2 text-xs text-white/45">{g.ozet}</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {g.kartlar.map((k) =>
                k.aktif ? (
                  <Link key={k.ad} href={k.yol} className="glass block rounded-2xl border-l-4 p-4 transition-colors hover:bg-white/[0.06]" style={{ borderLeftColor: g.renk }}>
                    <p className="font-medium text-white">{k.ad}</p>
                    <p className="mt-1 text-sm text-white/55">{k.aciklama}</p>
                  </Link>
                ) : (
                  <div key={k.ad} className="glass rounded-2xl border-l-4 p-4 opacity-50" style={{ borderLeftColor: g.renk }}>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{k.ad}</p>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/50">Yakında</span>
                    </div>
                    <p className="mt-1 text-sm text-white/40">{k.aciklama}</p>
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
