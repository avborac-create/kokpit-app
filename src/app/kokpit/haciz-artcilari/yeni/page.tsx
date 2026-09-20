import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { hacizAvukatiMi } from "@/core/auth/yetki";
import { HacizRaporuFormu } from "@/modules/haciz-raporu/components/haciz-raporu-formu";

export default async function YeniHacizRaporuSayfasi() {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !hacizAvukatiMi(kullanici.rol)) {
    redirect("/kokpit/haciz-artcilari");
  }

  return (
    <div className="pt-3">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">Yeni Haciz Raporu</h1>
      <HacizRaporuFormu />
    </div>
  );
}
