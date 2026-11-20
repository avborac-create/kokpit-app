import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { TelefonErisimKararDugmeleri } from "@/modules/musteri/components/telefon-erisim-karar-dugmeleri";

const tarihSaat = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function TelefonErisimleriSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) redirect("/kokpit");

  const simdi = new Date();
  const talepler = await prisma.telefonErisimTalebi.findMany({
    orderBy: { talepZamani: "desc" },
    take: 100,
    include: { musteri: { select: { id: true, adSoyadUnvan: true } } },
  });
  const kisiIdleri = [...new Set(talepler.map((t) => t.talepEdenId))];
  const kisiler = await prisma.kullanici.findMany({ where: { id: { in: kisiIdleri } }, select: { id: true, adSoyad: true } });
  const ad = (id: string) => kisiler.find((k) => k.id === id)?.adSoyad ?? "—";

  const bekleyen = talepler.filter((t) => t.durum === "BEKLIYOR");
  const aktif = talepler.filter((t) => t.durum === "ONAYLANDI" && t.bitisZamani && t.bitisZamani > simdi);
  const gecmis = talepler.filter((t) => !bekleyen.includes(t) && !aktif.includes(t)).slice(0, 30);

  const Satir = ({ t, sag }: { t: (typeof talepler)[number]; sag?: React.ReactNode }) => (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
      <div>
        <Link href={`/kokpit/musteriler/${t.musteri.id}`} className="font-medium text-white hover:text-[#6db8ff] hover:underline">
          {t.musteri.adSoyadUnvan}
        </Link>
        <p className="text-xs text-white/50">
          {ad(t.talepEdenId)} · talep: {tarihSaat.format(t.talepZamani)}
          {t.durum === "ONAYLANDI" && t.bitisZamani ? ` · bitiş: ${tarihSaat.format(t.bitisZamani)}` : ""}
          {t.durum === "REDDEDILDI" ? " · reddedildi" : ""}
        </p>
      </div>
      {sag}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Telefon Erişimleri</h1>
      <p className="mb-6 text-sm text-white/50">
        Müvekkil telefon numaraları yönetici dışındaki kullanıcılara maskeli görünür. Personel &quot;Erişim iste&quot; der, siz onaylarsanız 24 saat boyunca görür.
      </p>

      <h2 className="mb-2 text-lg font-semibold text-white">Onay bekleyenler ({bekleyen.length})</h2>
      <div className="glass mb-8 divide-y divide-white/[0.06] rounded-2xl">
        {bekleyen.length === 0 && <p className="px-4 py-4 text-sm text-white/40">Bekleyen talep yok.</p>}
        {bekleyen.map((t) => (
          <Satir key={t.id} t={t} sag={<TelefonErisimKararDugmeleri talepId={t.id} tur="karar" />} />
        ))}
      </div>

      <h2 className="mb-2 text-lg font-semibold text-white">Şu an açık erişimler ({aktif.length})</h2>
      <div className="glass mb-8 divide-y divide-white/[0.06] rounded-2xl">
        {aktif.length === 0 && <p className="px-4 py-4 text-sm text-white/40">Açık erişim yok.</p>}
        {aktif.map((t) => (
          <Satir key={t.id} t={t} sag={<TelefonErisimKararDugmeleri talepId={t.id} tur="kapat" />} />
        ))}
      </div>

      <h2 className="mb-2 text-lg font-semibold text-white">Geçmiş</h2>
      <div className="glass divide-y divide-white/[0.06] rounded-2xl">
        {gecmis.length === 0 && <p className="px-4 py-4 text-sm text-white/40">Kayıt yok.</p>}
        {gecmis.map((t) => (
          <Satir key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}
