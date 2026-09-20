"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Girdi } from "@/core/ui/form";

type YuklemeDurumu = "yukleniyor" | "tamamlandi" | "hata";

type YuklenenDosya = {
  id: string;
  ad: string;
  mimeTipi: string;
  boyutBayt: number;
  durum: YuklemeDurumu;
  yuzde: number;
  url?: string;
  hataMesaji?: string;
};

// Haciz avukatlari sahada, cogunlukla mobil veriyle calisiyor - telefon
// kamerasi fotograflari kolayca birkac MB'a ulasir. Bu yuzden dosyalar
// bir Server Action'a GONDERILMEZ (Next.js'in 1MB'lik varsayilan govde
// siniri + Vercel'in kendi platform siniri bunu imkansiz kilardi) -
// secilir secilmez DOGRUDAN taraycidan Vercel Blob'a yuklenir (bkz.
// /api/haciz-raporu/blob-upload), ilerleme cubugu gosterilir, ve sadece
// SONUC url'i (kucuk bir metin) gizli input olarak asil forma eklenir.
// Boylece asil form gonderimi (hacizRaporuOlustur) hep kucuk/hizli kalir,
// zayif sinyalde bile guvenilir sekilde tamamlanir.
export function DosyaYuklemeAlani({
  alanAdi,
  etiket,
  accept,
  coklu = false,
  girdiId,
  onYukleniyorDegisti,
}: {
  alanAdi: string;
  etiket: string;
  accept: string;
  coklu?: boolean;
  girdiId: string;
  // Bu alanda su an devam eden bir yukleme olup olmadigi degistiginde
  // ust forma bildirir - form, TUM alanlar tamamlanmadan gonderilemesin
  // diye (bkz. haciz-raporu-form-icerik.tsx). Zayif mobil sinyalde bir
  // yukleme hala surerken "Gonder"e basilirsa o dosyanin url'i forma hic
  // eklenmemis olurdu - sessizce kaybolurdu.
  onYukleniyorDegisti?: (yukleniyorMu: boolean) => void;
}) {
  const [dosyalar, setDosyalar] = useState<YuklenenDosya[]>([]);

  useEffect(() => {
    onYukleniyorDegisti?.(dosyalar.some((d) => d.durum === "yukleniyor"));
  }, [dosyalar, onYukleniyorDegisti]);

  async function dosyalarSecildi(secilenler: FileList | null) {
    if (!secilenler || secilenler.length === 0) return;
    const yeniler: YuklenenDosya[] = Array.from(secilenler).map((dosya) => ({
      id: crypto.randomUUID(),
      ad: dosya.name,
      mimeTipi: dosya.type || "application/octet-stream",
      boyutBayt: dosya.size,
      durum: "yukleniyor" as const,
      yuzde: 0,
    }));

    setDosyalar((mevcut) => (coklu ? [...mevcut, ...yeniler] : yeniler));

    Array.from(secilenler).forEach(async (dosya, index) => {
      const id = yeniler[index].id;
      try {
        const sonuc = await upload(`haciz-raporlari/gecici/${crypto.randomUUID()}-${dosya.name}`, dosya, {
          access: "private",
          handleUploadUrl: "/api/haciz-raporu/blob-upload",
          onUploadProgress: ({ percentage }) => {
            setDosyalar((mevcut) => mevcut.map((d) => (d.id === id ? { ...d, yuzde: percentage } : d)));
          },
        });
        setDosyalar((mevcut) =>
          mevcut.map((d) => (d.id === id ? { ...d, durum: "tamamlandi", yuzde: 100, url: sonuc.url } : d)),
        );
      } catch (hata) {
        setDosyalar((mevcut) =>
          mevcut.map((d) =>
            d.id === id ? { ...d, durum: "hata", hataMesaji: hata instanceof Error ? hata.message : "Yükleme başarısız." } : d,
          ),
        );
      }
    });
  }

  function dosyaKaldir(id: string) {
    setDosyalar((mevcut) => mevcut.filter((d) => d.id !== id));
  }

  return (
    <div>
      <Girdi
        id={girdiId}
        type="file"
        accept={accept}
        multiple={coklu}
        onChange={(e) => dosyalarSecildi(e.target.files)}
      />
      {dosyalar.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {dosyalar.map((dosya) => (
            <li key={dosya.id} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate text-white/70">{dosya.ad}</span>
              {dosya.durum === "yukleniyor" && (
                <span className="flex items-center gap-1.5 text-white/45">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-[var(--accent)] transition-all"
                      style={{ width: `${dosya.yuzde}%` }}
                    />
                  </span>
                  %{dosya.yuzde}
                </span>
              )}
              {dosya.durum === "tamamlandi" && <span className="text-[#5fd97a]">Yüklendi</span>}
              {dosya.durum === "hata" && (
                <span className="text-[#ff7a70]" title={dosya.hataMesaji}>
                  Hata
                </span>
              )}
              <button
                type="button"
                onClick={() => dosyaKaldir(dosya.id)}
                className="text-white/35 hover:text-white/70"
                aria-label={`${dosya.ad} dosyasını kaldır`}
              >
                ✕
              </button>
              {dosya.durum === "tamamlandi" && dosya.url && (
                <>
                  <input type="hidden" name={`${alanAdi}Url`} value={dosya.url} />
                  <input type="hidden" name={`${alanAdi}Ad`} value={dosya.ad} />
                  <input type="hidden" name={`${alanAdi}MimeTipi`} value={dosya.mimeTipi} />
                  <input type="hidden" name={`${alanAdi}Boyut`} value={dosya.boyutBayt} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-white/35">{etiket}</p>
    </div>
  );
}
