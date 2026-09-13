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

## PWA

- `public/manifest.json` + `public/sw.js`: kullanıcılar Chrome/Safari'nin
  "Ana ekrana ekle" özelliğiyle KOKPİT'i bir uygulama ikonu olarak
  yükleyebilir; `display: standalone` sayesinde tarayıcı arayüzü olmadan
  açılır.
- Servis çalışanı (service worker) ilk faz için minimaldir (agresif
  önbellekleme yapmaz); sadece yüklenebilirlik kriterini karşılar ve son
  görülen sayfaların temel bir çevrimdışı deneyimini sağlar.
