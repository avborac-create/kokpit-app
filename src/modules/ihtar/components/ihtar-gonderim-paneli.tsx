"use client";

import { useState, useTransition } from "react";
import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import { ihtarGonderimiKaydet } from "../lib/actions";

export type IhtarGonderimVerisi = {
  yol: string | null;
  noterlik: string | null;
  yevmiyeNo: string | null;
  kepAdresi: string | null;
  kepGonderimNo: string | null;
  gonderimTarihi: string | null; // yyyy-mm-dd
  muhatap: string | null;
  tebligDurumu: string | null;
  tebligTarihi: string | null;
  cevapSuresiGun: number | null;
  cevapGeldi: boolean;
  not: string | null;
};

// Ihtar dosyasina ozgu gonderim paneli (noter / KEP). Dosya bilgisi formundan bagimsizdir.
export function IhtarGonderimPaneli({
  dosyaId,
  veri,
  karsiTaraflar,
}: {
  dosyaId: string;
  veri: IhtarGonderimVerisi | null;
  karsiTaraflar: string[];
}) {
  const [yol, setYol] = useState(veri?.yol ?? "");
  const [mesaj, setMesaj] = useState<{ hata?: string; tamam?: boolean } | null>(null);
  const [bekliyor, baslat] = useTransition();

  function kaydet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    baslat(async () => {
      const s = await ihtarGonderimiKaydet(dosyaId, f);
      setMesaj(s.hata ? { hata: s.hata } : { tamam: true });
    });
  }

  return (
    <form onSubmit={kaydet} onChange={() => setMesaj(null)}>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Alan>
          <Etiket htmlFor="ih-yol">Gönderim yolu</Etiket>
          <Secim id="ih-yol" name="yol" value={yol} onChange={(e) => setYol(e.target.value)}>
            <option value="">Seçin…</option>
            <option value="NOTER">Noter</option>
            <option value="KEP">KEP</option>
          </Secim>
        </Alan>
        {yol === "NOTER" && (
          <>
            <Alan>
              <Etiket htmlFor="ih-noterlik">Noterlik</Etiket>
              <Girdi id="ih-noterlik" name="noterlik" defaultValue={veri?.noterlik ?? ""} placeholder="ör. Kadıköy 5. Noterliği" />
            </Alan>
            <Alan>
              <Etiket htmlFor="ih-yevmiye">Yevmiye no</Etiket>
              <Girdi id="ih-yevmiye" name="yevmiyeNo" defaultValue={veri?.yevmiyeNo ?? ""} />
            </Alan>
          </>
        )}
        {yol === "KEP" && (
          <>
            <Alan>
              <Etiket htmlFor="ih-kep">KEP adresi</Etiket>
              <Girdi id="ih-kep" name="kepAdresi" defaultValue={veri?.kepAdresi ?? ""} />
            </Alan>
            <Alan>
              <Etiket htmlFor="ih-kepno">KEP gönderim no</Etiket>
              <Girdi id="ih-kepno" name="kepGonderimNo" defaultValue={veri?.kepGonderimNo ?? ""} />
            </Alan>
          </>
        )}
      </div>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Alan>
          <Etiket htmlFor="ih-gtar">Gönderim tarihi</Etiket>
          <Girdi id="ih-gtar" type="date" name="gonderimTarihi" defaultValue={veri?.gonderimTarihi ?? ""} />
        </Alan>
        <Alan>
          <Etiket htmlFor="ih-muhatap">Muhatap</Etiket>
          <Girdi id="ih-muhatap" name="muhatap" list="ih-muhatap-liste" defaultValue={veri?.muhatap ?? ""} placeholder="Karşı taraf seçin ya da yazın" />
          <datalist id="ih-muhatap-liste">
            {karsiTaraflar.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </Alan>
        <Alan>
          <Etiket htmlFor="ih-tdurum">Tebliğ durumu</Etiket>
          <Secim id="ih-tdurum" name="tebligDurumu" defaultValue={veri?.tebligDurumu ?? ""}>
            <option value="">Seçin…</option>
            <option value="BEKLIYOR">Bekliyor</option>
            <option value="TEBLIG_EDILDI">Tebliğ edildi</option>
            <option value="IADE">İade geldi</option>
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="ih-ttar">Tebliğ tarihi</Etiket>
          <Girdi id="ih-ttar" type="date" name="tebligTarihi" defaultValue={veri?.tebligTarihi ?? ""} />
        </Alan>
        <Alan>
          <Etiket htmlFor="ih-sure">Cevap süresi (gün)</Etiket>
          <Girdi id="ih-sure" type="number" min={0} name="cevapSuresiGun" defaultValue={veri?.cevapSuresiGun ?? ""} />
        </Alan>
        <Alan>
          <Etiket htmlFor="ih-cevap">Cevap geldi mi?</Etiket>
          <label className="flex items-center gap-2 pt-2 text-sm text-white">
            <input id="ih-cevap" type="checkbox" name="cevapGeldi" defaultChecked={veri?.cevapGeldi ?? false} className="onay-kutusu" /> Evet
          </label>
        </Alan>
      </div>
      <Alan>
        <Etiket htmlFor="ih-not">Not</Etiket>
        <MetinAlani id="ih-not" name="not" rows={2} defaultValue={veri?.not ?? ""} />
      </Alan>
      <div className="flex items-center gap-3">
        <Dugme type="submit" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Kaydet"}
        </Dugme>
        {mesaj?.tamam && <span className="text-sm text-emerald-300">Kaydedildi</span>}
        {mesaj?.hata && <span className="text-sm text-red-300">{mesaj.hata}</span>}
      </div>
    </form>
  );
}
