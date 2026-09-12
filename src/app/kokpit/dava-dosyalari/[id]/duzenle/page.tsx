import { notFound } from "next/navigation";
import { davaDosyasiGetir } from "@/modules/dava-dosyasi/lib/queries";
import { davaDosyasiGuncelle } from "@/modules/dava-dosyasi/lib/actions";
import { DavaDosyasiFormu } from "@/modules/dava-dosyasi/components/dava-dosyasi-formu";

export default async function DavaDosyasiDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dosya = await davaDosyasiGetir(id);
  if (!dosya) notFound();

  return (
    <div className="pt-3">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">{dosya.konu} — Düzenle</h1>
      <DavaDosyasiFormu
        action={davaDosyasiGuncelle.bind(null, id)}
        dosya={dosya}
        gonderButonuMetni="Kaydet"
      />
    </div>
  );
}
