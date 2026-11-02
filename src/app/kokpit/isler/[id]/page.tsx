import { notFound } from "next/navigation";
import Link from "next/link";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { IsDetayi } from "./is-detayi";
import { isDetayiYukle } from "../detay-veri";

export default async function IsSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = await mevcutKullanici();
  const veri = await isDetayiYukle(id, k?.kullaniciId ?? "");
  if (!veri) notFound();

  return (
    <div className="mx-auto max-w-3xl pt-3">
      <Link href="/kokpit/isler" className="text-sm text-white/55 hover:text-white">
        ← Görevler
      </Link>
      <IsDetayi benimId={k?.kullaniciId ?? ""} kisiler={veri.kisiler} is={veri.is} />
    </div>
  );
}
