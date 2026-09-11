# KOKPİT APP

Eces Hukuk Bürosu'nun tüm operasyonunu (dava dosyaları, müvekkil ilişkileri,
finans/muhasebe ve ileride eklenecek her modülü) tek bir yerden yönetmesini
sağlayacak bulut tabanlı, çok kullanıcılı, modüler yazılım.

Mimari kararlar ve "yeni bir modül nasıl eklenir" rehberi için
[ARCHITECTURE.md](./ARCHITECTURE.md) dosyasına bakın.

## Şu An Geliştirilmiş Modül

**Müvekkil Veritabanı** (Müvekkil Fihristi + Müvekkil Para Trafiği).
Dava Dosyaları ve Finans/Muhasebe modülleri sol menüde "Yakında" olarak
görünür; henüz geliştirilmedi.

## Gereksinimler

- Node.js 20+
- PostgreSQL 14+ (yerelde çalışan bir sunucu, ya da erişilebilir bir
  bağlantı dizesi)

## Kurulum

```bash
npm install

# .env dosyasini olustur ve DATABASE_URL / SESSION_SECRET degerlerini gir
cp .env.example .env

# Veritabani semasini uygula
npx prisma migrate dev

# Baslangic verilerini (secenek listeleri + yonetici kullanici) yukle
npm run prisma:seed
```

Seed işlemi varsayılan olarak `admin@eceshukuk.com` / `Degistir123!` ile bir
Yönetici hesabı oluşturur (ilk girişten sonra şifrenin değiştirilmesi
önerilir). Farklı bir e-posta/şifre ile seed etmek için:

```bash
SEED_ADMIN_EPOSTA="siz@buro.com" SEED_ADMIN_SIFRE="guclu-bir-sifre" npm run prisma:seed
```

## Geliştirme Sunucusunu Çalıştırma

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresini ziyaret edin; oturum
açık değilse otomatik olarak `/giris` sayfasına yönlendirilirsiniz.

## Diğer Komutlar

```bash
npm run build   # production build
npm run start   # production sunucusu (build sonrasi)
npm run lint    # ESLint
npx tsc --noEmit  # tip kontrolu
```

## Mobil / PWA

Uygulama bir Progressive Web App olarak yapılandırıldı. Telefonda tarayıcıdan
açıp "Ana Ekrana Ekle" seçeneğini kullanan kullanıcılar, KOKPİT'i tarayıcı
arayüzü olmadan native bir uygulama gibi başlatabilir.
