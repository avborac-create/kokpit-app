import Link from "next/link";
import {
  cmkDosyalariniListele,
  cmkBirimleriListele,
  cmkOzetSayilariniHesapla,
} from "@/modules/cmk-dosyalari/lib/queries";
import { DOSYA_DURUMU_ETIKETLERI, CMK_DOSYA_DURUMLARI } from "@/modules/cmk-dosyalari/lib/sabitler";
import { CMKOzetSeridi } from "@/modules/cmk-dosyalari/components/cmk-ozet-seridi";
import { Dugme } from "@/core/ui/button";
import { Girdi, Secim } from "@/core/ui/form";
import type { CMKDosyaDurumu } from "@prisma/client";

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
const tarihSaatFormatlayici = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Ana ekran: arama + filtreler + liste, bilerek tek sayfa (bkz.
// ARCHITECTURE.md "CMK Dosyalari" - sade, hizli, gunluk kullanim odakli).
export default async function CMKDosyalariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    arama?: string;
    durum?: string;
    birim?: string;
    durusmaTarihi?: string;
    sonrakiKontrolTarihi?: string;
    vurgu?: string;
  }>;
}) {
  const params = await searchParams;
  const dosyaDurumu = params.durum && params.durum in DOSYA_DURUMU_ETIKETLERI ? (params.durum as CMKDosyaDurumu) : undefined;

  const [dosyalar, birimler, ozet] = await Promise.all([
    cmkDosyalariniListele({
      arama: params.arama,
      dosyaDurumu,
      birim: params.birim,
      durusmaTarihi: params.durusmaTarihi,
      sonrakiKontrolTarihiKadar: params.sonrakiKontrolTarihi,
    }),
    cmkBirimleriListele(),
    cmkOzetSayilariniHesapla(),
  ]);

  const simdi = new Date();
  const yediGunSonra = new Date(simdi);
  yediGunSonra.setDate(yediGunSonra.getDate() + 7);
  const bugunBaslangici = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());

  return (
    <div className="pt-3">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">CMK Dosyaları</h1>
        <Link href="/kokpit/cmk-dosyalari/yeni">
          <Dugme>+ Yeni CMK Dosyası</Dugme>
        </Link>
      </div>

      <CMKOzetSeridi yaklasanDurusma={ozet.yaklasanDurusma} gecikmisKontrol={ozet.gecikmisKontrol} />

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <Girdi
          type="search"
          name="arama"
          placeholder="Müvekkil, dosya no, birim, suç ara…"
          defaultValue={params.arama}
          className="max-w-xs"
        />
        <Secim name="durum" defaultValue={params.durum ?? ""} className="max-w-[12rem]">
          <option value="">Tüm durumlar</option>
          {CMK_DOSYA_DURUMLARI.map((s) => (
            <option key={s.deger} value={s.deger}>
              {s.etiket}
            </option>
          ))}
        </Secim>
        <Secim name="birim" defaultValue={params.birim ?? ""} className="max-w-[12rem]">
          <option value="">Tüm birimler</option>
          {birimler.map((birim) => (
            <option key={birim} value={birim}>
              {birim}
            </option>
          ))}
        </Secim>
        <div>
          <Girdi type="date" name="durusmaTarihi" defaultValue={params.durusmaTarihi} title="Duruşma tarihi" />
        </div>
        <div>
          <Girdi
            type="date"
            name="sonrakiKontrolTarihi"
            defaultValue={params.sonrakiKontrolTarihi}
            title="Sonraki kontrol — bu tarihe kadar"
          />
        </div>
        <Dugme type="submit" varyant="ikincil">
          Filtrele
        </Dugme>
        {(params.arama || params.durum || params.birim || params.durusmaTarihi || params.sonrakiKontrolTarihi) && (
          <Link href="/kokpit/cmk-dosyalari">
            <Dugme type="button" varyant="ikincil">
              Temizle
            </Dugme>
          </Link>
        )}
      </form>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">SMS</th>
              <th className="px-4 py-3 font-medium">CMK</th>
              <th className="px-4 py-3 font-medium">Müvekkil</th>
              <th className="px-4 py-3 font-medium">Suç</th>
              <th className="px-4 py-3 font-medium">Birim</th>
              <th className="px-4 py-3 font-medium">Dosya No</th>
              <th className="px-4 py-3 font-medium">Duruşma Tarihi</th>
              <th className="px-4 py-3 font-medium">Dosya Durumu</th>
              <th className="px-4 py-3 font-medium">Hüküm</th>
              <th className="px-4 py-3 font-medium">Ceza Miktarı</th>
              <th className="px-4 py-3 font-medium">Sonraki Kontrol</th>
            </tr>
          </thead>
          <tbody>
            {dosyalar.map((dosya) => {
              const durusmaGecmisMi = dosya.durusmaTarihi ? dosya.durusmaTarihi < simdi : false;
              const durusmaYaklasiyorMu = dosya.durusmaTarihi
                ? dosya.durusmaTarihi >= simdi && dosya.durusmaTarihi <= yediGunSonra
                : false;
              const kontrolGecikmisMi = dosya.sonrakiKontrolTarihi
                ? dosya.sonrakiKontrolTarihi < bugunBaslangici
                : false;

              return (
                <tr
                  key={dosya.id}
                  className={`border-t border-white/[0.06] hover:bg-white/[0.04] ${
                    dosya.id === params.vurgu ? "bg-[var(--accent-soft)]" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className={dosya.smsGonderilebilirMi ? "text-[#32d74b]" : "text-white/25"}>
                      {dosya.smsGonderilebilirMi ? "✓" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={dosya.cmkGorevlendirmeVarMi ? "text-[#32d74b]" : "text-white/25"}>
                      {dosya.cmkGorevlendirmeVarMi ? "✓" : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/kokpit/cmk-dosyalari/${dosya.id}/duzenle`}
                      className="font-medium text-white hover:text-[#6db8ff] hover:underline"
                    >
                      {dosya.adSoyad}
                    </Link>
                    {dosya.musteri && (
                      <p className="text-xs text-white/35">Müvekkil fihristinde bağlı</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/85">{dosya.suc}</td>
                  <td className="px-4 py-3 text-white/60">{dosya.birim}</td>
                  <td className="px-4 py-3 text-white/60">{dosya.dosyaNo}</td>
                  <td className="px-4 py-3 text-white/60">
                    {dosya.durusmaTarihi ? (
                      <span className="whitespace-nowrap">
                        {tarihSaatFormatlayici.format(dosya.durusmaTarihi)}
                        {durusmaYaklasiyorMu && (
                          <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[#6db8ff]">
                            Yaklaşıyor
                          </span>
                        )}
                        {durusmaGecmisMi && (
                          <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/40">
                            Geçmiş
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[#6db8ff]">
                      {DOSYA_DURUMU_ETIKETLERI[dosya.dosyaDurumu]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{dosya.hukum ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60">{dosya.cezaMiktari ?? "—"}</td>
                  <td className="px-4 py-3 text-white/60">
                    {dosya.sonrakiKontrolTarihi ? (
                      <span className="whitespace-nowrap">
                        {tarihFormatlayici.format(dosya.sonrakiKontrolTarihi)}
                        {kontrolGecikmisMi && (
                          <span className="ml-2 rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-[10px] font-medium text-[#ff7a70]">
                            Gecikti
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {dosyalar.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-white/40">
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
