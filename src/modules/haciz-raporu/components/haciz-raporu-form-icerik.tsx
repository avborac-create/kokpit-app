"use client";

import { useState } from "react";
import Link from "next/link";
import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import type { icraDosyalariniListele, tahsilatKanallariniListele } from "@/modules/haciz-raporu/lib/queries";
import { HACIZ_ISLEMI_DURUMLARI, TEMINAT_MUVAFAKAT_DURUMLARI } from "@/modules/haciz-raporu/lib/sabitler";
import { hacizRaporuOlustur } from "@/modules/haciz-raporu/lib/actions";
import { DosyaYuklemeAlani } from "./dosya-yukleme-alani";
import { HacizGonderButonu } from "./haciz-gonder-butonu";

type Props = {
  icraDosyalari: Awaited<ReturnType<typeof icraDosyalariniListele>>;
  tahsilatKanallari: Awaited<ReturnType<typeof tahsilatKanallariniListele>>;
};

export function HacizRaporuFormIcerik({ icraDosyalari, tahsilatKanallari }: Props) {
  // Uc dosya yukleme alanindan HERHANGI birinde hala devam eden bir
  // yukleme varsa "Gonder" pasiflesir (bkz. HacizGonderButonu) - aksi
  // halde zayif mobil sinyalde tamamlanmamis bir yukleme sessizce
  // kaybolabilirdi.
  const [yukleniyorHaritasi, setYukleniyorHaritasi] = useState<Record<string, boolean>>({});
  const herhangiBiriYukleniyor = Object.values(yukleniyorHaritasi).some(Boolean);

  return (
    <form action={hacizRaporuOlustur} className="max-w-xl">
      <Alan>
        <Etiket htmlFor="davaDosyasiId">İcra Dosyası</Etiket>
        <Secim id="davaDosyasiId" name="davaDosyasiId" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {icraDosyalari.map((dosya) => (
            <option key={dosya.id} value={dosya.id}>
              KP-{String(dosya.kayitNo).padStart(4, "0")}
              {dosya.dosyaNo ? ` · ${dosya.dosyaNo}` : ""} — {dosya.konu}
              {dosya.icraAltTuru ? ` (${dosya.icraAltTuru.etiket})` : ""}
              {dosya.muvekkiller.length > 0 ? ` — ${dosya.muvekkiller[0].musteri.adSoyadUnvan}` : ""}
            </option>
          ))}
        </Secim>
        <p className="mt-1 text-xs text-white/35">
          Dosya listede yoksa{" "}
          <Link href="/kokpit/dava-dosyalari/yeni" target="_blank" className="text-[#6db8ff] hover:underline">
            önce buradan İcra Dosyası olarak oluşturun
          </Link>
          , sonra bu sayfayı yenileyip seçin.
        </p>
      </Alan>

      <Alan>
        <Etiket htmlFor="hacizTarihi">Haciz Tarihi</Etiket>
        <Girdi id="hacizTarihi" name="hacizTarihi" type="date" required />
      </Alan>

      <Alan>
        <Etiket htmlFor="islemYapilanBorclular">İşlem Yapılan Borçlular</Etiket>
        <Girdi id="islemYapilanBorclular" name="islemYapilanBorclular" required />
      </Alan>

      <Alan>
        <Etiket htmlFor="irtibatNumaralari">İrtibat Numaraları (her satıra bir numara)</Etiket>
        <MetinAlani id="irtibatNumaralari" name="irtibatNumaralari" rows={3} />
      </Alan>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Alan>
          <Etiket htmlFor="muhafazaDurumu">Muhafaza</Etiket>
          <Secim id="muhafazaDurumu" name="muhafazaDurumu" required defaultValue="">
            <option value="" disabled>
              Seçiniz…
            </option>
            {HACIZ_ISLEMI_DURUMLARI.map((d) => (
              <option key={d.deger} value={d.deger}>
                {d.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="istihkakDurumu">İstihkak</Etiket>
          <Secim id="istihkakDurumu" name="istihkakDurumu" required defaultValue="">
            <option value="" disabled>
              Seçiniz…
            </option>
            {HACIZ_ISLEMI_DURUMLARI.map((d) => (
              <option key={d.deger} value={d.deger}>
                {d.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="kiymetTakdiriDurumu">Kıymet Takdiri</Etiket>
          <Secim id="kiymetTakdiriDurumu" name="kiymetTakdiriDurumu" required defaultValue="">
            <option value="" disabled>
              Seçiniz…
            </option>
            {HACIZ_ISLEMI_DURUMLARI.map((d) => (
              <option key={d.deger} value={d.deger}>
                {d.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      </div>

      <Alan>
        <Etiket htmlFor="teminatIadesineMuvafakat">Teminat İadesine Muvafakat</Etiket>
        <Secim id="teminatIadesineMuvafakat" name="teminatIadesineMuvafakat" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {TEMINAT_MUVAFAKAT_DURUMLARI.map((d) => (
            <option key={d.deger} value={d.deger}>
              {d.etiket}
            </option>
          ))}
        </Secim>
      </Alan>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="tahsilatMiktari">Tahsilat Miktarı (tahsilat yoksa 0)</Etiket>
          <Girdi id="tahsilatMiktari" name="tahsilatMiktari" type="number" step="0.01" min="0" required defaultValue="0" />
        </Alan>
        <Alan>
          <Etiket htmlFor="tahsilatKanaliId">Tahsilat Kanalı</Etiket>
          <Secim id="tahsilatKanaliId" name="tahsilatKanaliId" defaultValue="">
            <option value="">Seçiniz…</option>
            {tahsilatKanallari.map((k) => (
              <option key={k.id} value={k.id}>
                {k.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      </div>

      <Alan>
        <Etiket htmlFor="avukatGorusu">Avukat Görüşü</Etiket>
        <MetinAlani
          id="avukatGorusu"
          name="avukatGorusu"
          rows={4}
          placeholder="Dosyanın durumu ve müteakip işlemler hakkında görüşünüzü belirtebilirsiniz."
        />
      </Alan>

      <Alan>
        <Etiket htmlFor="protokolYapildiMi">Protokol</Etiket>
        <Secim id="protokolYapildiMi" name="protokolYapildiMi" defaultValue="evet">
          <option value="evet">Protokol Yapıldı</option>
          <option value="hayir">Protokol Yapılmadı</option>
        </Secim>
      </Alan>

      <Alan>
        <Etiket htmlFor="hacizTutanagi">Haciz Tutanağı (taranmış veya fotoğraflanmış, opsiyonel)</Etiket>
        <DosyaYuklemeAlani
          girdiId="hacizTutanagi"
          alanAdi="hacizTutanagi"
          accept="application/pdf,image/*"
          etiket="Taranmış PDF veya fotoğraf yükleyebilirsiniz."
          onYukleniyorDegisti={(v) => setYukleniyorHaritasi((h) => ({ ...h, tutanak: v }))}
        />
      </Alan>

      <Alan>
        <Etiket htmlFor="protokol">Protokol Belgesi (taranmış, opsiyonel)</Etiket>
        <DosyaYuklemeAlani
          girdiId="protokol"
          alanAdi="protokol"
          accept="application/pdf,image/*"
          etiket="Taranmış PDF veya fotoğraf yükleyebilirsiniz."
          onYukleniyorDegisti={(v) => setYukleniyorHaritasi((h) => ({ ...h, protokol: v }))}
        />
      </Alan>

      <Alan>
        <Etiket htmlFor="fotograf">Mahalde Çekilen Fotoğraflar (opsiyonel, birden fazla seçilebilir)</Etiket>
        <DosyaYuklemeAlani
          girdiId="fotograf"
          alanAdi="fotograf"
          accept="image/*"
          coklu
          etiket="Telefon kamerasıyla doğrudan çekip ekleyebilirsiniz."
          onYukleniyorDegisti={(v) => setYukleniyorHaritasi((h) => ({ ...h, fotograf: v }))}
        />
      </Alan>

      <div className="flex items-center gap-2">
        <HacizGonderButonu dosyaYuklemeDevamEdiyorMu={herhangiBiriYukleniyor} />
        <Link href="/kokpit/haciz-artcilari">
          <Dugme type="button" varyant="ikincil">
            Vazgeç
          </Dugme>
        </Link>
      </div>
    </form>
  );
}
