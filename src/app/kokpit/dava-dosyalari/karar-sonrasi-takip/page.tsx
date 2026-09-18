import Link from "next/link";
import { kararSonrasiTakipListele } from "@/modules/dava-dosyasi/lib/queries";
import { avukatlariListele } from "@/modules/musteri/lib/queries";
import { DOSYA_EVRESI_ETIKETLERI } from "@/modules/dava-dosyasi/lib/sabitler";
import { Girdi, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR");

// "Bu dosya şu an nerede, ne bekleniyor?" sorusuna cevap veren calisma
// ekrani - bkz. ARCHITECTURE.md "Karar Sonrasi Takip". Ayri bir model
// DEGIL: dosyaEvresi atanmis TUM DavaDosyasi kayitlarinin filtrelenmis
// gorunumu.
export default async function KararSonrasiTakipSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ arama?: string; avukat?: string; tumEvreler?: string }>;
}) {
  const params = await searchParams;
  const tumEvreler = params.tumEvreler === "1";

  const [dosyalar, avukatlar] = await Promise.all([
    kararSonrasiTakipListele({ arama: params.arama, sorumluAvukatId: params.avukat, tumEvreler }),
    avukatlariListele(),
  ]);

  const bugunBaslangici = new Date();
  bugunBaslangici.setHours(0, 0, 0, 0);

  return (
    <div className="pt-3">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Karar Sonrası Takip</h1>
        <p className="mt-1 text-sm text-white/55">
          Dosyaların hukuki süreçte hangi evrede olduğu ve sıradaki kontrol noktası.
        </p>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <Girdi
          type="search"
          name="arama"
          placeholder="Dosya, müvekkil ara…"
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
        <label className="flex items-center gap-2 text-sm text-white/60">
          <input
            type="checkbox"
            name="tumEvreler"
            value="1"
            defaultChecked={tumEvreler}
            className="h-4 w-4 rounded [accent-color:var(--accent)]"
          />
          Kesinleşmişler dahil
        </label>
        <Dugme type="submit" varyant="ikincil">
          Filtrele
        </Dugme>
      </form>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Dava Dosyası</th>
              <th className="px-4 py-3 font-medium">Müvekkil</th>
              <th className="px-4 py-3 font-medium">Dosya Evresi</th>
              <th className="px-4 py-3 font-medium">Sonraki Kontrol</th>
              <th className="px-4 py-3 font-medium">Sonraki Kontrol Sorusu</th>
              <th className="px-4 py-3 font-medium">Sorumlu Avukat</th>
            </tr>
          </thead>
          <tbody>
            {dosyalar.map((dosya) => {
              const gecikmisMi = dosya.sonrakiKontrolTarihi && dosya.sonrakiKontrolTarihi < bugunBaslangici;

              return (
                <tr key={dosya.id} className="border-t border-white/[0.06] hover:bg-white/[0.04]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/kokpit/dava-dosyalari/${dosya.id}`}
                      className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                    >
                      {dosya.dosyaNo ?? `KP-${String(dosya.kayitNo).padStart(4, "0")}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {dosya.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                      {dosya.dosyaEvresi ? DOSYA_EVRESI_ETIKETLERI[dosya.dosyaEvresi] : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {dosya.sonrakiKontrolTarihi ? (
                      <span className="whitespace-nowrap">
                        {tarihFormatlayici.format(dosya.sonrakiKontrolTarihi)}
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
                  <td className="px-4 py-3 text-white/60">{dosya.sonrakiKontrolSorusu ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60">{dosya.sorumluAvukat?.adSoyad ?? "—"}</td>
                </tr>
              );
            })}
            {dosyalar.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
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
