# KOKPİT APP — Mimari

## Kırmızı Çizgi

> Herhangi bir tasarım kararı, gelecekte yeni bir modül eklemeyi zorlaştırıyorsa yanlıştır.

Bu proje boyunca her mimari karar bu soruyla sınanır: **"Bu karar yeni bir modülün
eklenmesini engeller mi?"** Aşağıdaki yapı bu ilkeyi somutlaştırmak için kuruldu.

## Teknoloji Seçimleri ve Gerekçeleri

| Katman | Seçim | Neden |
| --- | --- | --- |
| Uygulama çatısı | Next.js (App Router) + TypeScript | Tek bir depo/deploy ile hem sunucu hem istemci kod; React Server Components sayesinde modül başına ayrı sayfa/route eklemek ucuz |
| Veritabanı | PostgreSQL | Gerçek çok-kullanıcılı, eşzamanlı erişime uygun, ACID garantili ilişkisel veritabanı; 20-30 kullanıcı için fazlasıyla yeterli |
| ORM | Prisma | Şema tek dosyada (`prisma/schema.prisma`), migration geçmişi versiyonlanır, tip güvenliği sağlar |
| Kimlik doğrulama | Özel (custom) - `jose` ile imzalı JWT tabanlı oturum | Harici bir kimlik doğrulama kütüphanesine (ör. Auth.js v5) bağımlı kalmadan, küçük ve anlaşılır bir oturum katmanı; edge-uyumlu, veritabanına gitmeden doğrulanabilir |
| Stil | Tailwind CSS | Hızlı, tutarlı, ek bir tasarım sistemi kurulumu gerektirmez |
| PWA | Elle yazılmış `manifest.json` + basit `sw.js` | Ek bir kütüphaneye (`next-pwa` vb.) bağımlı olmadan ana ekrana eklenebilir, standalone açılan bir uygulama |

## Katman Yapısı

```
src/
  core/               <- TÜM modüllerin paylaştığı altyapı (platform katmanı)
    db/prisma.ts      <- Prisma Client singleton
    auth/             <- oturum, şifre, yetki, "mevcut kullanıcı" yardımcıları
    secenek/          <- genişletilebilir liste/etiket altyapısı (bkz. aşağı)
    ui/               <- paylaşılan form/buton bileşenleri
    modul-kayit-defteri.ts  <- sol menüyü besleyen TEK modül listesi

  modules/            <- İş alanı (domain) kodu, MODÜL BAZLI klasörlenir
    musteri/          <- "Müvekkil Veritabanı" modülü
      lib/            <- sorgular (queries) ve server action'lar
      components/     <- bu modüle özel React bileşenleri

  app/                <- Next.js routing - ince bir katman, mantığı modules/'a devreder
    giris/            <- login sayfası
    kokpit/           <- oturum açmış kullanıcı kabuğu (sidebar + header)
      musteriler/     <- Müvekkil modülünün sayfaları
      <yeni-modul>/   <- gelecekte: her yeni modül kendi alt klasörünü açar
```

**Kural:** `core/` sadece platform altyapısıdır, hiçbir modüle özel iş kuralı
içermez. `modules/<isim>/` bir modülün TÜM iş mantığını barındırır ve başka
bir modülün `lib`/`components` klasörüne import ile bağımlı OLMAZ. `app/`
klasörü sadece routing ve sayfa kompozisyonu yapar; iş mantığı `modules/`
içinde yaşar.

## Yeni Bir Modül Nasıl Eklenir?

Örnek: "Dava Dosyaları" modülünü eklemek istediğinizde:

1. `src/modules/dava-dosyalari/` klasörünü oluşturun (`lib/queries.ts`,
   `lib/actions.ts`, `components/`).
2. `prisma/schema.prisma` dosyasının SONUNA yeni bir `// MODUL: Dava Dosyalari`
   bloğu ekleyin. Mevcut modellere DOKUNMAYIN.
3. Kategori alanları (durum, tip vb.) için yeni bir enum TANIMLAMAYIN;
   `SecenekListesi`/`SecenekDegeri` desenini kullanın ve `prisma/seed.ts`
   içindeki `SECENEK_LISTELERI` dizisine yeni liste(ler) ekleyin.
4. `src/app/kokpit/dava-dosyalari/` altında sayfalarınızı oluşturun.
5. `src/core/modul-kayit-defteri.ts` içindeki `MODUL_KAYIT_DEFTERI` dizisine
   TEK bir satır ekleyin ve `aktif: true` yapın.
6. Başka bir modülün kaydına referans gerekiyorsa (ör. müvekkilin para
   trafiği kaydında "ilgili dosya"), önce serbest/opsiyonel bir id alanı
   olarak bırakın (bkz. `MusteriParaTrafigi.ilgiliDosyaId`); modül
   olgunlaştıkça gerçek bir FK'ya çevirebilirsiniz.

Mevcut modüllerin (Müvekkil Veritabanı) hiçbir dosyasına dokunmadan bu
adımların tamamlanabilmesi, mimarinin "kırmızı çizgi" testini geçtiğinin
kanıtıdır.

## Genişletilebilir Alanlar (Enum Yerine Veri)

`durum`, `tip`, `kaynak` gibi kategori alanları asla Prisma `enum` olarak
TANIMLANMAZ (enum değişikliği migration gerektirir). Bunun yerine:

- `SecenekListesi` (ör. `musteri_durumu`) bir kategori ailesini,
- `SecenekDegeri` (ör. `aktif`, `pasif`, `potansiyel`) o ailenin tek tek
  değerlerini temsil eder.

Yeni bir durum eklemek (ör. "kısmi tahsilat") **şema değişikliği değil,
bir veri satırı eklemektir** (`prisma/seed.ts` içindeki ilgili diziye bir
satır eklenir, ya da artık **Kokpit içinden**: `Ayarlar > Seçenek
Listeleri` (`/kokpit/ayarlar/secenekler`, yalnızca Yönetici/Ortak) —
yönetici/ortak rolü kod değişikliği gerektirmeden yeni değer ekleyebilir,
mevcut bir değerin etiketini değiştirebilir, sırasını değiştirebilir ya
da pasife alabilir. `kod` alanı (makine-okunur anahtar) bir kez
oluşturulduktan sonra ASLA değişmez/silinmez — sadece `aktifMi=false`
ile pasife alınır — böylece geçmiş kayıtlar ve kod içindeki kod-bazlı
eşlemeler (ör. `TIP_KOD_ILE_ESLESEN_CARI_KOD_KODU`) bozulmaz.
- **ÖNEMLİ — seed.ts var olan satırlara ASLA dokunmaz**: `npm run build`
  (dolayısıyla her deploy) `tsx prisma/seed.ts`'i çalıştırır. Bir zamanlar
  bu script var olan `secenek_degerleri` satırlarının `etiket`/`siraNo`/
  `aktifMi` alanlarını da güncelliyordu — bu, Ayarlar panelinden yapılan
  HER admin düzenlemesini bir sonraki deploy'da sessizce sıfırlıyordu
  (gerçek bir hata olarak yaşandı, bkz. "Emanet Para" adlandırma
  düzeltmesi). `secenekListeleriniOlustur()` artık sadece EKSİK
  değerleri oluşturur (`update: {}`), var olan bir satırın görünür
  alanlarına bir daha asla dokunmaz. Var olan bir değeri kod tarafından
  kasıtlı değiştirmek gerekirse (nadir), bunun için ayrı, tek seferlik
  bir veri migrasyonu yazılır (bkz.
  `prisma/migrations/20260913170000_emanet_para_rename`) — seed.ts'i
  değil.

İstisna: kullanıcı **rolü** (`KullaniciRolu`) bilinçli olarak enum olarak
bırakıldı, çünkü rol değişikliği güvenlik/yetki anlamı taşır ve bir
kod incelemesinden geçmesi istenir; bu, "durum/tip" gibi serbestçe
büyüyen iş kategorileriyle aynı sınıfta değildir.

## Çok Kullanıcılı ve Eşzamanlı Erişim

- PostgreSQL + Prisma, satır bazlı güncellemelerde veritabanının kendi
  transaction/locking mekanizmasına dayanır; 20-30 kullanıcının eşzamanlı
  erişimi için ek bir önlem gerekmez (ilk faz için).
- Oturumlar veritabanında değil, imzalı bir JWT (cookie) olarak tutulur;
  bu sayede kimlik doğrulama veritabanına ekstra yük bindirmez ve
  `proxy.ts` (Next.js'in `middleware` yerine geçen dosya kuralı) içinde
  hızlıca doğrulanabilir.
- Basit bir rol modeli (`YONETICI`, `ORTAK`, `SORUMLU_AVUKAT`, `PERSONEL`)
  var; silme gibi geri alınamaz işlemler `core/auth/yetki.ts` içindeki tek
  bir fonksiyonla kontrol edilir. İleride modül bazlı, daha ayrıntılı bir
  yetki matrisine bu fonksiyonun İÇİ büyütülerek geçilebilir; dışa açık
  arayüzü (imzası) değişmeden.

## UYAP Entegrasyonu İçin Bırakılan Kapılar

- `MusteriParaTrafigi.kaynakId`, kaydın `manuel` mi yoksa ileride toplu bir
  `uyap_import` ile mi geldiğini ayırt eder.
- `MusteriParaTrafigi.ilgiliDosyaId`, Dava Dosyaları modülü kurulana kadar
  serbest bir metin alanı olarak (ör. UYAP esas no) kullanılabilir.
- Toplu veri girişi (CSV/manuel import) için ekstra bir "import" tablosu
  şimdilik eklenmedi; ilk ihtiyaç ortaya çıktığında `kaynakId` ayrımı
  sayesinde mevcut veriye karışmadan eklenebilir.

## İleride Düşünülecek: Masraf Belgesi Ekleri (Henüz Yapılmadı)

Müvekkilden masraf yansıtma (`para_trafigi_tipi = masraf_yansitma`) talep
edilirken fiş/fatura/makbuz gibi kanıtlayıcı belgelerin (PDF, JPEG) sisteme
eklenmesi ihtiyacı doğabilir. Konuşulan yaklaşım:

- Belgeler veritabanına DEĞİL, ayrı bir dosya deposuna (ör. Vercel Blob,
  Cloudflare R2) yüklenir; `MusteriParaTrafigi` kaydında sadece dosya
  referansı/metadata tutulur.
- Bu belgeler **geçici** olabilir: örn. yükleme tarihinden **3 ay sonra
  otomatik silinir** - amaç, çıktı (müvekkile gönderilecek rapor/talep)
  üretildikten sonra gereksiz yer kaplamamak.
- Bu, ayrı bir modül olarak (mevcut Müvekkil modülüne dokunmadan) eklenebilir;
  "kırmızı çizgi" ilkesiyle uyumlu.

Bu henüz geliştirilmedi; ileride bir modül olarak ele alınacak.

## Finans Modülü — Tanımlar/Standartlar

Karışıklığa mahal vermemek için burada netleşen kavramlar kayıt altına
alınır; yeni bir tartışma açmadan önce buraya bakılır.

- **"Yargı Dosyaları" (eski adıyla "Dava Dosyaları", sonra kısaca "Dosyalar")**:
  Sol menüde "Dosyalar" başlığı altında `DavaDosyasi` modülü "Yargı
  Dosyaları", `CMKDosyasi` modülü ise "CMK Dosyaları" olarak ayrı iki alt
  öğe halinde görünür — `DavaDosyasi` modeli sadece resmi mahkeme/icra
  dosyalarını değil, dava/icra ÖNCESİ aşamaları da (ihtar, arabuluculuk,
  müzakere) kapsıyor. Bunu ayırt eden alan `DavaDosyasi.turId` →
  `dosya_turu` seçenek listesi: `ihtar_dosyasi`, `arabuluculuk_dosyasi`,
  `muzakere_dosyasi` (dava/icra hiç açılmadan sadece borçluyla pazarlık
  edilen dosyalar için), `icra_dosyasi`, `ihtiyati_haciz_dosyasi`,
  `dava_dosyasi` (genel hukuk/ceza/idari dava). Şimdilik hepsi AYNI
  `DavaDosyasi` şeması ve formu üzerinden yönetiliyor (tür bazlı ayrı
  kart/şema tasarımı bilinçli olarak ERTELENDİ — "kart" fikri ileride
  gerekirse türe göre farklı layout/alan setleri şeklinde
  genişletilebilir). `turId` nullable: eski kayıtlar geriye dönük
  türlendirilene kadar boş kalabilir, yeni dosya formunda ise zorunludur.
  `birimAdi` da bu yüzden artık zorunlu değil — bir ihtar/müzakere
  dosyasının mahkeme/icra dairesi olmayabilir.
  - **İcra Dosyası alt türü (`DavaDosyasi.icraAltTuruId` → `icra_dosyasi_alt_turu`
    seçenek listesi: `esas`/`talimat`)**: Eskiden "Esas İcra Dosyası" ve
    "Talimat Dosyası" ayrı birer Dosya Türü idi; 20260918120000 migration'ı
    bunları tek `icra_dosyasi` türü + bu ayrı, opsiyonel alt tür alanına
    birleştirdi. Talimat dosyasının hangi esas dosyaya bağlı olduğu hâlâ
    `bagliOlduguDosyaId` ile ifade edilir — bu alan DEĞİŞMEDİ, sadece
    "Esas mı Talimat mı" sorusu artık Dosya Türü'nden ayrı bir kutuda.
  - **Yargı kolu (`DavaDosyasi.yargiKoluId` → `yargi_kolu` seçenek listesi:
    `hukuk`/`ceza`/`idari`)**: Eskiden "İcra Ceza Davası" ayrı bir Dosya
    Türüydü ve genel "Dava Dosyası" seçeneği hukuk/ceza davasını ayırt
    etmiyordu; aynı migration bunu `dava_dosyasi` türü + bu ayrı, opsiyonel
    yargı kolu alanına taşıdı (İcra Ceza Davası → Dava Dosyası + Ceza).
    Sadece `tur.kod = 'dava_dosyasi'` iken anlamlıdır; icra/ihtar gibi
    mahkeme dışı dosyalarda boş kalır. Nullable: eski `dava_dosyasi`
    kayıtlarının hangi yargı kolunda olduğu veriden çıkarılamadığı için
    geriye dönük boş bırakıldı, elle sınıflandırılmayı bekliyor.
  - Bu iki alanın ayrı tutulma amacı: ileride sol menüde "Yargı Dosyaları"nı
    Hukuk/Ceza/İdari gibi ayrı alt menülere bölmek istenirse (kullanıcı
    talebi üzerine değerlendirildi), tek yapılacak iş bu mevcut alana göre
    filtrelemek/route eklemektir — ne şema değişir ne de mevcut veri
    taşınır.
- **Kokpit No (`DavaDosyasi.kayitNo`)**: "Dosya No" artık opsiyonel olduğu
  için (mahkeme/icra dairesinin verdiği esas no — bir ihtar/müzakere
  dosyasında hiç olmayabilir), HER dosyanın türü ne olursa olsun sahip
  olduğu, sistem tarafından otomatik atanan, sıralı bir kimlik numarası
  eklendi (`Int @unique @default(autoincrement())`, ekranlarda "KP-0007"
  şeklinde gösteriliyor). Kullanıcı girmez, formda hiç görünmez. Mevcut
  kayıtlar geriye dönük `olusturmaTarihi` sırasına göre numaralandırıldı
  (bkz. `20260913240000_dava_dosyasi_kokpit_no` migration'ı — elle yazılmış
  autoincrement backfill'i, standart Prisma paterni).
- **"Dosya Kümesi" (DB modeli: `UyusmazlikGrubu`, DEĞİŞMEDİ)**: Bir
  müvekkilin AYNI ticari ilişki/uyuşmazlık için açılan birden fazla
  yargısal dosyasını (ör. esas icra + icra ceza + ihtiyati haciz + haciz
  talimatları) tek bir çatı altında toplayan kavram. UI'da her yerde
  "Dosya Kümesi" olarak geçer; veritabanı model/tablo adı (`UyusmazlikGrubu`
  / `uyusmazlik_gruplari`) BİLİNÇLİ OLARAK değiştirilmedi (route'lar,
  ilişkiler ve mevcut veriyi bozmamak için) — sadece etiketler Türkçe UI
  metninde güncellendi. Yeni bir `DavaDosyasi` oluşturulurken Dosya Kümesi
  seçimi ZORUNLUDUR (`davaDosyasiOlustur`/`Guncelle` sunucu tarafında
  doğrulanır, alan `Form Düzeni`nden de gizlenemez —
  `DAVA_DOSYASI_GIZLENEMEZ_ALANLAR`).
- **Müvekkilden gelen paranın çoklu Dosya Kümesine/kaleme dağıtımı
  (`ParaTrafigiDagitimi`)**: Bir müşteriden TEK seferde gelen bir para
  (ör. bir çek tahsilatı) genelde birden fazla Dosya Kümesine ve/veya
  kullanım amacına (geçmiş masrafları kapatma / vekâlet ücreti ödeme /
  dosya avansı) bölünerek ayrılır. Bunun için `MusteriParaTrafigi` tipi
  "Müvekkilden Para Geldi" (`muvekkilden_para_geldi`) olan bir kayıt,
  sıfır veya daha fazla `ParaTrafigiDagitimi` satırına sahip olabilir; her
  satır bir Dosya Kümesi (zorunlu), opsiyonel bir yargısal dosya, bir
  kullanım amacı ve bir tutar taşır. Dağıtım satırlarının toplamı header
  tutarını AŞAMAZ (sunucu tarafında doğrulanır); aşan/eksik kalan kısım
  "Dağıtım Bekleyen Paralar" olarak (bkz. `dagitilmamisParaToplami`)
  müşteri Cari Hesap sayfasında ayrıca gösterilir — dağıtım satırı hiç
  eklenmeden de kayıt oluşturulabilir (kümesiz genel tahsilat), sonradan
  düzenleme ekranından dağıtım eklenir.
  - **Geriye dönük uyumluluk / çifte sayım önleme**: Bir `MusteriParaTrafigi`
    kaydının EN AZ 1 dağıtım satırı varsa, o kaydın eski `ParaTrafigiTasnif`
    satırları Cari Hesap hesaplamasına KATILMAZ — sadece dağıtım satırları
    (kullanım amacı → cari kod eşlemesiyle) sayılır. Dağıtımı OLMAYAN
    kayıtlarda (eski kayıtlar + hâlâ tekil-küme seçimiyle girilen
    `masraf`/`bloke_para`/`akdi_vekalet`/`avans_talebi` tipleri) eskisi
    gibi tasnif okunur. Bu mantık `cariHesapOzetiHesapla` (paylaşılan
    çekirdek, `src/modules/dava-dosyasi/lib/queries.ts`) içinde tek yerde
    uygulanır; aynı kalem asla iki kere sayılmaz.
  - **Kullanım amacı → cari kod eşlemesi**
    (`KULLANIM_AMACI_KOD_ILE_ESLESEN_CARI_KOD_KODU`): `gecmis_masraf` ve
    `dosya_avansi` ikisi de "Masraf Hesabı"nda toplanır (aradaki fark artık
    cari kodda değil, dökümdeki kullanım amacı etiketinde görünür);
    `vekalet_ucreti_odeme` → "Akdi Vekalet Hesabı". "Müvekkile İade" ayrı
    bir dağıtım amacı DEĞİL — kendi başına bir `MusteriParaTrafigi` tipi
    (`musteriye_odeme`, "Müvekkile Para Gönderdik").
- **Üç paylaşılan Cari Hesap/Döküm görünümü**: aynı finansal veriye üç
  farklı ölçekten bakan, hesaplanan (saklanmayan) görünümler:
  1. **Cari Hesap Özeti** (`CariHesapOzeti` bileşeni) — dosya, küme ve
     müşteri seviyesinde (`dosyaCariHesapOzeti`/`uyusmazlikGrubuCariHesapOzeti`/
     `musteriCariHesapOzeti`) cari-kod bazında Tasnif/Masraf/Bakiye. Sadece
     müşteri seviyesinde ayrıca "Dağıtım Bekleyen Paralar" kutusu gösterir
     (`dagitimBekleyen` prop'u) — bu kalem hiçbir kümeye ait olmadığından
     dosya/küme seviyesinde anlamsızdır, gösterilmez.
  2. **Tüm Dosyaların Dökümü** (`kumeDokumSatirlari`, küme sayfası) — bir
     Dosya Kümesindeki TÜM dosyaların `DosyaMasrafi` ve o kümeye ait
     `ParaTrafigiDagitimi` satırlarını (dosyalı veya dosyasız) tek bir
     kronolojik listede, `kaynak: "Masraf" | "Dağıtım"` rozetiyle ayırt
     ederek gösterir.
  3. **Dosya Bazında Döküm** (dosya detay sayfası) — aynı birleştirme,
     TEK bir dosyaya (kendi masrafları + o dosyaya bağlı dağıtım satırları)
     daraltılmış hâli.
  Her üçü de `DokumTablosu` bileşenini paylaşır (`src/modules/dava-dosyasi/
  components/dokum-tablosu.tsx`), salt-okunurdur — ekleme/silme için ilgili
  Masraflar/Para Trafiği ekranları kullanılır.

## Geliştirme Kutusu (Developer Inbox) — Kanban Panosu

`/kokpit/gelistirme-kutusu` (sadece Yönetici/Ortak), `GelistirmeTalebi`
modeli. Sohbette söylenen her istek/fikrin kaybolmadan sıraya girdiği,
sürükle-bırak (native HTML5 drag&drop, ek kütüphane yok) bir Kanban
panosu — 3 sütun: `beklemede` / `yapiliyor` / `tamamlandi`
(`gelistirme_talebi_durumu` seçenek listesi). Kart bir sütundan diğerine
sürüklenince `gelistirmeTalebiDurumTasi` server action'ı çağrılır.

**Kartların kaynağı iki türlü olabilir:**
- Kullanıcının panodaki formdan elle eklediği kartlar (`anahtar: null`).
- Claude'un konuşma sırasında `prisma/seed.ts` içindeki
  `GELISTIRME_TALEPLERI` dizisine eklediği, sabit bir `anahtar` (slug)
  taşıyan kartlar — bu dizi HER `npm run build`'da (dolayısıyla her
  production deploy'unda) `gelistirmeKutusunuSenkronizeEt()` tarafından
  senkronize edilir, ama SADECE eksik olan yeni maddeleri ekler; var olan
  bir kartın durumuna (kullanıcının panoda sürükleyerek değiştirdiği)
  bir daha ASLA dokunmaz (bkz. `secenekListeleriniOlustur`'daki aynı
  "sadece eksik olanı ekle" ilkesi). Böylece kullanıcı prod veritabanına
  hiç erişimim olmayan Claude'un (sandbox'tan sadece yerel geliştirme
  DB'sine erişimi var) yeni bir istek eklemesi, kod push'u + build'in
  kendisi üzerinden, kullanıcıdan hiçbir manuel form doldurma talep
  etmeden gerçekleşir. Ayrıca bkz. repo kökündeki `GELISTIRME_KUTUSU.md`
  — Claude'un konuşma sırasında ilk not aldığı, insan-okunur ham liste
  (kaynak metin burada tutulur, `seed.ts`'e oradan taşınır).

`Oneri` modelinden (ekran görüntülü, bölge seçimli geri bildirim)
bilinçli olarak ayrı ve daha basit tutuldu: tek alan (`metin`), ekran
görüntüsü yok.
- **Hukuki İlişki Türü (`DavaDosyasi.hukukiIliskiTuruId`)**: Dosya
  Türü'nden (ihtar/icra/dava — "hangi AŞAMADAYIZ") tamamen farklı, ikinci
  bir sınıflandırma boyutu: "hangi hukuki ARACA/ilişkiye dayanıyor"
  sorusuna cevap verir — `hukuki_iliski_turu` seçenek listesi: çek, senet,
  TTOK, iş hukuku uyuşmazlığı, sözleşme uyuşmazlığı, diğer. Tamamen
  opsiyonel (nullable, formda zorunlu değil).
- **"Yeni Dosya" formu temel veriye indirgendi**: Kullanıcı geri bildirimi
  — ekran gereğinden karmaşıktı, temel veri sadece karşı taraf isimleri,
  hukuki ilişki türü ve dosya numarası (hepsi opsiyonel) olmalıydı.
  Varsayılan görünürde kalan alanlar: Müvekkil, Karşı Taraf(lar), Hukuki
  İlişki Türü, Dosya Türü (zorunlu), Dosya No, Konu (zorunlu — kaydın
  başlığı olduğu için). Durum (varsayılan: Açık), Uyuşmazlık Grubu, Birim
  Adı, Bağlı Olduğu Esas Dosya, tarihler, Sorumlu Avukat ve Açıklama
  `DosyaDetaylar` (aç/kapa) bileşeniyle gizlendi — `ParaTrafigiDetaylar`
  ile aynı desen (Durum gizliyken de "Açık" varsayılanıyla önceden dolu,
  form yine geçerli kalıyor).
- **Bu ekranların "restorasyon modu"'u zaten Ayarlar'da var**: Kullanıcı
  bu ekrandaki "her türlü veri giriş panelini" kendisi düzenleyebilmek
  istedi. Dosya Türü, Hukuki İlişki Türü, Durum gibi TÜM açılır liste
  seçenekleri zaten `/kokpit/ayarlar/secenekler` (Seçenek Listeleri
  Yönetimi) üzerinden kod değişikliği gerekmeden eklenip/yeniden
  adlandırılıp/pasife alınabiliyor — bu, "restorasyon modu" kavramının
  tam karşılığı. Formun kendi ALAN YAPISI (hangi alanların var olduğu,
  sırası) ise kod tarafında kalıyor; bu ayrı, çok daha büyük bir
  form-builder özelliği olurdu ve bilinçli olarak yapılmadı.
- **Karşı Taraf (`KarsiTaraf`)**: Müvekkilin KENDİ müşterisi/borçlusu —
  yani büronun müvekkil adına icra/dava takip ettiği taraf (ör. "Koz
  Gıda", "Nasip Sac", "Hicret Kırtay"). Müvekkilin (`Musteri`) kendisiyle
  KARIŞTIRILMAMALI. Bir karşı tarafa birden fazla dava dosyası
  bağlanabilir (ör. Koz Gıda'ya karşı hem icra hem ihtiyati haciz hem
  icra ceza dosyası).
- **Bir dosyanın BİRDEN FAZLA karşı tarafı olabilir (`DosyaKarsiTarafi`)**:
  `DavaDosyasi <-> KarsiTaraf` ilişkisi `DosyaMuvekkili` ile aynı desende
  çoka-çok bir ara tablodur (önceden tekil `karsiTarafId` idi). Gerçek
  örnek: bir çek/bono zincirinde keşideci + cirantalar (ör. Nasip Sac
  keşideci, Mata Kauçuk ve Gençler Kauçuk cirantalar) genelde AYNI esas
  icra takibinde birlikte, müteselsil sorumlu olarak takip edilir — üç
  ayrı dosya değil, tek dosyaya bağlı üç karşı taraf. Buna karşın
  karşılıksız çek icra ceza davası SADECE keşideci hakkında açılır (bkz.
  ilgili grup örneği: "Mata Kauçuk Ticareti" grubunda esas icra dosyası
  Nasip Sac+Mata Kauçuk+Gençler Kauçuk'a birden açık, icra ceza dosyası
  ise sadece Nasip Sac'a karşı).
- **MAK (ayırt edici kod)**: Karşı tarafı isim çakışmasına karşı ayırt
  etmek için düşünülen ek bir alan (ör. çek seri no, VKN). **Şimdilik
  ERTELENDİ** — ileride "tür" (Müşteri/Çek No/vb.) seçilebilen bir
  seçenek listesi + değer alanı olarak eklenecek; bugün zorunlu değil.
- **Karşı Taraf formda TEK bir "yaz + Ekle" akışı, "var olan karşı
  taraflar" checkbox listesi YOK**: Eskiden iki ayrı bileşen vardı
  (`KarsiTarafSecici` - var olanlardan checkbox ile seç, `YeniKarsiTarafEkleyici`
  - yeni isim yaz) — kullanıcı bu checkbox listesinin kendisini
  ("kayıtlı karşı taraflar" listesi olarak görünmesini) istemedi.
  İkisi `KarsiTarafEkleyici` adında TEK bileşende birleştirildi
  (`src/modules/dava-dosyasi/components/karsi-taraf-ekleyici.tsx`):
  düzenleme modunda dosyaya zaten bağlı karşı taraflar chip olarak
  önceden dolu gelir (kaldırılabilir), yeni bir isim yazıp Ekle'ye
  basınca o da chip olur. Aynı karşı tarafın birden fazla dosyaya
  bağlanabilme özelliği (çek zincirindeki müteselsil sorumlular)
  KAYBOLMADI — `karsiTarafIdleriniCozumle` (actions.ts) yazılan ismi
  aynı müvekkil altında zaten var olan bir isimle (büyük/küçük harf
  duyarsız) eşleştirip AYNI kayda bağlar, kullanıcıya bu eşleşmeyi hiç
  göstermeden. Yani checkbox'lı "seçim" arayüzü kalktı, ama arka
  plandaki tekilleştirme/yeniden kullanma mantığı aynen duruyor.
- **Bloke Paralar**: Teminat, yakalama avansı, satış avansı, peşin
  yediemin ücreti vb. — dosya kapsamında geçici olarak tutulan, dava/
  icra sonuçlanınca iade edilecek tutarlar.
- **Cari Hesap — Borç/Alacak yönü**: Artık dosya bazında hesaplanır (bkz.
  `dosyaCariHesapOzeti` / Cari Hesap Özeti): her cari kod için Tasnif
  Edilen − Masraf Edilen = Bakiye; Akdi Vekalet Hesabı hariç tüm
  bakiyelerin toplamı pozitifse müvekkilin alacağı/avansı, negatifse
  borcu vardır. Eskiden `para_trafigi_tipi` üzerinden (tahsilat/borç/
  masraf_yansıtma) hesaplanıyordu; bu yön artık geçerli değildir (bkz.
  aşağıdaki Tip alanı değişikliği).
- **Cari Hesap Özeti sadece "Tahsil Edildi" olan tasnifi sayar**:
  `cariHesapOzetiHesapla`'yı çağıran `dosyaCariHesapOzeti` ve
  `uyusmazlikGrubuCariHesapOzeti`, tasnif toplamını hesaplarken
  `paraTrafigi.durum.kod === "tahsil_edildi"` şartını arar. Aksi halde
  "Beklemede" (henüz tahsil edilmemiş, ör. karşılıksız çek davası için
  faturalandırılmış ama ödenmemiş bir akdi vekalet ücreti) bir kayıt
  sanki para fiilen gelmiş gibi Tasnif Edilen'e dahil olur ve müvekkilin
  o kadar borcu/kullanılabilir avansı varmış gibi yanlış bir Bakiye
  gösterirdi. `DosyaMasrafi` (masraf tarafı) için böyle bir durum alanı
  yok — yapılan bir masraf zaten fiilen gerçekleşmiş kabul edilir, o
  yüzden `masrafWhere` tarafında filtre yok.
- **Para Trafiği Tipi = tasnifin baskın türü**: `para_trafigi_tipi`
  artık yön (gelen/giden) değil, müvekkilden gelen paranın tasnifteki
  BASKIN türünü ifade eder: `Masraf`, `Bloke Para`, `Akdi Vekalet`,
  `Aktarılacak Para (Emanet)`, `Karma`. Tek bir cari koda giden bir
  ödemede ilgili tip seçilir ve tasnif otomatik olarak (tutarın tamamı o
  cari koda) yazılır — tasnif alanları formda gösterilmez. Birden fazla
  cari koda bölünen ödemelerde `Karma` seçilir ve tasnif alanları elle
  doldurulur (bkz. `TIP_KOD_ILE_ESLESEN_CARI_KOD_KODU` eşleme tablosu,
  `src/modules/musteri/lib/actions.ts`). Eski değerler (Tahsilat, Borç,
  Masraf Yansıtma) geçmiş kayıtların bozulmaması için silinmedi, sadece
  `aktifMi=false` ile pasife alındı — yeni girişte seçilemezler.
- **Uyuşmazlık Grubu (`UyusmazlikGrubu`)**: Aynı alacağın/uyuşmazlığın
  tahsili için birden fazla karşı taraf ve dava dosyası gerekebilir (ör.
  asıl borçlu + protokol/bono temerrüdü sonrası devreye giren kefile
  karşı açılan ayrı "TTOK" dosyası — "aynı alacağın tahsilinde tekerrür
  olmasın" kaydıyla). `UyusmazlikGrubu`, müvekkil altında bu üst
  gruplamayı temsil eder (ör. "Asya Park Ticareti", "Hicret Kırtay İş
  Sözleşmesi"); her `DavaDosyasi` isteğe bağlı olarak bir gruba bağlanır.
  Gerçek örnek: "Asya Park Ticareti" grubu altında Ereğli(Konya) dosyası
  (asıl borçlu), Koz Gıda dosyası (çek), İhtiyati Haciz mahkeme dosyası
  (2026/353, farklı bir mahkeme — İstanbul 19 İcra'daki esas takipten
  AYRI bir dosyadır), Bakırköy Talimat Dosyası ve Oğuz Han Özçelik TTOK
  dosyası (kefil, temerrüt sonrası) bir arada tutulur.
- **Uyuşmazlık Grubu = asıl Borç/Alacak/Bakiye seviyesi**: Müvekkilin
  gözünden grup ayırt edici unsurdur ("bu parayı neye harcadınız?"
  sorusuna müvekkil grup ismiyle cevap verir, dosya numarasıyla değil).
  Müvekkilden istenen bir masraf avansı TEK bir dosyaya değil, TÜM
  gruba aittir — hangi dosyaya harcanırsa harcansın aynı ortak cari
  hesabın parçasıdır. Bu yüzden `uyusmazlikGrubuCariHesapOzeti()` (grup
  içindeki TÜM dosyalara bağlı tasnif+masraf toplamı) asıl gösterilecek
  Borç/Alacak/Bakiye'dir; `dosyaCariHesapOzeti()` (tek dosya) sadece
  "grup içinde hangi dosyaya ne kadar gitti" diye bakmak için bir alt
  kırılımdır. Grubun kendi sayfası: `/kokpit/dava-dosyalari/gruplar/[id]`.
- **Dosya Bağlantısı (`DavaDosyasi.bagliOlduguDosyaId`)**: Talimat
  dosyası gibi başka bir dosyanın uzantısı olan (o dosyaya SIKI SIKIYA
  bağlı, tekil) dosyalar için kullanılır — kendi kendine referans veren
  bir alan. `UyusmazlikGrubu`'ndan farkı: grup gevşek bir gruplamadır
  (aynı alacağın BAĞIMSIZ kardeş dosyaları — icra ceza, ihtiyati haciz
  gibi, hiçbiri "diğerinin uzantısı" değildir), bu alan ise "bu dosya
  SOMUT OLARAK şu belirli esas dosyanın bir eki/talimatıdır" gibi kesin,
  tekil bir bağı ifade eder. Örnek: Bakırköy Talimat Dosyası'nın
  `bagliOlduguDosyaId`'si Koz Gıda esas icra dosyasını gösterir.
- **Dosya Masrafı (`DosyaMasrafi`)**: Bir dosyaya iliişkin tek tek masraf
  kalemleri (harç, pul, dava masrafı, haciz avansı vb.) — gerçek
  muhasebe dökümlerindeki kalem-kalem yapıyı birebir yansıtır. Her kalem
  bir cari koda (Bloke Paralar, Masraf Hesabı vb.) ve bir masraf türüne
  (`masraf_turu` seçenek listesi) bağlıdır. `ParaTrafigiTasnif` ile
  ilişkisi: tasnif = paranın GELİRKEN cari kodlara dağılımı (özet/kontrol
  toplamı); `DosyaMasrafi` = o cari koddan SONRADAN yapılan harcamaların
  detayı. İkisi ayrı mekanizmalardır; bir cari kodun tasnif tutarı ile o
  kod altındaki masraf kalemlerinin toplamı arasındaki fark, o cari
  koddaki HARCANMAMIŞ/kalan bakiyedir (hata değildir).
- **Karşı Taraftan Alacaklarımız (`KarsiTarafAlacagi`)**: Müvekkil cari
  hesabından (tasnif/`DosyaMasrafi`) BİLEREK ayrı bir mekanizma. Bu,
  cebimizden çıkan bir para DEĞİL — karşı tarafın (borçlunun) dava/icra
  sonucu bize/müvekkile ayrıca ödemesi gereken bir alacaktır (ör. icra
  vekalet ücreti, yargılama gideri). Akdi vekalet ücretinden farkı:
  akdi vekalet müvekkilin bize ödediği ücrettir (zaten tahsil edilmiş
  sayılır); karşı taraf alacağı ise HENÜZ TAHSİL EDİLMEMİŞ, borçludan
  beklenen ayrı bir tutardır. Evrensel hukuk bürosu pratiğinde müvekkil
  emanet hesabı (trust account) ile büronun/müvekkilin üçüncü taraflardan
  alacağı hep ayrı muhasebeleşir — bu ayrım kasıtlıdır, birleştirilmemeli.
  Dosya detay sayfasında Cari Hesap Özeti'nden ayrı, kendi tutar/açıklama/
  tahsil-durumu alanlarıyla tutulur.
- **Cari Kodlar — beşinci kod "Emanet Hesabı"**: `Bloke Paralar`,
  `Masraf Hesabı`, `Akdi Vekalet Hesabı`, `Ticari Hesap`'a ek olarak
  `Emanet Hesabı` eklendi — para büronun geliri DEĞİL, müvekkilin de
  doğrudan kendisine dönmeyecek, ÜÇÜNCÜ BİR TARAFA (başka bir icra
  dosyası, ilamlı takip, yediemin/kayyum vb.) ödenmek üzere geçici
  tutulan tutarlar için (uluslararası hukuk bürosu pratiğindeki "trust/
  client account" karşılığı). `Ticari Hesap`'tan farkı: Ticari Hesap
  nihayetinde MÜVEKKİLE ödenir, Emanet Hesabı nihayetinde BAŞKA BİR
  YERE ödenir. Yalnızca `Akdi Vekalet Hesabı` büronun kesin/geri dönüşü
  olmayan geliri olduğu için Borç/Alacak net hesabına dahil edilmez;
  diğer tüm kodlar (Emanet Hesabı dahil) müvekkile ait sayılır.
- **"Karma" ödeme**: Ayrı bir cari kod DEĞİLDİR — bir tahsilatın tasnifi
  birden fazla cari koda bölündüğünde (tasnif ekranında birden fazla
  alan doluysa) o ödeme zaten emergent olarak "karma" sayılır.
- **Para Trafiği kaydı düzenleme (`paraTrafigiKaydiGuncelle`)**: Önceden
  bir `MusteriParaTrafigi` kaydı sadece silinip yeniden girilebiliyordu
  (ör. Beklemede bir tutarı Tahsil Edildi'ye çevirmek için tüm kaydı silip
  yeniden yazmak gerekiyordu). `ParaTrafigiFormu` artık isteğe bağlı bir
  `duzenlemeVerisi` prop'uyla hem oluşturma hem düzenleme modunda
  kullanılabiliyor (`/kokpit/finans/musteri-iliskileri/[id]/cari-hesap/
  [kayitId]/duzenle`, listede "Düzenle" bağlantısı). Güncelleme, mevcut
  `ParaTrafigiTasnif`/`ParaTrafigiDosyasi` satırlarını silip formdan gelen
  değerlerle yeniden oluşturur (kısmi patch değil, tam yer değiştirme) —
  `paraTrafigiKaydiEkle` ile aynı tip→cari-kod eşleme mantığını kullanır.
  Silme gibi bu da `yetki.ts`'teki "oluşturma/düzenleme herkese açık, sadece
  silme Yönetici/Ortak'a özel" politikasına tabidir.
- **Masraf kaydı düzenleme (`dosyaMasrafiGuncelle`)**: Aynı gerekçeyle
  `DosyaMasrafi` için de eklendi — bir kalemin cari kodu gerçek hayatta
  değişebilir (ör. Bloke Para olarak tutulan bir araç yakalama avansı,
  araç yediemine çekilip icra müdürlüğüne bildirildiğinde artık kalıcı bir
  masrafa/Masraf Hesabı'na dönüşebilir). Silinip yeniden girmek yerine
  `/kokpit/dava-dosyalari/[id]/masraflar/[masrafId]/duzenle` üzerinden aynı
  satırın cari kodu/türü/tutarı/açıklaması güncellenir.
- **`MusteriParaTrafigi.uyusmazlikGrubuId` UI'a bağlandı**: Bir ödeme artık
  `ParaTrafigiFormu`'ndaki "Uyuşmazlık Grubu (opsiyonel)" alanından
  doğrudan bir gruba bağlanabilir, hiçbir dosya seçilmeden — ör. henüz
  dosyası açılmamış planlanan bir haciz işlemi için istenen avans, esas
  dosya + o haciz işleminin genelini kapsadığından tek bir dosyaya değil
  doğrudan gruba yazılır. `uyusmazlikGrubuCariHesapOzeti` artık iki yoldan
  gelen tasnifi birleştirir: dosyalar üzerinden (mevcut) VEYA doğrudan
  `uyusmazlikGrubuId` eşleşmesiyle (yeni) — `dosyaCariHesapOzeti` (tek
  dosya seviyesi) bu şekilde bağlanan kayıtları hiç göstermez, sadece grup
  sayfasında görünürler.
- **Cari Hesap Özeti'nde basit 3 kutu özet**: Detaylı cari-kod kırılımının
  üstüne "Müvekkilden Alınan Paralar / Müvekkil Adına Yapılan Harcamalar /
  Müvekkilin Bize Borcu (veya Alacağı)" şeklinde 3 büyük, sade rakam
  eklendi — asıl soruyu (müvekkile ne kadar para geldi, adına ne kadar
  harcandı, net kim kime borçlu) karmaşık kırılıma bakmadan cevaplar;
  detaylı tablo altında hâlâ durur, denetim/kontrol için.
- **`musteriCariHesapOzeti` + Müvekkil Cari Hesap sayfasında özet**: Aynı 3
  kutulu özet artık müvekkilin kendi Finans/Cari Hesap sayfasında da
  (tüm grup/dosyalarının toplamı olarak) görünüyor — önceden bu sayfa
  sadece ham Para Trafiği formu+listesiydi, kullanıcı "kullanıcı burada
  karmaşık bir yapı görüyorum" geri bildirimini verdi çünkü üstte hiçbir
  özet yoktu, sadece uzun bir form ve (uzun açıklamalı) satırlar vardı.
- **Para Trafiği formu sadeleştirildi**: Kaynak/Dosya Seçici/Uyuşmazlık
  Grubu alanları güncel kullanımda nadiren değiştirilen "ileri düzey"
  alanlardır — `ParaTrafigiDetaylar` (aç/kapa) bileşeniyle varsayılan
  gizlendiler (Kaynak varsayılan olarak "Manuel" ile önceden dolduruluyor,
  gizliyken de form geçerli kalıyor). Düzenleme modunda ya da bu
  alanlardan biri zaten doluysa otomatik açık başlar. Formda görünür kalan
  alanlar: Tarih, Tip(+Tasnif), Tutar, Durum, Açıklama.
- **Para Trafiği listesinde uzun açıklamalar kırpılıyor**: `line-clamp-2`
  ile açıklama hücresi 2 satırda kesiliyor (tam metin `title` tooltip'inde)
  — önceden çok satırlı bir açıklama satırın tamamen boyunu şişirip
  tabloyu "karmaşık" gösteriyordu.

## Menü Düzeni (admin sürükle-bırak)

`/kokpit/ayarlar/menu`, `MenuOgesi` modeli. Kullanıcının "sol menüyü
doğrudan kendim kurayım" talebine cevap — ama sınırı net: bir modülün
HANGİ SAYFAYA gittiği, adı, "henüz geliştirilmedi" durumu hâlâ
`modul-kayit-defteri.ts`'de (kod) kalır, çünkü bunlar gerçek bir route'a
bağlıdır ve sadece kod değişikliğiyle eklenebilir. Admin'in değiştirdiği
SADECE iki şey: modüllerin SIRASI (sürükle-bırak, `menuYenidenSirala`) ve
GÖRÜNÜR/GİZLİ olması (`menuGorunurlukDegistir`) — tıpkı Seçenek Listeleri
paterni gibi ("içerik" admin'e açık, "yapı" kod tarafında kalır).
`Ayarlar` kendisi gizlenemez (sunucu tarafında da engellenir) — aksi
halde kullanıcı bu ayarı bir daha değiştirebileceği ekrana kolayca
ulaşamazdı. `seed.ts`'teki `menuOgeleriniOlustur`, `GelistirmeTalebi` ile
aynı ilkeyle çalışır: sadece kod tarafında yeni eklenmiş ama henüz
veritabanında karşılığı olmayan modülleri varsayılan sırada ekler, admin'in
yaptığı sıralama/gizleme değişikliğine bir daha asla dokunmaz.

## Form Alan Düzeni (admin sürükle-bırak — formların içi)

`/kokpit/ayarlar/form-duzeni`, `FormAlanDuzeni` modeli. Menü Düzeni'nin
aynı ilkesinin formlara uygulanmış hali: "Yeni Dosya" formundaki her
küçük düzenleme isteği (alan sırası, hangi alan gizli) beni (Claude)
gerektiriyordu — kullanıcı bunu "formların içini de ben kurabilmeliyim"
diye talep etti. Bilinçli sınır: bu tam bir form-builder (herhangi bir
alan tipini sıfırdan yaratma) DEĞİL — o çok daha büyük ve riskli bir
özellik olurdu. Kodda tanımlı sabit bir alan kümesi içinde admin sadece
SIRA ve GÖRÜNÜR/GİZLİ değiştirir; `formAnahtari` ile birden fazla form
aynı tabloyu paylaşır (şimdilik sadece `"dava-dosyasi"` bağlı — bkz. Faz 2
notu altta).

**Üç seviyeli alan sınıflandırması** (`dava-dosyasi-formu.tsx`):
1. **Sabit/kilitli** — Müvekkil ve Karşı Taraf seçiciler. `FormAlanDuzeni`
   tablosuna hiç girmezler, admin ekranında salt bilgi amaçlı "Sabit"
   rozetiyle gösterilirler. Gerekçe: tekil scalar input değiller, kendi
   ilişkisel çoklu-seçim/yeni-kayıt-oluşturma mantıkları var.
2. **Sürüklenebilir ama gizlenemez** (`turId, konu, durumId, acilisTarihi`)
   — `davaDosyasiOlustur`/`davaDosyasiGuncelle` bunları DB'den bağımsız
   olarak EK OLARAK zorunlu kılıyor (`actions.ts` satır ~72-130); admin
   panelinde "Zorunlu" rozeti gösterilir, gizleme isteği sunucu tarafında
   da (`DAVA_DOSYASI_GIZLENEMEZ_ALANLAR`) sessizce yok sayılır.
3. **Tam admin kontrolünde** (8 alan: `hukukiIliskiTuruId, dosyaNo,
   birimAdi, uyusmazlikGrubuId, bagliOlduguDosyaId, kapanisTarihi,
   sorumluAvukatId, aciklama`) — DB'de opsiyonel VE action tarafından
   zorunlu kılınmıyor, admin sırasını VE görünürlüğünü değiştirebilir.

**Kritik veri bütünlüğü mekanizması**: bir alan admin tarafından
gizlendiğinde DOM'dan TAMAMEN kaldırılmaz — yerine mevcut değerini
taşıyan bir `<input type="hidden">` render edilir. Neden: aksi halde
düzenleme modunda o alanın formData'da hiç gelmemesi, sunucu tarafındaki
`metinYaAlNull` yardımcısı tarafından `null`a çevrilip VAR OLAN veriyi
SİLERDİ (Playwright ile uçtan uca doğrulandı: birimAdi dolu bir dosya →
Birim Adı'nı gizle → düzenle ekranını hiç değiştirmeden kaydet → değer
veritabanında hâlâ duruyor).

Eski `DosyaDetaylar` "+ Detaylar" aç/kapa bileşeni bu formdan tamamen
kaldırıldı (silindi) — admin artık istemediği alanı doğrudan gizlediği
için o katman gereksizdi.

**Paylaşılan sürükle-bırak bileşeni**: `Menü Düzeni`de yazılan native
HTML5 drag&drop mantığı (`src/core/menu/menu-duzeni-listesi.tsx`), ikinci
gerçek kullanım (form alanları) ortaya çıkınca `src/core/ui/
siralanabilir-liste.tsx`'e (`SiralanabilirListe`) genellenmiş bileşen
olarak çıkarıldı; hem Menü Düzeni hem Form Düzeni artık bunun ince birer
sarmalayıcısı (DB/server action'lardan habersiz, sadece `onSirala`/
`onGorunurlukDegistir` callback'leri alır).

**Faz 2 (devam ediyor)**: Aynı mekanizma diğer formlara tek tek, ayrı
oturumlarda genişletiliyor — `karsi-taraf-alacagi-formu` ve
`masraf-formu`'nun tüm alanları zorunlu olduğu için düşük öncelikli.
- ✅ `musteri-formu` (Yeni Müvekkil Formu) — tamamlandı. Zorunlu/
  gizlenemez alanlar: `adSoyadUnvan, tipId, durumId` (bkz.
  `core/form-duzeni/musteri-alanlari.ts`). Diğerleri (telefon, eposta,
  adres, sorumluAvukatId, notlar) admin tarafından sıralanıp
  gizlenebilir. `formAlanDuzeniOlustur` (seed.ts) genel amaçlı hale
  getirildi (`formAnahtari` + alan sırası parametre) — yeni form
  eklerken artık tekrar yazılmıyor, sadece çağrılıyor.
- ⏳ `para-trafigi-formu`, `irtibat-kisisi-formu` — henüz yapılmadı.

## Haciz Raporu (Haciz Artçıları)

Sahaya çıkan haciz avukatlarının doldurduğu raporu — eskiden bir Google
Form + Google Drive üzerinden yürütülüyordu — Kokpit'e taşıyan modül
(`src/modules/haciz-raporu`, `src/app/kokpit/haciz-artcilari`).

- **Dosya bağlantısı**: Google Form'daki serbest metin "Esas/Talimat
  İcra ve Dosya No" alanları yerine, `HacizRaporu.davaDosyasiId` doğrudan
  sistemdeki bir `DavaDosyasi` (tur=`icra_dosyasi`) kaydına bağlanır.
  Dosya sistemde henüz yoksa avukat önce `/kokpit/dava-dosyalari/yeni`den
  oluşturur, sonra bu formda seçer — ayrı bir "dosyayı formun içinden
  oluştur" akışı BİLİNÇLİ OLARAK eklenmedi (DavaDosyasi'nin zorunlu
  alanları - Dosya Kümesi, müvekkil vb. - haciz formunda tekrar etmek
  yerine mevcut, test edilmiş oluşturma akışı yeniden kullanılır).
- **Yetki**: Panel YONETICI/ORTAK/SORUMLU_AVUKAT'a GÖRÜNÜR; yeni rapor
  girişi/silme de aynı üç role açık (PERSONEL hariç) - bkz.
  `core/auth/yetki.ts` → `hacizAvukatiMi`.
- **Belgeler**: Avukatın yüklediği taramalar (Haciz Tutanağı, Protokol,
  fotoğraflar) `Belge` tablosunda meta veri olarak, dosyanın kendisi
  Vercel Blob'da (`access: "private"`) tutulur — DB'ye asla girmez (bkz.
  `lib/depo.ts`). **"Haciz Raporu.pdf" bir Belge DEĞİLDİR** — form
  verisinden HER indirmede taze üretilir (`lib/pdf.tsx`,
  `renderToBuffer`), ayrıca saklanmaz; böylece avukat görüşünü sonradan
  güncellerse rapor PDF'i de otomatik güncel kalır.
- **Mobil yükleme mimarisi (KRİTİK)**: Haciz avukatları sahada çoğunlukla
  telefonla çalışıyor - kamera fotoğrafları kolayca birkaç MB'a ulaşır.
  Dosyalar bu yüzden bir Server Action'a GÖNDERİLMEZ - Next.js Server
  Action'larının govdesi varsayılan olarak 1MB'la sınırlıdır
  (`experimental.serverActions.bodySizeLimit`) ve Vercel'in platform
  seviyesindeki istek boyutu sınırı (~4.5MB) zaten bunu aşardı; birkaç
  fotoğraf bunu anında kırardı. Bunun yerine dosyalar tarayıcıdan
  DOĞRUDAN Vercel Blob'a yüklenir (bkz. `components/dosya-yukleme-
  alani.tsx`, `@vercel/blob/client`'in `upload()` fonksiyonu):
  `/api/haciz-raporu/blob-upload` (`handleUpload`) sadece kısa ömürlü,
  tek-dosyaya-özel bir token üretir (token üretmeden önce oturum +
  `hacizAvukatiMi` rol kontrolü yapılır - aksi halde oturumsuz herkes
  Blob deposuna keyfi dosya yükleyebilirdi); asıl dosya baytları hiç
  sunucumuzdan geçmez. Form gönderimi (`hacizRaporuOlustur`) sadece
  küçük url + meta veri (ad/mime/boyut) alır - hep hızlı/küçük kalır.
  "Gönder" butonu, herhangi bir dosya hâlâ yüklenirken PASİFTİR (bkz.
  `haciz-gonder-butonu.tsx`) - aksi halde zayıf sinyalde tamamlanmamış
  bir yükleme sessizce forma hiç girmeden kaybolabilirdi. Gerçek bir
  tarayıcıda (Playwright) doğrulandı: dosya seçilince yükleme başlıyor,
  buton "Dosyalar yükleniyor…" oluyor, hiçbir JS hatası oluşmuyor -
  gerçek Blob deposuna erişim bu ortamdan test edilemedi (ağ kısıtı),
  SDK'nın kendi retry mekanizması ağ hatasında düzgün şekilde tekrar
  deniyor (crash yok).
- **Türkçe font sorunu**: `@react-pdf/renderer`'ın varsayılan Helvetica'sı
  İ/ı/Ş/ç gibi Türkçe karakterleri YANLIŞ basıyor (test sırasında
  yakalandı - "HACİZ" yerine "HAC0Z" gibi çıktı veriyordu). Çözüm:
  Liberation Sans (SIL Open Font License) `lib/yazi-tipleri/
  liberation-sans.ts` içine base64 data URL olarak GÖMÜLÜ - bir dosya
  yoluna (fs) BİLEREK değil, çünkü Vercel'in sunucusuz fonksiyon
  paketleme (file tracing) mekanizması düz bir string dosya yoluna
  referans veren kodu her zaman güvenilir biçimde yakalamayabilir; data
  URL saf bir JS sabiti olduğu için bu riski tamamen ortadan kaldırır.
  Bu fontta da Türk Lirası işareti (₺) YOK - bu yüzden PDF'te tutar "₺"
  değil "... TL" olarak yazılır (web arayüzünde hâlâ ₺ kullanılır, sorun
  sadece gömülü PDF fontunda).
- **E-posta bildirimi** (`lib/bildirim.ts`): Her yeni haciz raporu
  kaydedildiğinde `info@eceshukuk.com` ve `bora.colakoglu@eceshukuk.com`
  adreslerine, rapor özetini içeren bir HTML e-posta gönderilir
  (`resend` paketi, `core/email/resend-istemcisi.ts`). **Best-effort**:
  `RESEND_API_KEY` tanımlı değilse ya da Resend API'sine erişilemezse
  fonksiyon sadece `console.warn`/`console.error` yazıp sessizce döner -
  ASLA hata fırlatmaz, çünkü zaten veritabanına kaydedilmiş bir raporun
  sırf bildirim e-postası gönderilemedi diye kullanıcıya hata olarak
  gösterilmesi/kaydın geri alınması yanlış olurdu. Alıcı listesi şimdilik
  kod içinde sabit (`BILDIRIM_ALICILARI`) - kişi bazlı/yapılandırılabilir
  hale getirilmesi istenirse tek satırlık bir değişiklik.
  - **Kurulum gereksinimi**: [resend.com](https://resend.com)'da bir hesap
    açılıp `RESEND_API_KEY` Vercel ortam değişkeni olarak eklenmeli. Bu
    adım bu oturumdan yapılamadı (ağ kısıtı + Vercel dashboard erişimi
    yok) - gerçek bir e-posta gönderimi test EDİLEMEDİ, sadece
    "API anahtarı yoksa çökmüyor" yolu doğrulandı.
  - Varsayılan gönderen adresi Resend'in kendi sandbox adresi
    (`onboarding@resend.dev`) - `eceshukuk.com` Resend'de doğrulanmış bir
    domain olarak eklenirse `HACIZ_RAPORU_BILDIRIM_GONDEREN` ortam
    değişkeniyle örn. `Kokpit <bildirim@eceshukuk.com>` yapılabilir.
    Resend'in sandbox gönderen adresinin güncel gönderim
    kısıtlarını (hangi alıcılara ulaşabildiğini) bu ortamdan
    doğrulayamadık - resend.com dokümantasyonundan kontrol edilmeli.
- **Tek tıkla indirme**: `/kokpit/haciz-artcilari/[id]/indir` (route
  handler) haczin tarihini taşıyan TEK bir klasör içinde - Haciz
  Tutanağı, Protokol ve Haciz Raporu ayrı PDF'ler, fotoğraflar orijinal
  formatlarında - bir ZIP (`jszip`) üretip döner. Yerel bir Postgres +
  gerçek `next build`/`next start` ile uçtan uca doğrulandı (sahte 3
  saniyelik gecikme eklenerek DEĞİL - gerçek dosya/klasör içeriği
  üretilip PDF olarak okunarak).
- **Kurulum gereksinimi**: Bu modülün çalışması için Vercel projesine bir
  **Blob deposu** bağlanması ve `BLOB_READ_WRITE_TOKEN` ortam
  değişkeninin otomatik oluşması gerekir (Vercel Dashboard → Storage →
  Create Database → Blob) - bu adım bu oturumdan yapılamadı (bkz. ağ
  kısıtı), kullanıcı tarafından tamamlanmalı.

## Kullanıcılar (Ayarlar > Kullanıcılar)

- Uygulamada self-servis kayıt/davet akışı YOK - tek giriş kapısı
  `src/app/kokpit/ayarlar/kullanicilar/page.tsx`. YONETICI/ORTAK
  (`silebilirMi`) buradan personel/avukat için e-posta+geçici şifre+rol
  ile hesap açar (`sifreyiHashle` ile bcrypt) ve mevcut hesapların
  girişini aç/kapa (`aktifMi`) yapabilir - şifre sıfırlama henüz yok,
  şimdilik yeni bir hesap açılması gerekir.
- **Rol yükselmesi engeli** (`core/kullanici/rol-etiketleri.ts`,
  `atanabilirRoller`): YONETICI rolü sistem yöneticiliği anlamına geldiği
  için sadece mevcut bir YONETICI başka bir YONETICI oluşturabilir/
  durumunu değiştirebilir - bir ORTAK'ın formda bu rolü görmesi/ataması
  engellenir (hem formda hem server action'da).
- **Kendi kendini kilitleme engeli**: Bir kullanıcı kendi satırındaki
  aç/kapa butonunu göremez, server action da kendi id'sine karşı
  çağrılırsa hata fırlatır.
- **Mimari not**: `KullaniciDurumButonu` (aç/kapa butonu) ayrı, küçük bir
  "use client" sarmalayıcı olarak var - sebebi, bir Server Component'ten
  (page.tsx) `OnayliButon`'a doğrudan `() => sunucuAction(...)` gibi bir ok
  fonksiyonu GEÇİRİLEMEMESİ (yalnızca "use server" ile işaretli
  fonksiyonların kendisi Server->Client sınırını geçebilir, onu saran yeni
  bir fonksiyon geçemez - build zamanı değil, çalışma zamanı hatası
  olarak ortaya çıkar). Closure bu yüzden zaten "use client" olan küçük
  sarmalayıcının içinde kurulur.

## PWA

- `public/manifest.json` + `public/sw.js`: kullanıcılar Chrome/Safari'nin
  "Ana ekrana ekle" özelliğiyle KOKPİT'i bir uygulama ikonu olarak
  yükleyebilir; `display: standalone` sayesinde tarayıcı arayüzü olmadan
  açılır.
- Servis çalışanı (service worker) ilk faz için minimaldir (agresif
  önbellekleme yapmaz); sadece yüklenebilirlik kriterini karşılar ve son
  görülen sayfaların temel bir çevrimdışı deneyimini sağlar.
- **`src/app/favicon.ico` BİLEREK YOK** (bir ikon değişikliğinin tarayıcı
  sekmesinde hiç görünmemesi üzerine kök nedeni bulunup kaldırıldı):
  Next.js bu özel dosyayı her zaman sabit `/favicon.ico` adresinde sunar
  (bkz. Next.js "favicon, icon, and apple-icon" API referansı) - adres
  hiçbir zaman değişmediği için `?v=` sorgu parametresiyle önbellek
  kırmak mümkün değil, tarayıcılar da favicon.ico'yu normal HTTP
  önbellek kurallarından bağımsız, alışılmadık derecede ısrarla
  önbellekte tutar. Sekme ikonu artık SADECE `layout.tsx`'teki
  `metadata.icons.icon` üzerinden, versiyonlanabilir
  `/icons/favicon-32.png?v=N` linkiyle sağlanır - her ikon
  değişikliğinde `?v=` numarası artırılmalı (bkz. o dosyadaki yorum).
