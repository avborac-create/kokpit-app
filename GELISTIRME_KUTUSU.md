# Geliştirme Kutusu

Sohbette söylenen, henüz kod olarak hayata geçmemiş her geliştirme
isteğinin/fikrinin tutulduğu basit liste. Bunu Claude kendisi günceller —
manuel giriş gerekmez, sadece konuşurken söylemeniz yeterli.

Sıra: Beklemede → Yapılıyor → Tamamlandı (yukarıdan aşağı, girildiği sırayla
işlenir).

## Beklemede

- Dosyalar tablosundaki sütunların admin tarafından manuel olarak yeniden
  sıralanabilmesi (dinamik sütun sırası).
- Dosyalar menüsü altına "Yargı Dosyaları" başlığı eklenip bunun altının
  İcra Dosyaları ve Dava Dosyaları olarak ikiye ayrılması. Her dosyanın
  kendi kart görünümü olmalı; karta tıklanınca o dosyayla ilgili kayıtlar
  (işlemler, evraklar, para trafiği vb.) okunabilmeli.
- Sayfa geçişlerindeki ~2 saniyelik gecikme giderilmeli. Kod incelemesinde
  görülen muhtemel nedenler: (1) liste sayfaları (Dosyalar/Kümeler, Avukat
  Şapkası, Karar Sonrası Takip vb.) sayfalama olmadan TÜM kayıtları derin
  `include` ilişkileriyle tek seferde çekiyor; (2) hiçbir route'ta
  `loading.tsx`/Suspense iskeleti yok, kullanıcı sorgu bitene kadar boş
  ekran görüyor; (3) Seçenek Listeleri/Menü/Form Düzeni gibi durağan
  referans verileri her istekte yeniden sorgulanıyor (cache yok). Çözüm
  yönü: liste sorgularına sayfalama/limit eklenmesi, gereksiz `include`
  dallarının daraltılması, en az trafikli route'lara `loading.tsx`
  eklenmesi, durağan verilerin `unstable_cache`/`revalidate` ile
  önbelleklenmesi.
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

_(şu an yok)_

## Tamamlandı

- Dosyalar listesinden/detayından kayıtları manuel düzenleme ve silme imkanı
  — ana Dosyalar listesine ve Finans > müvekkil sayfasındaki Dosyalar
  tablosuna "İşlemler" sütunu (Düzenle/Sil) eklendi. (Panodaki karşılık
  kart hâlâ "Beklemede"de duruyor — DB'ye yazamadığım için elle
  "Tamamlandı"ya sürüklemeniz gerekiyor.)
