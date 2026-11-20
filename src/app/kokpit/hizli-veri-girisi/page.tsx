import Link from "next/link";
import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { prisma } from "@/core/db/prisma";

const GIRISLER = [
  {
    anahtar: "para-trafigi",
    renk: "#10b981",
    ad: "Para Trafiği Kaydet",
    aciklama: "Gelen ödemeyi dekontuyla girin. Muhasebe teyit edene kadar “teyit bekliyor” olarak dosyada ve Para Trafiği’nde uyarı verir.",
    yol: "/kokpit/hizli-veri-girisi/para-trafigi",
    aktif: true,
  },
  { anahtar: "masraf", renk: "#ef6a5b", ad: "Masraf Kaydet", aciklama: "Masraf belgesini yükleyip dosyaya işleme.", yol: "#", aktif: false },
  { anahtar: "haciz", renk: "#4a5fc1", ad: "Haciz Raporu Kaydet", aciklama: "Saha haciz raporunu hızlıca girme.", yol: "#", aktif: false },
];

export default async function HizliVeriGirisiSayfasi() {
  const k = await mevcutKullanici();
  if (!k) redirect("/kokpit");
  const bekleyen = await prisma.gelenOdemeKaydi.count({ where: { durum: "TEYIT_BEKLIYOR" } });
  return (
    <div className="pt-3">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Hızlı Veri Girişi</h1>
      <p className="mb-6 text-sm text-white/55">Dosyayı açmadan, tek kapıdan giriş. Girilen her kayıt gerekiyorsa teyit bekler, dosyada ve ilgili listede uyarı olarak görünür.</p>
      <div className="flex flex-col gap-3">
        {GIRISLER.map((g) =>
          g.aktif ? (
            <Link key={g.anahtar} href={g.yol} className="glass block rounded-2xl border-l-4 p-5 transition-colors hover:bg-white/[0.06]" style={{ borderLeftColor: g.renk }}>
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">{g.ad}</p>
                {bekleyen > 0 && g.anahtar === "para-trafigi" && <span className="rounded-full bg-[#f2b04c]/25 px-2 py-0.5 text-xs font-medium text-[#f2b04c]">{bekleyen} teyit bekliyor</span>}
              </div>
              <p className="mt-1 text-sm text-white/55">{g.aciklama}</p>
            </Link>
          ) : (
            <div key={g.anahtar} className="glass rounded-2xl border-l-4 p-5 opacity-50" style={{ borderLeftColor: g.renk }}>
              <div className="flex items-center gap-2">
                <p className="font-medium text-white">{g.ad}</p>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/50">Yakında</span>
              </div>
              <p className="mt-1 text-sm text-white/40">{g.aciklama}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
