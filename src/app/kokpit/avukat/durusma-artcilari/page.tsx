import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { kayitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { durusmaArtciIsEmriVer } from "@/modules/avukat/lib/dilekce-actions";
import { kullaniciSecenekleriGetir } from "@/modules/avukat/lib/dosya-secenekleri";

const tarihSaat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

export default async function DurusmaArtcilariSayfasi() {
  if (!(await modulErisimiVarMi("avukat"))) redirect("/kokpit");
  const simdi = new Date();
  const baslangic = new Date(simdi);
  baslangic.setDate(baslangic.getDate() - 30);
  const [dosyalar, kullanicilar, acikIsler] = await Promise.all([
    prisma.davaDosyasi.findMany({
      where: { durusmaTarihi: { gte: baslangic } },
      orderBy: { durusmaTarihi: "asc" },
      select: { id: true, kayitNo: true, dosyaNo: true, birimAdi: true, konu: true, durusmaTarihi: true },
    }),
    kullaniciSecenekleriGetir(),
    prisma.is.findMany({ where: { kaynak: { startsWith: "durusma:" } }, select: { id: true, baslik: true, durum: true, kaynak: true } }),
  ]);
  return (
    <div className="pt-3">
      <Link href="/kokpit/avukat" className="text-sm text-white/50 hover:text-white">← Avukat</Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold tracking-tight text-white">Duruşma Artçıları</h1>
      <p className="mb-4 text-sm text-white/55">Yaklaşan ve son 30 günde geçen duruşmalar. Duruşma sonrası yapılacak işi iş emri olarak verin; Görevler modülüne düşer.</p>
      <div className="flex flex-col gap-3">
        {dosyalar.map((d) => {
          const gecti = d.durusmaTarihi! < simdi;
          const isler = acikIsler.filter((i) => i.kaynak === `durusma:${d.id}`);
          return (
            <div key={d.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${gecti ? "bg-white/[0.08] text-white/60" : "bg-[#e5373d]/20 text-[#ff7a70]"}`}>{gecti ? "Geçti" : "Yaklaşıyor"}</span>
                <span className="text-sm font-medium text-white">{tarihSaat.format(d.durusmaTarihi!)}</span>
                <Link href={`/kokpit/dava-dosyalari/${d.id}`} className="text-sm text-[#6db8ff] hover:underline">{kayitNoGoster(d.kayitNo)} · {d.dosyaNo ?? "Esas no yok"}</Link>
              </div>
              <p className="mt-1 text-sm text-white/60">{[d.birimAdi, d.konu].filter(Boolean).join(" — ")}</p>
              {isler.length > 0 && (
                <ul className="mt-2 text-xs text-white/55">
                  {isler.map((i) => (
                    <li key={i.id}><Link href={`/kokpit/isler/${i.id}`} className="hover:text-white">• {i.baslik} ({i.durum === "TAMAMLANDI" ? "tamamlandı" : "açık"})</Link></li>
                  ))}
                </ul>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-white/70 hover:text-white">+ Artçı iş emri ver</summary>
                <form action={durusmaArtciIsEmriVer.bind(null, d.id)} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Alan><Etiket>İş</Etiket><Girdi name="baslik" required placeholder="Örn. tutanağı UYAP'tan indir" /></Alan>
                  <Alan>
                    <Etiket>Sorumlu</Etiket>
                    <Secim name="sorumluId" required defaultValue="">
                      <option value="" disabled>Seçiniz…</option>
                      {kullanicilar.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
                    </Secim>
                  </Alan>
                  <Alan><Etiket>Son tarih</Etiket><Girdi name="vade" type="date" /></Alan>
                  <div className="sm:col-span-3"><GonderButonu>İş emri ver</GonderButonu></div>
                </form>
              </details>
            </div>
          );
        })}
        {dosyalar.length === 0 && <p className="glass rounded-2xl p-6 text-center text-white/40">Yaklaşan veya yeni geçmiş duruşma kaydı yok.</p>}
      </div>
    </div>
  );
}
