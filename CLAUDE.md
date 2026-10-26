@AGENTS.md

# Çalışma kuralları (kullanıcı talimatı, kalıcı)

- **Görevler:** Kullanıcının her mesajı (oturum içinde ara mesajlar dahil) bir görevdir. Hepsini topla, aktif işten sonra sırayla bitir; hiçbirini açıkta bırakma. Kuyruktaki işler hafızadaki `kokpit-is-sirasi` notunda tutulur; kullanıcı yeni bir şey istemese bile sıradakine geç.
- **Deploy:** Kullanıcı "deploy et" demeni beklemeden her doğrulanmış değişikliği yayınlar: `tsc` + `eslint` + `next build` temiz → commit → `node -r dotenv/config scripts/yerel-yedek-al.mjs` → `git push origin claude/kokpit-app-architecture-yjhn7s`. Sonucu bildir. İstisna: canlı veriyi silen/dönüştüren migration, geri alınamaz veri işlemi, şifre/kimlik işleri, canlı DB'ye tek seferlik veri yazan betikler için önce sor.
- **Kullanıcıdan eylem beklenirse** yanıtın sonuna "⚠️ SENDEN BEKLENEN EYLEM:" bloğu koy.
- Dil Türkçe; kullanıcı avukat, teknik olmayan açıklama ister.
