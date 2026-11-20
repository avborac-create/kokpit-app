import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { gercekKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { AKISLAR, OLGUNLUKLAR } from "./sabitler";
import { GelistirmeSatiri, YeniGelistirmeFormu, type GelistirmeKarti } from "./kart";

export default async function GelistirmelerSayfasi() {
  const k = await gercekKullanici();
  if (!k || !silebilirMi(k.rol)) redirect("/kokpit");

  const kayitlar = await prisma.gelistirme.findMany({ orderBy: { guncellemeTarihi: "desc" } });
  const kartlar: GelistirmeKarti[] = kayitlar.map((g) => ({
    id: g.id,
    baslik: g.baslik,
    aciklama: g.aciklama,
    modul: g.modul,
    akis: g.akis,
    olgunluk: g.olgunluk,
    gecmis: (g.gecmis as GelistirmeKarti["gecmis"]) ?? [],
  }));

  return (
    <div className="pt-3">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Geliştirmeler</h1>
      <p className="mb-4 mt-1 text-sm text-white/55">
        Yazılıma istenen her geliştirme önce burada görünür. <b>İş akışı</b> işin neresinde olduğunu, <b>olgunluk</b> ne kadar oturduğunu gösterir.
      </p>

      <details className="glass mb-4 rounded-xl p-3 text-xs text-white/60">
        <summary className="cursor-pointer text-white/80">Durumların anlamı</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            {AKISLAR.map((a) => (
              <p key={a.k}>
                <b className="text-white/80">{a.ad}:</b> {a.aciklama}
              </p>
            ))}
          </div>
          <div>
            {OLGUNLUKLAR.map((a) => (
              <p key={a.k}>
                <b className="text-white/80">{a.ad}:</b> {a.aciklama}
              </p>
            ))}
          </div>
        </div>
      </details>

      <YeniGelistirmeFormu />

      <div className="grid gap-4 lg:grid-cols-3">
        {AKISLAR.filter((a) => a.k !== "REDDEDILDI" || kartlar.some((g) => g.akis === a.k)).map((a) => {
          const liste = kartlar.filter((g) => g.akis === a.k);
          return (
            <div key={a.k}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-white/70">
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${a.sinif}`}>{a.ad}</span>
                <span className="text-white/35">{liste.length}</span>
              </h2>
              <div className="flex flex-col gap-2">
                {liste.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-white/30">Boş</p>}
                {liste.map((g) => (
                  <GelistirmeSatiri key={g.id} g={g} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
