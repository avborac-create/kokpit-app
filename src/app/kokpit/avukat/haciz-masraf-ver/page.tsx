import Link from "next/link";
import { redirect } from "next/navigation";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { MasrafFormu } from "@/modules/dava-dosyasi/components/masraf-formu";
import { hacizMasrafiVer } from "@/modules/avukat/lib/masraf-ver-actions";
import { dosyaSecenekleriGetir } from "@/modules/avukat/lib/dosya-secenekleri";

export default async function HacizMasrafVerSayfasi() {
  if (!(await modulErisimiVarMi("avukat"))) redirect("/kokpit");
  const dosyalar = await dosyaSecenekleriGetir(true);
  return (
    <div className="pt-3">
      <Link href="/kokpit/avukat" className="text-sm text-white/50 hover:text-white">← Avukat</Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold tracking-tight text-white">Haciz — Masraf Ver</h1>
      <p className="mb-4 text-sm text-white/55">İcra dosyasını seçin; masraf dosyanın cari hesabına işlenir ve dosya sayfasına yönlendirilirsiniz.</p>
      <MasrafFormu action={hacizMasrafiVer} dosyaSecimi={{ dosyalar }} />
    </div>
  );
}
