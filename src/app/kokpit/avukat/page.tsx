import Link from "next/link";
import { redirect } from "next/navigation";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";

const GRUPLAR = [
  {
    baslik: "Haciz Artçıları",
    renk: "#e8a33d",
    ogeler: [
      { ad: "Haciz Raporu Ver", aciklama: "Haciz sonrası avukat raporu: tutanak, protokol, tahsilat ve avukat görüşü.", yol: "/kokpit/haciz-artcilari/yeni" },
      { ad: "Haciz Raporları", aciklama: "Verilmiş haciz raporlarının listesi ve PDF çıktıları.", yol: "/kokpit/haciz-artcilari" },
      { ad: "Masraf Ver", aciklama: "Haciz için dosyaya masraf/avans kaydı gir (dosya cari hesabına işlenir).", yol: "/kokpit/avukat/haciz-masraf-ver" },
    ],
  },
  {
    baslik: "Duruşma Artçıları",
    renk: "#e5373d",
    ogeler: [
      { ad: "Duruşma Artçıları", aciklama: "Yaklaşan ve yeni geçen duruşmalar; duruşma sonrası yapılacak işler için iş emri ver.", yol: "/kokpit/avukat/durusma-artcilari" },
    ],
  },
  {
    baslik: "Dilekçe",
    renk: "#8b6cf0",
    ogeler: [
      { ad: "Dilekçe Yönetimi", aciklama: "Taslak ve gönderilen dilekçeler; iş emri ile hazırlatma/işleme, UYAP evrak no ve sonraki adım tarihi.", yol: "/kokpit/avukat/dilekce-yonetimi" },
    ],
  },
];

export default async function AvukatSayfasi() {
  if (!(await modulErisimiVarMi("avukat"))) redirect("/kokpit");
  return (
    <div className="pt-3">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">Avukat</h1>
      <div className="flex flex-col gap-6">
        {GRUPLAR.map((g) => (
          <section key={g.baslik}>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">{g.baslik}</h2>
            <div className="flex flex-col gap-3">
              {g.ogeler.map((o) => (
                <Link key={o.yol} href={o.yol} className="glass block rounded-2xl border-l-4 p-5 transition-colors hover:bg-white/[0.06]" style={{ borderLeftColor: g.renk }}>
                  <p className="font-medium text-white">{o.ad}</p>
                  <p className="mt-1 text-sm text-white/55">{o.aciklama}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
