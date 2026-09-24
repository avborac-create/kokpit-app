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
- MÜVEKKİL FİNANS modülünü "cari hesap" usulüne geçirme: bir müvekkille
  aramızdaki TÜM para trafiğinin neticesi bu alanda görünmeli — müvekkilin
  (ör. 1000) dosyasının her birinin kendi iç ekonomisi (masraf/tahsilat/
  bakiye), müvekkil seviyesinde TEK, toplu bir sonuca (cari hesap özeti)
  konsolide edilmeli. Kapsam/tasarım henüz netleşmedi.
- Haciz Raporu modülünü Vercel Blob'suz (sunucuda kalıcı depolama olmadan)
  yeniden kurmak: yüklenen belgeler (Haciz Tutanağı, Protokol, Fotoğraflar)
  saklanmak yerine doğrudan info@eceshukuk.com'a mail olarak gönderilsin.
  Vercel'den başka bir sunucuya taşınma sürecinin bir parçası olarak,
  Vercel Blob bağımlılığını tamamen ortadan kaldırmak için.
- Vercel'den ucuz bir VPS'e (Hetzner/DigitalOcean, ~4-5$/ay) taşınma:
  cold start sorununu kalıcı ve garantili çözer. Veritabanı (Prisma
  Postgres) ve dosya depolama aynı kalabilir, sadece uygulamanın çalıştığı
  yer değişir. Kullanıcının bir sağlayıcıda hesap açması gerekiyor —
  hesap açılınca sunucu kurulumu (deploy, SSL, otomatik başlatma) Claude
  tarafından yapılacak. Şu an için bekletiliyor, öncelik dosya/müvekkil
  ekonomisi işi.

## Yapılıyor

_(şu an yok)_

## Tamamlandı

- Dosyalar listesinden/detayından kayıtları manuel düzenleme ve silme imkanı
  — ana Dosyalar listesine ve Finans > müvekkil sayfasındaki Dosyalar
  tablosuna "İşlemler" sütunu (Düzenle/Sil) eklendi. (Panodaki karşılık
  kart hâlâ "Beklemede"de duruyor — DB'ye yazamadığım için elle
  "Tamamlandı"ya sürüklemeniz gerekiyor.)
