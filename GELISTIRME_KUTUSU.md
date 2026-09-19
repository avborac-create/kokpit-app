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

## Yapılıyor

_(şu an yok)_

## Tamamlandı

- Dosyalar listesinden/detayından kayıtları manuel düzenleme ve silme imkanı
  — ana Dosyalar listesine ve Finans > müvekkil sayfasındaki Dosyalar
  tablosuna "İşlemler" sütunu (Düzenle/Sil) eklendi. (Panodaki karşılık
  kart hâlâ "Beklemede"de duruyor — DB'ye yazamadığım için elle
  "Tamamlandı"ya sürüklemeniz gerekiyor.)
