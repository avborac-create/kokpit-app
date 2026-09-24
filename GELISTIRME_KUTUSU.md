# Geliştirme Kutusu

Sohbette söylenen, henüz kod olarak hayata geçmemiş her geliştirme
isteğinin/fikrinin tutulduğu basit liste. Bunu Claude kendisi günceller —
manuel giriş gerekmez, sadece konuşurken söylemeniz yeterli.

Sıra: Beklemede → Yapılıyor → Tamamlandı (yukarıdan aşağı, girildiği sırayla
işlenir).

## Beklemede

- Dosyalar tablosundaki sütunların admin tarafından manuel olarak yeniden
  sıralanabilmesi (dinamik sütun sırası).
- "Borç Tahsilatları" tasnif menüsü (Dosya Ekonomisi sekmesi altına):
  borçludan gelen bir tahsilatı resmi masraf/müvekkil payı/vekalet ücreti
  gibi kalemlere bölme, "Bloke Paralar" kalemini tek tuşla Adli Birim cari
  hesabına aktarma. Üç tasarım seçeneği (Tek Ekranda Bölüştürme / Sihirbaz /
  Liste+Modal) hazırlandı, hangisinin uygulanacağı kararı bekleniyor.
- Müvekkil sayfasındaki "Cari Hesap" ekranına klasik borç/alacak cari hesap
  mantığı: her kayıt bir yargı dosyasına bağlı olabilir ya da serbest kayıt
  olabilir (kullanıcı ekran görüntüsüyle işaret etti, kapsam henüz
  netleşmedi).
- Pilot müvekkil "Tınaz Kauçuk"un KOZ GIDA ve sonrasındaki TÜM dosyalarının
  ekonomisi ile Müvekkil Ekonomisi'nin (muhtemelen veri girişi ağırlıklı,
  hızlı) halledilmesi — yavaşlık sorunu çözüldükten hemen sonra ele
  alınacak.

## Yapılıyor

_(şu an yok)_

## Tamamlandı

- Dosyalar listesinden/detayından kayıtları manuel düzenleme ve silme imkanı
  — ana Dosyalar listesine ve Finans > müvekkil sayfasındaki Dosyalar
  tablosuna "İşlemler" sütunu (Düzenle/Sil) eklendi. (Panodaki karşılık
  kart hâlâ "Beklemede"de duruyor — DB'ye yazamadığım için elle
  "Tamamlandı"ya sürüklemeniz gerekiyor.)
