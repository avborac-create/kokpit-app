import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { dosyaEtiketiYaz } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { DagitDugmesi, GeriAlDugmesi, GirisSilDugmesi, YeniHavuzGirisi } from "./formlar";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const gun = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

export default async function ParaHavuzuSayfasi({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  if (!(await modulErisimiVarMi("finans"))) redirect("/kokpit");
  const { g } = await searchParams;
  const sekme = g === "dagitilan" ? "dagitilan" : "bekleyen";

  const [girisler, musteriler, yontemSecenekleri] = await Promise.all([
    prisma.paraHavuzuGirisi.findMany({ include: { dagitimlar: { orderBy: { olusturmaTarihi: "asc" } } }, orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }] }),
    prisma.musteri.findMany({ select: { id: true, adSoyadUnvan: true }, orderBy: { adSoyadUnvan: "asc" } }),
    secenekleriGetir("odeme_yontemi"),
  ]);
  const yontemler = yontemSecenekleri.map((y) => ({ id: y.id, etiket: y.etiket }));
  const yontemAdi = new Map(yontemler.map((y) => [y.id, y.etiket]));
  const musteriListesi = musteriler.map((m) => ({ id: m.id, ad: m.adSoyadUnvan }));
  const musteriAdi = new Map(musteriListesi.map((m) => [m.id, m.ad]));

  const dosyaIdleri = [...new Set(girisler.flatMap((x) => x.dagitimlar.map((d) => d.dosyaId).filter((v): v is string => !!v)))];
  const dosyalar = await prisma.davaDosyasi.findMany({
    where: { id: { in: dosyaIdleri } },
    select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, anaDosya: { select: { kayitNo: true } } },
  });
  const dosyaEtiketi = new Map(dosyalar.map((d) => [d.id, dosyaEtiketiYaz(d)]));

  const satirlar = girisler.map((x) => {
    const dagitilan = x.dagitimlar.reduce((t, d) => t + Number(d.tutar), 0);
    return { ...x, tutarSayi: Number(x.tutar), kalan: Math.round((Number(x.tutar) - dagitilan) * 100) / 100 };
  });
  const bekleyenler = satirlar.filter((x) => x.kalan > 0.001);
  const havuzToplami = bekleyenler.reduce((t, x) => t + x.kalan, 0);
  const dagitilanlar = satirlar.filter((x) => x.dagitimlar.length > 0);
  const liste = sekme === "bekleyen" ? bekleyenler : dagitilanlar;

  return (
    <div className="mx-auto max-w-4xl pt-3">
      <Link href="/kokpit/finans" className="text-xs text-white/50 hover:underline">
        ← Finans
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Para Havuzu</h1>
      <p className="mb-5 mt-1 text-sm text-white/55">
        Gelen paranın hangi dosyaya ait olduğu belli değilse buraya girilir. Avukattan öğrenilince para <b>müvekkile</b> ya da doğrudan <b>dosyaya</b> aktarılır; bir kısmı aktarılıp kalanı havuzda bırakılabilir.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Havuzda bekleyen</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[#f2b04c]">{para.format(havuzToplami)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Bekleyen kayıt</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-white">{bekleyenler.length}</p>
        </div>
      </div>

      <YeniHavuzGirisi yontemler={yontemler} />

      <div className="mb-3 flex gap-2">
        {[
          { k: "bekleyen", ad: "Dağıtılmayı bekleyen" },
          { k: "dagitilan", ad: "Dağıtım geçmişi" },
        ].map((x) => (
          <Link key={x.k} href={`/kokpit/finans/para-havuzu?g=${x.k}`} className={`border px-3 py-1.5 text-sm ${sekme === x.k ? "border-[var(--accent)] bg-[var(--accent)]/25 text-white" : "border-white/15 text-white/60 hover:bg-white/10"}`}>
            {x.ad}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {liste.length === 0 && <p className="glass rounded-2xl p-4 text-sm text-white/45">{sekme === "bekleyen" ? "Havuzda bekleyen para yok." : "Henüz dağıtım yapılmadı."}</p>}
        {liste.map((x) => (
          <div key={x.id} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white/60">
                  {gun.format(x.tarih)}
                  {x.odemeYontemiId && yontemAdi.get(x.odemeYontemiId) ? ` · ${yontemAdi.get(x.odemeYontemiId)}` : ""}
                </p>
                <p className="mt-0.5 font-medium text-white">{x.kaynak || "Kaynak belirtilmedi"}</p>
                {x.aciklama && <p className="text-sm text-white/55">{x.aciklama}</p>}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums text-white">{para.format(x.tutarSayi)}</p>
                <p className={`text-xs tabular-nums ${x.kalan > 0.001 ? "text-[#f2b04c]" : "text-[#32d74b]"}`}>
                  {x.kalan > 0.001 ? `Kalan ${para.format(x.kalan)}` : "Tamamı dağıtıldı"}
                </p>
              </div>
            </div>
            {x.dagitimlar.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 border-t border-white/[0.08] pt-3 text-sm">
                {x.dagitimlar.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white/75">
                      → {musteriAdi.get(d.musteriId) ?? "Müvekkil"}
                      {d.dosyaId ? ` · ${dosyaEtiketi.get(d.dosyaId) ?? "dosya"}` : " · (müvekkile genel)"}
                      <span className="ml-2 text-xs text-white/40">{gun.format(d.tarih)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-[#32d74b]">{para.format(Number(d.tutar))}</span>
                      <GeriAlDugmesi dagitimId={d.id} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex justify-end gap-2">
              {x.kalan > 0.001 && <DagitDugmesi girisId={x.id} kalan={x.kalan} musteriler={musteriListesi} />}
              {x.dagitimlar.length === 0 && <GirisSilDugmesi id={x.id} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
