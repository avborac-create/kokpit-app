import { Secim, Alan, Etiket } from "@/core/ui/form";
import { Dugme } from "@/core/ui/button";
import {
  musterileriFinansIcinListele,
  musteriFinansHareketleriniListele,
  musteriFinansOzetiHesapla,
} from "@/modules/muvekkil-finans/lib/queries";
import { musteriFinansHareketiEkle } from "@/modules/muvekkil-finans/lib/actions";
import { musterininDosyalari } from "@/modules/dava-dosyasi/lib/queries";
import { YeniHareketAcici } from "@/modules/muvekkil-finans/components/yeni-hareket-acici";
import { YeniHareketFormu } from "@/modules/muvekkil-finans/components/yeni-hareket-formu";
import { HareketListesi } from "@/modules/muvekkil-finans/components/hareket-listesi";
import { FinansOzeti } from "@/modules/muvekkil-finans/components/finans-ozeti";

// Bilerek TEK sayfa (bkz. ARCHITECTURE.md "Muvekkil Finans V1"): mevcut
// Finans/Cari Hesap modulunun iki seviyeli (liste -> detay) yapisindan
// FARKLI olarak, musteri secimi de dahil her sey burada, ?musteriId=
// query-string'i ile. Amac: 5 basit soruya cevap veren, sade, tek ekranlik
// bagimsiz bir modul - mevcut cari hesap/dosya kumesi/dagitim mimarisine
// hic dokunmaz.
export default async function MuvekkilFinansSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ musteriId?: string }>;
}) {
  const { musteriId } = await searchParams;
  const musteriler = await musterileriFinansIcinListele();

  const seciliMusteri = musteriId ? musteriler.find((m) => m.id === musteriId) : undefined;

  const [hareketler, ozet, dosyalar] = seciliMusteri
    ? await Promise.all([
        musteriFinansHareketleriniListele(seciliMusteri.id),
        musteriFinansOzetiHesapla(seciliMusteri.id),
        musterininDosyalari(seciliMusteri.id),
      ])
    : [[], null, []];

  return (
    <div className="pt-3">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Müvekkil Finans</h1>
        <p className="mt-1 text-sm text-white/55">
          Müvekkilden ne kadar alındı, ne amaçla, ne kadarı gerçek masraf oldu, ne kadarı dış
          kurumda ve ne kadarı hâlâ bizim kontrolümüzde — sade bir özet.
        </p>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Alan>
            <Etiket htmlFor="musteriId">Müvekkil</Etiket>
            <Secim id="musteriId" name="musteriId" defaultValue={seciliMusteri?.id ?? ""}>
              <option value="">Seçiniz…</option>
              {musteriler.map((musteri) => (
                <option key={musteri.id} value={musteri.id}>
                  {musteri.adSoyadUnvan}
                </option>
              ))}
            </Secim>
          </Alan>
        </div>
        <div className="mb-4">
          <Dugme type="submit" varyant="ikincil">
            Görüntüle
          </Dugme>
        </div>
      </form>

      {!seciliMusteri ? (
        <p className="text-sm text-white/40">Devam etmek için bir müvekkil seçin.</p>
      ) : (
        <>
          <FinansOzeti ozet={ozet!} />

          <YeniHareketAcici>
            <YeniHareketFormu
              action={musteriFinansHareketiEkle}
              musteriId={seciliMusteri.id}
              dosyalar={dosyalar.map((d) => ({ id: d.id, konu: d.konu }))}
            />
          </YeniHareketAcici>

          <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Hareketler</h2>
          <HareketListesi
            hareketler={hareketler.map((h) => ({ ...h, tutar: Number(h.tutar) }))}
          />
        </>
      )}
    </div>
  );
}
