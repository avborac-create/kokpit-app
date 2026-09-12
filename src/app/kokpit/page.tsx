import Link from "next/link";
import { Dugme } from "@/core/ui/button";

export default function KokpitAnaSayfa() {
  return (
    <div className="glass mt-3 rounded-3xl p-8">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">Kokpit</h1>
      <p className="mb-6 text-white/55">Sol menüden bir modül seçin.</p>
      <Link href="/kokpit/musteriler">
        <Dugme>Müvekkil Veritabanına Git</Dugme>
      </Link>
    </div>
  );
}
