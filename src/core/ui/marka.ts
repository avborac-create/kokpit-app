// Uygulama içinde (sidebar, giriş ekranı) gösterilen logo görseli için TEK
// kaynak.
//
// BILEREK sorgu parametresi (?v=N) YOK: next/image, sorgu parametreli
// yerel path'lere next.config.ts -> images.localPatterns'ta ACIKCA izin
// verilmesini sart kosuyor (aksi halde build hatasi - denendi, next
// build'de yakalandi). Bu, favicon.ico'daki gibi tarayicinin kendisinin
// asla yeniden sormadigi bir onbellek degil - Next'in goruntu
// optimizasyon onbellegi cok daha kisa omurlu ve her yeni Vercel
// deploy'u zaten kendi onbellek alanini kullanir, bu yuzden versiyon
// numarasina burada ihtiyac yok.
export const UYGULAMA_LOGOSU_YOLU = "/icons/icon-192.png";
