import Link from "next/link";
import { redirect } from "next/navigation";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { prisma } from "@/core/db/prisma";
import { dosyaEtiketiYaz } from "@/modules/dava-dosyasi/lib/cari-sistem";

export const dynamic = "force-dynamic";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihYaz = new Intl.DateTimeFormat("tr-TR");

// Buro geneli: 109 - Iade Edilecek Tutarlar hesabinda muvekkile geri odenmeyi bekleyen tutarlar (dosya bazinda).
export default async function IadeBekleyenlerSayfasi() {
  if (!(await modulErisimiVarMi("finans"))) redirect("/kokpit");

  const hareketler = await prisma.cariHareketi.findMany({
    where: { hesap: { iadeHesabiMi: true }, dosyaId: { not: null }, dosya: { ekonomiDisi: false } },
    select: {
      musteriId: true,
      dosyaId: true,
      yon: true,
      tutar: true,
      tarih: true,
      musteri: { select: { adSoyadUnvan: true } },
      dosya: { select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, anaDosya: { select: { kayitNo: true } } } },
    },
  });

  type Satir = { musteriId: string; musteri: string; dosyaId: string; dosya: string; bekleyen: number; ilkTarih: Date };
  const gruplar = new Map<string, Satir>();
  for (const h of hareketler) {
    if (!h.dosya || !h.dosyaId) continue;
    const anahtar = `${h.musteriId}|${h.dosyaId}`;
    const s = gruplar.get(anahtar) ?? { musteriId: h.musteriId, musteri: h.musteri.adSoyadUnvan, dosyaId: h.dosyaId, dosya: dosyaEtiketiYaz(h.dosya), bekleyen: 0, ilkTarih: h.tarih };
    s.bekleyen += (h.yon === "ALACAK" ? 1 : -1) * Number(h.tutar);
    if (h.yon === "ALACAK" && h.tarih < s.ilkTarih) s.ilkTarih = h.tarih;
    gruplar.set(anahtar, s);
  }
  const satirlar = [...gruplar.values()]
    .map((s) => ({ ...s, bekleyen: Math.round(s.bekleyen * 100) / 100 }))
    .filter((s) => s.bekleyen > 0.001)
    .sort((a, b) => a.ilkTarih.getTime() - b.ilkTarih.getTime());
  const toplam = satirlar.reduce((t, s) => t + s.bekleyen, 0);

  return (
    <div className="mx-auto max-w-4xl pt-3">
      <Link href="/kokpit/finans" className="text-sm text-[#6db8ff] hover:underline">‹ Finans / Muhasebe</Link>
      <h1 className="mb-1 mt-1 text-2xl font-semibold tracking-tight text-white">İadesi Bekleyen Tutarlar</h1>
      <p className="mb-5 max-w-2xl text-sm text-white/50">
        Dosyalarda artan ve müvekkile geri ödenmesi gereken paralar (109 - İade Edilecek Tutarlar). Parayı gönderince dosyanın Ekonomi sekmesinde
        109 hesabına <b>İade Edildi</b> kaydı girin; satır buradan düşer.
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="glass rounded-2xl p-4"><p className="text-xs text-white/50">İade edilecek toplam</p><p className="text-xl font-semibold text-[#32d74b]">{para.format(toplam)}</p></div>
        <div className="glass rounded-2xl p-4"><p className="text-xs text-white/50">Bekleyen dosya</p><p className="text-xl font-semibold text-white">{satirlar.length}</p></div>
      </div>

      {satirlar.length === 0 ? (
        <p className="text-sm text-white/40">İadesi bekleyen tutar yok.</p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Müvekkil</th>
                <th className="px-4 py-3 font-medium">Dosya</th>
                <th className="px-4 py-3 font-medium">Bekleme başlangıcı</th>
                <th className="px-4 py-3 text-right font-medium">İade edilecek</th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s) => (
                <tr key={`${s.musteriId}|${s.dosyaId}`} className="border-t border-white/[0.06]">
                  <td className="px-4 py-3 text-white/85">{s.musteri}</td>
                  <td className="px-4 py-3">
                    <Link href={`/kokpit/dava-dosyalari/${s.dosyaId}?sekme=ekonomi`} className="text-[#6db8ff] hover:underline">{s.dosya}</Link>
                  </td>
                  <td className="px-4 py-3 text-white/60">{tarihYaz.format(s.ilkTarih)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-[#32d74b]">{para.format(s.bekleyen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
