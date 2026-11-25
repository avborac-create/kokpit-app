import type { CMKNufusKisisi } from "@prisma/client";
import { Alan, Etiket, Girdi, MetinAlani } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { OnayliButon } from "@/core/ui/onayli-buton";
import {
  nufusKisisiEkle,
  nufusKisisiGuncelle,
  nufusKisisiSil,
  nufusNotuKaydet,
} from "@/modules/cmk-dosyalari/lib/nufus-actions";

const gunAy = (t: Date | null) => (t ? t.toISOString().slice(0, 10).split("-").reverse().join(".") : "—");
const tarihDegeri = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : "");

function KisiAlanlari({ k }: { k?: CMKNufusKisisi }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Alan><Etiket>Yakınlık</Etiket><Girdi name="yakinlik" required placeholder="Kendisi / Babası / Annesi / Kardeşi" defaultValue={k?.yakinlik ?? ""} /></Alan>
      <Alan><Etiket>Ad</Etiket><Girdi name="ad" required defaultValue={k?.ad ?? ""} /></Alan>
      <Alan><Etiket>Soyad</Etiket><Girdi name="soyad" defaultValue={k?.soyad ?? ""} /></Alan>
      <Alan><Etiket>TCKN</Etiket><Girdi name="tckn" inputMode="numeric" maxLength={11} defaultValue={k?.tckn ?? ""} /></Alan>
      <Alan><Etiket>Baba adı</Etiket><Girdi name="babaAdi" defaultValue={k?.babaAdi ?? ""} /></Alan>
      <Alan><Etiket>Ana adı</Etiket><Girdi name="anaAdi" defaultValue={k?.anaAdi ?? ""} /></Alan>
      <Alan><Etiket>Doğum yeri</Etiket><Girdi name="dogumYeri" defaultValue={k?.dogumYeri ?? ""} /></Alan>
      <Alan><Etiket>Doğum tarihi</Etiket><Girdi type="date" name="dogumTarihi" defaultValue={tarihDegeri(k?.dogumTarihi ?? null)} /></Alan>
      <Alan><Etiket>Medeni hali</Etiket><Girdi name="medeniHal" placeholder="Bekâr / Evli" defaultValue={k?.medeniHal ?? ""} /></Alan>
      <Alan><Etiket>Tescil tarihi</Etiket><Girdi type="date" name="tescilTarihi" defaultValue={tarihDegeri(k?.tescilTarihi ?? null)} /></Alan>
      <Alan><Etiket>Cinsiyet (E/K)</Etiket><Girdi name="cinsiyet" maxLength={1} defaultValue={k?.cinsiyet ?? ""} /></Alan>
      <Alan><Etiket>BSN</Etiket><Girdi name="bsn" defaultValue={k?.bsn ?? ""} /></Alan>
      <Alan><Etiket>Sıra</Etiket><Girdi type="number" name="sira" defaultValue={k?.sira ?? 0} /></Alan>
      <div className="sm:col-span-2 lg:col-span-3">
        <Alan><Etiket>Olaylar / notlar</Etiket><MetinAlani name="olaylar" rows={2} defaultValue={k?.olaylar ?? ""} /></Alan>
      </div>
    </div>
  );
}

export function MuvekkilBilgileri({ dosyaId, kisiler, nufusNotu }: { dosyaId: string; kisiler: CMKNufusKisisi[]; nufusNotu: string | null }) {
  return (
    <details className="glass mb-4 rounded-2xl text-sm text-white/75" open={kisiler.length > 0}>
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white/90 hover:bg-white/5">
        <span className="font-medium">Müvekkil Bilgileri <span className="text-white/45">(nüfus kayıt örneği)</span></span>
        <span className="text-xs text-white/45">{kisiler.length} kişi</span>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        {nufusNotu && <p className="whitespace-pre-line rounded-xl bg-white/5 p-3 text-xs leading-relaxed">{nufusNotu}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-xs">
            <thead className="text-white/45">
              <tr>
                {["BSN", "Yakınlık", "Ad Soyad", "TCKN", "Baba / Ana", "Doğum", "Medeni hal", "Tescil"].map((b) => (
                  <th key={b} className="px-2 py-1.5 font-medium">{b}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kisiler.map((k) => (
                <tr key={k.id} className="border-t border-white/10 align-top">
                  <td className="px-2 py-2">{k.bsn ?? "—"}</td>
                  <td className="px-2 py-2">{k.yakinlik}{k.cinsiyet ? ` (${k.cinsiyet})` : ""}</td>
                  <td className="px-2 py-2 font-medium text-white/90">{k.ad} {k.soyad}</td>
                  <td className="select-all px-2 py-2 font-mono">{k.tckn ?? "—"}</td>
                  <td className="px-2 py-2">{k.babaAdi ?? "—"} / {k.anaAdi ?? "—"}</td>
                  <td className="px-2 py-2">{k.dogumYeri ?? "—"} {gunAy(k.dogumTarihi)}</td>
                  <td className="px-2 py-2">{k.medeniHal ?? "—"}</td>
                  <td className="px-2 py-2">{gunAy(k.tescilTarihi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {kisiler.some((k) => k.olaylar) && (
          <ul className="space-y-1 text-xs text-white/60">
            {kisiler.filter((k) => k.olaylar).map((k) => (
              <li key={`o-${k.id}`}><span className="text-white/80">{k.ad}:</span> {k.olaylar}</li>
            ))}
          </ul>
        )}
        {kisiler.map((k) => (
          <details key={`d-${k.id}`} className="rounded-xl border border-white/10 p-3">
            <summary className="cursor-pointer text-[#6db8ff]">Düzelt / sil: {k.ad} {k.soyad} ({k.yakinlik})</summary>
            <form action={nufusKisisiGuncelle.bind(null, dosyaId, k.id)} className="mt-3 space-y-3">
              <KisiAlanlari k={k} />
              <div className="flex flex-wrap items-center gap-3">
                <GonderButonu>Güncelle</GonderButonu>
                {k.degistirenAd && (
                  <span className="text-xs text-white/40">Son değiştiren: {k.degistirenAd}, {k.updatedAt.toLocaleString("tr-TR")}</span>
                )}
              </div>
            </form>
            <div className="mt-2">
              <OnayliButon
                eylem={async () => {
                  "use server";
                  await nufusKisisiSil(dosyaId, k.id);
                }}
                mesaj={`${k.ad} ${k.soyad ?? ""} kaydı silinsin mi?`}
                boyut="kompakt"
              >
                Sil
              </OnayliButon>
            </div>
          </details>
        ))}
        <details className="rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer text-[#6db8ff]">+ Kişi ekle</summary>
          <form action={nufusKisisiEkle.bind(null, dosyaId)} className="mt-3 space-y-3">
            <KisiAlanlari />
            <GonderButonu>Ekle</GonderButonu>
          </form>
        </details>
        <details className="rounded-xl border border-white/10 p-3">
          <summary className="cursor-pointer text-[#6db8ff]">Nüfus kaydı üst bilgisini düzenle (il/ilçe, cilt-hane, yerleşim yeri)</summary>
          <form action={nufusNotuKaydet.bind(null, dosyaId)} className="mt-3 space-y-3">
            <MetinAlani name="nufusNotu" rows={3} defaultValue={nufusNotu ?? ""} />
            <GonderButonu>Kaydet</GonderButonu>
          </form>
        </details>
      </div>
    </details>
  );
}
