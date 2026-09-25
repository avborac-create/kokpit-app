# Geliştirme Kutusu

Sohbette söylenen, henüz kod olarak hayata geçmemiş her geliştirme
isteğinin/fikrinin tutulduğu basit liste. Bunu Claude kendisi günceller —
manuel giriş gerekmez, sadece konuşurken söylemeniz yeterli.

Sıra: Beklemede → Yapılıyor → Tamamlandı (yukarıdan aşağı, girildiği sırayla
işlenir).

## Beklemede

- "Borç Tahsilatları" tasnif menüsü (Dosya Ekonomisi sekmesi altına):
  borçludan gelen bir tahsilatı resmi masraf/müvekkil payı/vekalet ücreti
  gibi kalemlere bölme, "Bloke Paralar" kalemini tek tuşla Adli Birim cari
  hesabına aktarma. Üç tasarım seçeneği (Tek Ekranda Bölüştürme / Sihirbaz /
  Liste+Modal) hazırlandı, hangisinin uygulanacağı kararı bekleniyor.
- Pilot müvekkil "Tınaz Kauçuk"un KOZ GIDA ve sonrasındaki TÜM dosyalarının
  ekonomisi ile Müvekkil Ekonomisi'nin (muhtemelen veri girişi ağırlıklı,
  hızlı) halledilmesi.
- Haciz Raporu modülünü Vercel Blob'suz (sunucuda kalıcı depolama olmadan)
  yeniden kurmak: yüklenen belgeler (Haciz Tutanağı, Protokol, Fotoğraflar)
  saklanmak yerine doğrudan info@eceshukuk.com'a mail olarak gönderilsin.
  Vercel'den başka bir sunucuya taşınma sürecinin bir parçası olarak,
  Vercel Blob bağımlılığını tamamen ortadan kaldırmak için.
- Vercel'den arct.cloud üzerinde bir VPS'e taşınma: cold start sorununu
  kalıcı ve garantili çözer. Veritabanı (Prisma Postgres) ve dosya
  depolama aynı kalabilir, sadece uygulamanın çalıştığı yer değişir.
- Mobilde (Kokpit No/Dosya No/Tür/Birim gibi) tablo satırları çok uzun
  görünüyor — özellikle "Tür" hücresindeki uzun etiketler ("İcra Dosyası
  (Esas İcra Dosyası)" gibi) satırı gereksiz büyütüyor. Satır yüksekliği en
  fazla 2 satır metin kadar olacak şekilde revize edilmeli (kırpma/kısaltma,
  daha kompakt mobil düzeni ya da tablo yerine kart görünümü ele alınabilir).
- Dosya silme iş akışı: (1) Silmek isteyen kişi yetkiliyse şifre girmesi
  istenir; değilse 2'ye geç. (2) Yöneticiye silme talebi gider. (3) Talep
  uygun görülürse 1'e dön (şifre sorulup silme tamamlanır).
- Dosya silindiğinde geri getirme (restore) seçeneği mutlaka olmalı —
  silme işlemi kalıcı olmamalı, silinen dosyalar geri yüklenebilmeli.
- Kokpit No formatı "KP-0006" yerine "KN-1" şeklinde olsun (baştaki
  sıfırlar kaldırılsın) ve KN-999'a, gerekirse daha da ileriye kadar
  gidebilsin.

## Yapılıyor

- Dosya kartına "Müvekkil Paneline Git" butonu: Müvekkil Finans modülüne
  doğrudan bağlantı, orada müvekkille aramızdaki ANA cari hesabı (dosya
  bazlı cari hesaplardan ayrı, konsolide) görebilmek ve evrensel muhasebe
  standartlarına uygun biçimde farklı cari kodlar arasında virman
  yapabilmek. (Not: "Müvekkil Kümesi" kavramı bilerek kullanılmıyor.)

## Tamamlandı

- Dosyalar listesinden/detayından kayıtları manuel düzenleme ve silme imkanı
  — ana Dosyalar listesine ve Finans > müvekkil sayfasındaki Dosyalar
  tablosuna "İşlemler" sütunu (Düzenle/Sil) eklendi. (Panodaki karşılık
  kart hâlâ "Beklemede"de duruyor — DB'ye yazamadığım için elle
  "Tamamlandı"ya sürüklemeniz gerekiyor.)
- Dosyalar tablosundaki sütunların admin tarafından manuel olarak yeniden
  sıralanabilmesi (dinamik sütun sırası) — Ayarlar > Sütun Düzeni sekmesi
  eklendi, Dosyalar tablosu artık bu sıraya/görünürlüğe göre render
  ediliyor. (DB migration'ı deploy'da otomatik uygulanacak; kod pushlandı
  ama gerçek ortamda test edemediğim için elle "Tamamlandı"ya
  sürüklemeniz gerekiyor.)
- "Müvekkil(ler)" ibaresi uygulamanın her yerinde "Müvekkil" olarak
  değiştirildi (Dosyalar tablosu, dosya detayı, Yeni Dosya formu, Form
  Düzeni ayarları). (Aynı gerekçeyle elle "Tamamlandı"ya taşımanız
  gerekiyor.)
