import Link from "next/link";
import { acikHukukiMudahaleleriListele } from "@/modules/dava-dosyasi/lib/queries";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { avukatlariListele } from "@/modules/musteri/lib/queries";
import { Girdi, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

const ONCELIK_RENK: Record<string, string> = {
  acil: "bg-[var(--danger-soft)] text-[#ff7a70]",
  yuksek: "bg-[#f5c451]/15 text-[#f5c451]",
};

// "Bu dosyada avukat olarak ne yapmalıyım?" sorusuna, TÜM dosyalar
// genelinde cevap veren calisma ekrani - bkz. ARCHITECTURE.md "Avukat
// Sapkasi". Ayri bir model degil, HukukiMudahale kayitlarinin genel
// listesi.
export default async function AvukatSapkasiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string; avukat?: string; oncelik?: string; tumDurumlar?: string }>;
}) {
  const params = await searchParams;
  const tumDurumlar = params.tumDurumlar === "1";

  const [mudahaleler, avukatlar, oncelikler] = await Promise.all([
    acikHukukiMudahaleleriListele({
      arama: params.arama,
      sorumluAvukatId: params.avukat,
      oncelikKod: params.oncelik,
      tumDurumlar,
    }),
    avukatlariListele(),
    secenekleriGetir("hukuki_mudahale_onceligi"),
  ]);

  const simdi = new Date();

  return (
    <div className="pt-3">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Avukat Şapkası</h1>
        <p className="mt-1 text-sm text-white/55">
          Dosyalarda avukat olarak aktif hukuki müdahale gerektiren işler.
        </p>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <Girdi
          type="search"
          name="arama"
          placeholder="Müdahale, dosya, müvekkil ara…"
          defaultValue={params.arama}
          className="max-w-xs"
        />
        <Secim name="avukat" defaultValue={params.avukat ?? ""} className="max-w-[12rem]">
          <option value="">Tüm avukatlar</option>
          {avukatlar.map((a) => (
            <option key={a.id} value={a.id}>
              {a.adSoyad}
            </option>
          ))}
        </Secim>
        <Secim name="oncelik" defaultValue={params.oncelik ?? ""} className="max-w-[10rem]">
          <option value="">Tüm öncelikler</option>
          {oncelikler.map((o) => (
            <option key={o.id} value={o.kod}>
              {o.etiket}
            </option>
          ))}
        </Secim>
        <label className="flex items-center gap-2 text-sm text-white/60">
          <input type="checkbox" name="tumDurumlar" value="1" defaultChecked={tumDurumlar} className="h-4 w-4 rounded [accent-color:var(--accent)]" />
          Tamamlanan/iptal edilenler dahil
        </label>
        <Dugme type="submit" varyant="ikincil">
          Filtrele
        </Dugme>
      </form>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Müdahale</th>
              <th className="px-4 py-3 font-medium">Dava Dosyası</th>
              <th className="px-4 py-3 font-medium">Müvekkil</th>
              <th className="px-4 py-3 font-medium">Sorumlu Avukat</th>
              <th className="px-4 py-3 font-medium">Son Tarih</th>
              <th className="px-4 py-3 font-medium">Öncelik</th>
              <th className="px-4 py-3 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody>
            {mudahaleler.map((mudahale) => {
              const gecikmisMi =
                mudahale.sonTarih &&
                mudahale.sonTarih < simdi &&
                (mudahale.durum === "BEKLEMEDE" || mudahale.durum === "DEVAM_EDIYOR");

              return (
                <tr key={mudahale.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/kokpit/dava-dosyalari/${mudahale.davaDosyasi.id}`}
                      className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                    >
                      {mudahale.baslik}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    <Link
                      href={`/kokpit/dava-dosyalari/${mudahale.davaDosyasi.id}`}
                      className="hover:text-[#6db8ff] hover:underline"
                    >
                      {mudahale.davaDosyasi.dosyaNo ?? mudahale.davaDosyasi.konu}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {mudahale.davaDosyasi.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/60">{mudahale.sorumluAvukat?.adSoyad ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60">
                    {mudahale.sonTarih ? (
                      <span className="whitespace-nowrap">
                        {tarihFormatlayici.format(mudahale.sonTarih)}
                        {gecikmisMi && (
                          <span className="ml-2 rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-[10px] font-medium text-[#ff7a70]">
                            Gecikti
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {mudahale.oncelik ? (
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${ONCELIK_RENK[mudahale.oncelik.kod] ?? "bg-white/[0.06] text-white/60"}`}
                      >
                        {mudahale.oncelik.etiket}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                      {mudahale.durum === "BEKLEMEDE"
                        ? "Beklemede"
                        : mudahale.durum === "DEVAM_EDIYOR"
                          ? "Devam Ediyor"
                          : mudahale.durum === "TAMAMLANDI"
                            ? "Tamamlandı"
                            : "İptal Edildi"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {mudahaleler.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
