import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { bakiyeEkle, kasaSatirlari } from "./kasa-veri";
import { KasaSatirIslemleri, SayimFormu, YeniKasaHareketi } from "./kasa-formlari";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const gun = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });
const ayAdi = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
const GORUNUMLER = [
  { k: "hareketler", ad: "Hareketler" },
  { k: "kodlar", ad: "Kodlara göre" },
  { k: "personel", ad: "Personel" },
  { k: "sayim", ad: "Sayım" },
];

function ayAnahtari(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function KasaSayfasi({ searchParams }: { searchParams: Promise<{ ay?: string; g?: string }> }) {
  const k = await mevcutKullanici();
  if (!k) redirect("/giris");
  if (!silebilirMi(k.rol)) redirect("/kokpit");
  const { ay: ayParam, g } = await searchParams;
  const gorunum = GORUNUMLER.some((x) => x.k === g) ? (g as string) : "hareketler";

  const [satirlar, kodlar, kisiler, sayimlar] = await Promise.all([
    kasaSatirlari(),
    prisma.kasaKodu.findMany({ where: { aktifMi: true }, orderBy: { no: "asc" } }),
    prisma.kullanici.findMany({ where: { aktifMi: true }, select: { id: true, adSoyad: true }, orderBy: { adSoyad: "asc" } }),
    prisma.kasaSayimi.findMany({ orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }], take: 15 }),
  ]);
  const kisiAdi = new Map(kisiler.map((x) => [x.id, x.adSoyad]));

  // Birikimli bakiye tum satirlardan hesaplanir.
  const bakiyeli = bakiyeEkle(satirlar);
  const bakiye = bakiyeli.length ? bakiyeli[bakiyeli.length - 1].bakiye : 0;

  const bugunAy = ayAnahtari(new Date());
  const aylar = [...new Set([bugunAy, ...bakiyeli.map((s) => ayAnahtari(s.tarih))])].sort().reverse();
  const secili = ayParam === "tumu" ? "tumu" : ayParam && aylar.includes(ayParam) ? ayParam : bugunAy;
  const donem = secili === "tumu" ? bakiyeli : bakiyeli.filter((s) => ayAnahtari(s.tarih) === secili);
  const donemGiris = donem.filter((s) => s.yon === "GIRIS").reduce((t, s) => t + s.tutar, 0);
  const donemCikis = donem.filter((s) => s.yon === "CIKIS").reduce((t, s) => t + s.tutar, 0);

  const kodOzeti = new Map<string, { no: number | null; ad: string; yon: string; adet: number; toplam: number }>();
  for (const s of donem) {
    const a = `${s.kodNo}|${s.yon}`;
    const o = kodOzeti.get(a) ?? { no: s.kodNo, ad: s.kodAd, yon: s.yon, adet: 0, toplam: 0 };
    o.adet++;
    o.toplam += s.tutar;
    kodOzeti.set(a, o);
  }
  const personelOzeti = new Map<string, { cikis: number; giris: number; tumCikis: number; tumGiris: number }>();
  for (const s of bakiyeli) {
    if (!s.personelId) continue;
    const o = personelOzeti.get(s.personelId) ?? { cikis: 0, giris: 0, tumCikis: 0, tumGiris: 0 };
    const donemde = secili === "tumu" || ayAnahtari(s.tarih) === secili;
    if (s.yon === "CIKIS") {
      o.tumCikis += s.tutar;
      if (donemde) o.cikis += s.tutar;
    } else {
      o.tumGiris += s.tutar;
      if (donemde) o.giris += s.tutar;
    }
    personelOzeti.set(s.personelId, o);
  }

  const kodListesi = kodlar.map((x) => ({ id: x.id, no: x.no, ad: x.ad, yon: x.yon, personelMi: x.personelMi }));
  const href = (kismi: { ay?: string; g?: string }) => `/kokpit/finans/kasa?ay=${kismi.ay ?? secili}&g=${kismi.g ?? gorunum}`;

  return (
    <div className="mx-auto max-w-4xl pt-3">
      <Link href="/kokpit/finans" className="text-xs text-white/50 hover:underline">
        ← Finans
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Kasa / Nakit Yönetimi</h1>
      <p className="mb-5 mt-1 text-sm text-white/55">
        Müvekkillerden gelen nakit tahsilatlar otomatik girer. Personele avans, büro gideri, bankaya yatırma gibi çıkışları ve diğer girişleri kasa kodlarıyla buradan işlersiniz.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="glass rounded-2xl p-4 md:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Kasadaki nakit</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${bakiye < 0 ? "text-[#ff7a70]" : "text-white"}`}>{para.format(bakiye)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Dönem girişi</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[#32d74b]">{para.format(donemGiris)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Dönem çıkışı</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[#ff7a70]">{para.format(donemCikis)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Dönem net</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-white">{para.format(donemGiris - donemCikis)}</p>
        </div>
      </div>

      <YeniKasaHareketi kodlar={kodListesi} kisiler={kisiler} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {GORUNUMLER.map((x) => (
          <Link key={x.k} href={href({ g: x.k })} className={`border px-3 py-1.5 text-sm ${gorunum === x.k ? "border-[var(--accent)] bg-[var(--accent)]/25 text-white" : "border-white/15 text-white/60 hover:bg-white/10"}`}>
            {x.ad}
          </Link>
        ))}
        <span className="mx-1 text-white/25">|</span>
        <div className="flex max-w-full gap-1.5 overflow-x-auto">
          <Link href={href({ ay: "tumu" })} className={`whitespace-nowrap border px-2.5 py-1.5 text-xs ${secili === "tumu" ? "border-[var(--accent)] bg-[var(--accent)]/25 text-white" : "border-white/15 text-white/60 hover:bg-white/10"}`}>
            Tümü
          </Link>
          {aylar.map((a) => (
            <Link key={a} href={href({ ay: a })} className={`whitespace-nowrap border px-2.5 py-1.5 text-xs ${secili === a ? "border-[var(--accent)] bg-[var(--accent)]/25 text-white" : "border-white/15 text-white/60 hover:bg-white/10"}`}>
              {ayAdi.format(new Date(`${a}-01T12:00:00`))}
            </Link>
          ))}
        </div>
      </div>

      {gorunum === "hareketler" && (
        <div className="glass overflow-x-auto rounded-2xl">
          {donem.length === 0 ? (
            <p className="p-4 text-sm text-white/45">Bu dönemde kasa hareketi yok.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 font-medium">Kod / Açıklama</th>
                  <th className="px-4 py-3 text-right font-medium">Tutar</th>
                  <th className="px-4 py-3 text-right font-medium">Kasa bakiyesi</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {[...donem].reverse().map((s) => (
                  <tr key={s.id} className="border-t border-white/[0.06]">
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">{gun.format(s.tarih)}</td>
                    <td className="px-4 py-3 text-white/85">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--link)]">
                        {s.kodNo} - {s.kodAd}
                      </span>
                      {s.aciklama}
                      {s.otomatik && s.dosyaId && (
                        <Link href={`/kokpit/dava-dosyalari/${s.dosyaId}`} className="ml-2 text-xs text-[#6db8ff] hover:underline">
                          dosyaya git
                        </Link>
                      )}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${s.yon === "GIRIS" ? "text-[#32d74b]" : "text-[#ff7a70]"}`}>
                      {s.yon === "GIRIS" ? "+" : "−"}
                      {para.format(s.tutar)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-white/70">{para.format(s.bakiye)}</td>
                    <td className="px-4 py-3">
                      {s.otomatik ? (
                        <span className="text-xs text-white/35">Para Trafiği&apos;nden</span>
                      ) : (
                        <KasaSatirIslemleri
                          id={s.id}
                          kodlar={kodListesi}
                          kisiler={kisiler}
                          ilk={{ kodId: s.kodId ?? "", tarih: s.tarih.toISOString().slice(0, 10), tutar: s.tutar, aciklama: s.ham, personelId: s.personelId ?? "" }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {gorunum === "kodlar" && (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Kasa kodu</th>
                <th className="px-4 py-3 font-medium">Yön</th>
                <th className="px-4 py-3 text-right font-medium">Adet</th>
                <th className="px-4 py-3 text-right font-medium">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {[...kodOzeti.values()]
                .sort((a, c) => (a.no ?? 0) - (c.no ?? 0))
                .map((o) => (
                  <tr key={`${o.no}${o.yon}`} className="border-t border-white/[0.06]">
                    <td className="px-4 py-3 text-white/85">
                      {o.no} - {o.ad}
                    </td>
                    <td className={`px-4 py-3 ${o.yon === "GIRIS" ? "text-[#32d74b]" : "text-[#ff7a70]"}`}>{o.yon === "GIRIS" ? "Giriş" : "Çıkış"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/70">{o.adet}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-white">{para.format(o.toplam)}</td>
                  </tr>
                ))}
              {kodOzeti.size === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-white/45">
                    Bu dönemde hareket yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {gorunum === "personel" && (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Personel</th>
                <th className="px-4 py-3 text-right font-medium">Dönemde aldığı</th>
                <th className="px-4 py-3 text-right font-medium">Dönemde iade</th>
                <th className="px-4 py-3 text-right font-medium">Tüm zamanlar net</th>
              </tr>
            </thead>
            <tbody>
              {[...personelOzeti.entries()].map(([id, o]) => (
                <tr key={id} className="border-t border-white/[0.06]">
                  <td className="px-4 py-3 text-white/85">{kisiAdi.get(id) ?? "Personel"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#ff7a70]">{para.format(o.cikis)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#32d74b]">{para.format(o.giris)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-white">{para.format(o.tumCikis - o.tumGiris)}</td>
                </tr>
              ))}
              {personelOzeti.size === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-white/45">
                    Henüz personele bağlı kasa hareketi yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {gorunum === "sayim" && (
        <div className="flex flex-col gap-4">
          <SayimFormu beklenen={bakiye} />
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                  <th className="px-4 py-3 text-right font-medium">Sayılan</th>
                  <th className="px-4 py-3 text-right font-medium">Beklenen</th>
                  <th className="px-4 py-3 text-right font-medium">Fark</th>
                  <th className="px-4 py-3 font-medium">Not</th>
                </tr>
              </thead>
              <tbody>
                {sayimlar.map((x) => {
                  const fark = Number(x.fark);
                  return (
                    <tr key={x.id} className="border-t border-white/[0.06]">
                      <td className="px-4 py-3 text-white/60">{gun.format(x.tarih)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-white/85">{para.format(Number(x.sayilan))}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-white/60">{para.format(Number(x.beklenen))}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${Math.abs(fark) < 0.005 ? "text-[#32d74b]" : "text-[#ff7a70]"}`}>{para.format(fark)}</td>
                      <td className="px-4 py-3 text-white/60">{x.aciklama}</td>
                    </tr>
                  );
                })}
                {sayimlar.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-white/45">
                      Henüz sayım kaydı yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
