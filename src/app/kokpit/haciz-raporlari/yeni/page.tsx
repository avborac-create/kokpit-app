import { HacizRaporuFormu } from "@/modules/haciz-raporu/components/haciz-raporu-formu";

export default function YeniHacizRaporuSayfasi() {
  return (
    <div className="pt-3">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">Yeni Haciz Raporu</h1>
      <HacizRaporuFormu />
    </div>
  );
}
