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
satır eklenir ya da ileride bir yönetim ekranından eklenir).

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

## PWA

- `public/manifest.json` + `public/sw.js`: kullanıcılar Chrome/Safari'nin
  "Ana ekrana ekle" özelliğiyle KOKPİT'i bir uygulama ikonu olarak
  yükleyebilir; `display: standalone` sayesinde tarayıcı arayüzü olmadan
  açılır.
- Servis çalışanı (service worker) ilk faz için minimaldir (agresif
  önbellekleme yapmaz); sadece yüklenebilirlik kriterini karşılar ve son
  görülen sayfaların temel bir çevrimdışı deneyimini sağlar.
