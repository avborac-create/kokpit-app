@AGENTS.md

# Çalışma kuralları (kullanıcı talimatı, kalıcı)

- **Görevler:** Kullanıcının her mesajı (oturum içinde ara mesajlar dahil) bir görevdir. Hepsini topla, aktif işten sonra sırayla bitir; hiçbirini açıkta bırakma. Kuyruktaki işler hafızadaki `kokpit-is-sirasi` notunda tutulur; kullanıcı yeni bir şey istemese bile sıradakine geç.
- **Deploy:** Kullanıcı "deploy et" demeni beklemeden her doğrulanmış değişikliği yayınlar: `tsc` + `eslint` + `next build` temiz → commit → `node -r dotenv/config scripts/yerel-yedek-al.mjs` → `git push origin claude/kokpit-app-architecture-yjhn7s`. Sonucu bildir. İstisna: canlı veriyi silen/dönüştüren migration, geri alınamaz veri işlemi, şifre/kimlik işleri, canlı DB'ye tek seferlik veri yazan betikler için önce sor.
- **Kullanıcıdan eylem beklenirse** yanıtın sonuna "⚠️ SENDEN BEKLENEN EYLEM:" bloğu koy.
- Dil Türkçe; kullanıcı avukat, teknik olmayan açıklama ister.
- **Kanban paneli:** Oturumdaki tüm görevler için yan panelde Kanban panosu (Artifact; kolonlar Yapılıyor / Sırada / Tamamlandı) açık tutulur; her yeni kullanıcı mesajı bir kart olur, her partide pano aynı Artifact bağlantısına yeniden yayınlanır. Pano müvekkil adı gibi hassas bilgi içermez.
- **Çalışılan dosya:** Test, örnek ve doğrulama, kullanıcının o anda içinde bulunduğu müvekkil/dosya üzerinden yapılır; başka müvekkillerin adı anılmaz.
