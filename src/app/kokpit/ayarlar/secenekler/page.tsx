import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { tumSecenekListeleriniListele } from "@/core/secenek/admin-queries";
import { ListeSecici } from "@/core/secenek/liste-secici";
import { SecenekListesiKarti } from "@/core/secenek/secenek-listesi-karti";

// Kodda hicbir yerde okunmayan (eski tasarimlardan kalan) listeler ekranda gosterilmez; veritabaninda durur.
const KULLANILMAYAN = new Set([
  "avans_durumu",
  "bloke_para_durumu",
  "fatura_durumu",
  "fatura_turu",
  "hukuki_mudahale_turu",
  "icra_dosyasi_alt_turu",
  "para_kaydi_sahibi",
  "vekalet_ucreti_durumu",
]);

// Her listenin nerede kullanildigi (bilinmiyorsa not gosterilmez).
const KULLANIM_YERI: Record<string, string> = {
  anlasma_masraf_sorumlusu: "Müvekkil anlaşması: masrafı kimin karşılayacağı",
  anlasma_odeme_sekli: "Müvekkil anlaşması: ödeme şekli",
  cari_kod: "Eski cari / masraf formları (yeni hesaplar Finans > Hesapları Yönet'ten yönetilir)",
  dava_dosyasi_durumu: "Dosya durumu (dosya formu ve dosya listesi süzgeci)",
  dava_turu: "Dosya formu: dava türü",
  dosya_turu: "Dosya formu: dosya türü",
  gelistirme_talebi_durumu: "Geliştirme Kutusu: talep durumu",
  hukuk_dali: "Dosya formu: hukuk dalı",
  dosya_durum_kodu: "Dosya kartı künyesi: dosya durum kodu (Derdest, İstinafta…)",
  hukuki_iliski_turu: "Dosya formu: uyuşmazlık türü",
  hukuki_mudahale_onceligi: "Avukat Şapkası ekranı: müdahale önceliği",
  kaynak: "Eski para trafiği formu: kayıt kaynağı",
  masraf_turu: "Masraf formu: masraf türü",
  musteri_durumu: "Müvekkil formu ve listesi: durum",
  musteri_tipi: "Müvekkil formu: gerçek / tüzel kişi vb.",
  muvekkil_sifati: "Dosya formu: müvekkilin sıfatı (davacı, davalı…)",
  odeme_yontemi: "Alacak Kaydı (Ödeme Geldi) formu: ödeme şekli",
  para_kaydi_kullanim_amaci: "Eski para trafiği formu: kullanım amacı",
  para_trafigi_durumu: "Eski para trafiği formu: durum",
  para_trafigi_tipi: "Eski para trafiği formu: tip",
  telefon_sifati: "Müvekkil formu: telefon sıfatı",
  yargi_kolu: "Dosya formu: yargı kolu",
};

export default async function SecenekListeleriSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ liste?: string }>;
}) {
  const { liste: istenenListe } = await searchParams;
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    redirect("/kokpit");
  }

  const listeler = (await tumSecenekListeleriniListele()).filter((l) => !KULLANILMAYAN.has(l.anahtar));
  const seciliListe = listeler.find((l) => l.anahtar === istenenListe) ?? listeler[0];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Seçenek Listeleri</h1>
      <p className="mb-6 max-w-2xl text-sm text-white/50">
        Uygulama genelindeki açılır listeler (cari kod, masraf türü, tip, durum vb.) burada
        yönetilir — yeni değer ekleyebilir, mevcut bir değerin adını değiştirebilir, sırasını
        değiştirebilir ya da pasife alabilirsiniz. Bir değer hiçbir zaman tamamen silinmez;
        geçmiş kayıtlar bozulmasın diye yalnızca pasife alınır ve yeni girişte seçilemez.
      </p>

      <div className="mb-4">
        <ListeSecici
          listeler={listeler.map((l) => ({ anahtar: l.anahtar, ad: l.ad }))}
          secili={seciliListe?.anahtar ?? ""}
        />
      </div>

      {seciliListe && KULLANIM_YERI[seciliListe.anahtar] && (
        <p className="mb-3 text-sm text-white/55">
          <span className="text-white/40">Nerede kullanılır:</span> {KULLANIM_YERI[seciliListe.anahtar]}
        </p>
      )}
      {seciliListe && <SecenekListesiKarti key={seciliListe.id} liste={seciliListe} />}
    </div>
  );
}
