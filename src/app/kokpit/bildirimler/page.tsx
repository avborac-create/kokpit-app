import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { BILDIRIM_TURLERI } from "@/core/bildirim/tur-bildirimi";
import { TurAyarlari } from "./tur-ayarlari";
import { BildirimAyari } from "./bildirim-ayari";

export default async function BildirimlerSayfasi() {
  const k = await mevcutKullanici();
  const ben = k ? await prisma.kullanici.findUnique({ where: { id: k.kullaniciId }, select: { bildirimKapali: true } }) : null;
  return (
    <div className="mx-auto max-w-2xl pt-3">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Bildirimler</h1>
      <p className="mb-5 mt-1 text-sm text-white/55">Yeni iş atandığında ya da size bir şey yazıldığında telefonunuza/bilgisayarınıza bildirim gelsin.</p>
      <BildirimAyari />
      <TurAyarlari turler={BILDIRIM_TURLERI} kapali={ben?.bildirimKapali ?? []} />
    </div>
  );
}
