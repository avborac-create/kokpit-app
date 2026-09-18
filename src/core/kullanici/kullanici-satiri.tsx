"use client";

import { useState, useTransition } from "react";
import type { KullaniciRolu } from "@prisma/client";
import {
  kullaniciAktifligiDegistir,
  kullaniciRolGuncelle,
  kullaniciSifreSifirla,
} from "@/core/kullanici/admin-actions";
import { Dugme } from "@/core/ui/button";
import { Girdi, Secim } from "@/core/ui/form";

export const ROL_ETIKETLERI: Record<KullaniciRolu, string> = {
  YONETICI: "Yönetici",
  ORTAK: "Ortak",
  SORUMLU_AVUKAT: "Sorumlu Avukat",
  PERSONEL: "Personel",
};

type Kullanici = {
  id: string;
  adSoyad: string;
  eposta: string;
  rol: KullaniciRolu;
  aktifMi: boolean;
};

export function KullaniciSatiri({
  kullanici,
  kendisiMi,
}: {
  kullanici: Kullanici;
  kendisiMi: boolean;
}) {
  const [sifreFormuAcik, setSifreFormuAcik] = useState(false);
  const [sifre, setSifre] = useState("");
  const [rolPending, rolDegistir] = useTransition();
  const [aktiflikPending, aktifligiDegistir] = useTransition();
  const [sifrePending, sifreDegistir] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  return (
    <tr className={`border-t border-white/[0.06] ${!kullanici.aktifMi ? "opacity-45" : ""}`}>
      <td className="px-4 py-2.5 text-white/85">
        {kullanici.adSoyad}
        {kendisiMi && <span className="ml-2 text-xs text-white/35">(siz)</span>}
      </td>
      <td className="px-4 py-2.5 text-white/60">{kullanici.eposta}</td>
      <td className="px-4 py-2.5">
        <Secim
          value={kullanici.rol}
          disabled={rolPending || (kendisiMi && kullanici.rol === "YONETICI")}
          className="!py-1 text-xs"
          onChange={(e) => {
            const fd = new FormData();
            fd.set("rol", e.target.value);
            setHata(null);
            rolDegistir(async () => {
              try {
                await kullaniciRolGuncelle(kullanici.id, fd);
              } catch (err) {
                setHata(err instanceof Error ? err.message : "İşlem başarısız oldu.");
              }
            });
          }}
        >
          {Object.entries(ROL_ETIKETLERI).map(([deger, etiket]) => (
            <option key={deger} value={deger}>
              {etiket}
            </option>
          ))}
        </Secim>
      </td>
      <td className="px-4 py-2.5">
        <Dugme
          type="button"
          varyant={kullanici.aktifMi ? "ikincil" : "birincil"}
          disabled={aktiflikPending || kendisiMi}
          className="!px-3 !py-1 text-xs"
          onClick={() => {
            setHata(null);
            aktifligiDegistir(async () => {
              try {
                await kullaniciAktifligiDegistir(kullanici.id, !kullanici.aktifMi);
              } catch (err) {
                setHata(err instanceof Error ? err.message : "İşlem başarısız oldu.");
              }
            });
          }}
        >
          {kullanici.aktifMi ? "Pasife Al" : "Aktif Et"}
        </Dugme>
      </td>
      <td className="px-4 py-2.5">
        {sifreFormuAcik ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("sifre", sifre);
              setHata(null);
              sifreDegistir(async () => {
                try {
                  await kullaniciSifreSifirla(kullanici.id, fd);
                  setSifre("");
                  setSifreFormuAcik(false);
                } catch (err) {
                  setHata(err instanceof Error ? err.message : "İşlem başarısız oldu.");
                }
              });
            }}
          >
            <Girdi
              type="password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              placeholder="Yeni şifre"
              autoFocus
              minLength={8}
              required
              className="!py-1"
            />
            <Dugme type="submit" disabled={sifrePending} className="!px-3 !py-1 text-xs">
              Kaydet
            </Dugme>
            <Dugme
              type="button"
              varyant="ikincil"
              className="!px-3 !py-1 text-xs"
              onClick={() => {
                setSifre("");
                setSifreFormuAcik(false);
              }}
            >
              Vazgeç
            </Dugme>
          </form>
        ) : (
          <Dugme
            type="button"
            varyant="ikincil"
            className="!px-3 !py-1 text-xs"
            onClick={() => setSifreFormuAcik(true)}
          >
            Şifre Değiştir
          </Dugme>
        )}
        {hata && <p className="mt-1 text-xs text-[#ff7a70]">{hata}</p>}
      </td>
    </tr>
  );
}
