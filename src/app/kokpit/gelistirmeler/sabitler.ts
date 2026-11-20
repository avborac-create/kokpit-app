// Gelistirme durumlari (yazilim jargonu). Is akisi ile olgunluk AYRI iki durumdur.
export const AKISLAR = [
  { k: "TALEP", ad: "Talep", aciklama: "İstendi, henüz başlanmadı", sinif: "bg-white/10 text-white/70" },
  { k: "PLANLANDI", ad: "Planlandı", aciklama: "Sıraya alındı / tasarım aşamasında", sinif: "bg-[#8b6cf0]/20 text-[#b6a3ff]" },
  { k: "YAPILIYOR", ad: "Yapılıyor", aciklama: "Geliştirme sürüyor", sinif: "bg-[#6db8ff]/20 text-[#8fd8ff]" },
  { k: "TEST", ad: "Test", aciklama: "Yapıldı, kullanıcı doğrulaması bekliyor", sinif: "bg-[#f2b04c]/20 text-[#f2b04c]" },
  { k: "YAYINDA", ad: "Yayında", aciklama: "Canlıda", sinif: "bg-[#32d74b]/20 text-[#5fd97a]" },
  { k: "REDDEDILDI", ad: "Reddedildi", aciklama: "Yapılmayacak", sinif: "bg-[#ff7a70]/20 text-[#ff9b92]" },
] as const;

export const OLGUNLUKLAR = [
  { k: "PROTOTIP", ad: "Prototip", aciklama: "Deneme; gerçek veri girmeyin", sinif: "bg-[#d65db1]/20 text-[#f09bd6]" },
  { k: "BETA", ad: "Beta", aciklama: "Kullanılabilir, hata olabilir; geri bildirim bekleniyor", sinif: "bg-[#f2b04c]/20 text-[#f2b04c]" },
  { k: "KARARLI", ad: "Kararlı (Stable)", aciklama: "Büroda rutin kullanılıyor; değişiklik dikkatle yapılır", sinif: "bg-[#32d74b]/20 text-[#5fd97a]" },
  { k: "LTS", ad: "LTS", aciklama: "Çekirdek iş (para, dosya, teyit); yalnız hata düzeltmesi, davranış değişmez", sinif: "bg-[#14b8c4]/20 text-[#5fe0e8]" },
  { k: "KULLANIMDAN_KALKIYOR", ad: "Kaldırılıyor (Deprecated)", aciklama: "Yerine yenisi geldi; yakında kalkacak", sinif: "bg-white/10 text-white/50" },
] as const;
