import Link from "next/link";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { sistemYoneticisiMi } from "@/core/auth/yetki";
import { ParaTalebiKarti } from "@/modules/dava-dosyasi/components/ekonomi/para-talebi-karti";
import { kullanilmisBankalar, paraTalebiVerileri } from "@/modules/dava-dosyasi/lib/hesap-ozeti-sorgu";

export const dynamic = "force-dynamic";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export default async function IstenenParalarSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return null;
  const ben = await prisma.kullanici.findUnique({ where: { id: kullanici.kullaniciId }, select: { finansYetkilisiMi: true } });
  const hepsiniGorur = !!ben?.finansYetkilisiMi || sistemYoneticisiMi(kullanici.rol);

  const [talepler, bankalar] = await Promise.all([
    paraTalebiVerileri({
      sonuc: "GONDERILDI",
      ...(hepsiniGorur ? {} : { OR: [{ sorumluId: kullanici.kullaniciId }, { olusturanId: kullanici.kullaniciId }] }),
    }),
    kullanilmisBankalar(),
  ]);
  const bekleyen = talepler.filter((t) => !t.geldiMi);
  const eksik = talepler.filter((t) => t.geldiMi && (!t.geldiTarihi || !t.bankaHesabi));
  const gelen = talepler.filter((t) => t.geldiMi && t.geldiTarihi && t.bankaHesabi).slice(0, 15);
  const bekleyenToplam = bekleyen.reduce((t, x) => t + x.toplam, 0);

  return (
    <div className="max-w-5xl pt-3">
      <Link href="/kokpit/finans" className="text-sm text-[#6db8ff] hover:underline">‹ Finans / Muhasebe</Link>
      <h1 className="mb-1 mt-1 text-2xl font-semibold tracking-tight text-white">Müvekkilden İstenen Paralar</h1>
      <p className="mb-5 max-w-2xl text-sm text-white/50">
        {hepsiniGorur ? "Büronun tüm müvekkillerinden istenen ödemeler." : "Sizin müvekkillerden istediğiniz ödemeler."} Parayı isteyen kişi, paranın gelip gelmediğini takip etmekten sorumludur.
        Finans yetkilisi banka hareketine bakıp &quot;Para geldi&quot; teyidini verir.
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl p-4"><p className="text-xs text-white/50">Gelmesi beklenen</p><p className="text-xl font-semibold text-white">{para.format(bekleyenToplam)}</p><p className="text-xs text-white/45">{bekleyen.length} talep</p></div>
        <div className="glass rounded-2xl p-4"><p className="text-xs text-white/50">En uzun bekleyen</p><p className="text-xl font-semibold text-white">{Math.max(0, ...bekleyen.map((t) => t.bekleyenGun ?? 0))} gün</p></div>
        <div className="glass rounded-2xl p-4"><p className="text-xs text-white/50">Eksik bilgili teyit</p><p className="text-xl font-semibold text-white">{eksik.length}</p></div>
      </div>

      <Bolum baslik="Gelmesi beklenenler" bos="Bekleyen talep yok.">
        {bekleyen.map((t) => <ParaTalebiKarti key={t.id} veri={t} musteriGoster bankalar={bankalar} />)}
      </Bolum>
      {eksik.length > 0 && (
        <Bolum baslik="Bilgisi eksik kalanlar" bos="">
          {eksik.map((t) => <ParaTalebiKarti key={t.id} veri={t} musteriGoster bankalar={bankalar} />)}
        </Bolum>
      )}
      <Bolum baslik="Son gelenler" bos="Henüz teyitli ödeme yok.">
        {gelen.map((t) => <ParaTalebiKarti key={t.id} veri={t} musteriGoster bankalar={bankalar} />)}
      </Bolum>
    </div>
  );
}

function Bolum({ baslik, bos, children }: { baslik: string; bos: string; children: React.ReactNode[] }) {
  return (
    <section className="mb-7">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/65">{baslik}</h2>
      <div className="space-y-3">{children.length > 0 ? children : <p className="text-sm text-white/40">{bos}</p>}</div>
    </section>
  );
}
