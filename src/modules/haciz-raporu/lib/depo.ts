import { del, get } from "@vercel/blob";

// Haciz raporu belgeleri (tutanak/protokol taramaları, saha fotoğrafları)
// müvekkile/dosyaya özel, gizli belgeler - hepsi "private" olarak
// saklanır (tahmin edilebilir/genel bir url ile ERİŞİLEMEZ). Yükleme
// SUNUCUDAN yapılmaz - tarayıcı dosyayı doğrudan Vercel Blob'a yükler
// (bkz. dosya-yukleme-alani.tsx, /api/haciz-raporu/blob-upload) - Next.js
// Server Action'larının 1MB'lik govde sınırını (ve Vercel'in platform
// sınırını) aşmadan, mobil sahada çekilen büyük fotoğraflarla da
// çalışabilsin diye. Tek okuma yolu bu dosyadaki belgeIcerigiGetir - o da
// sunucu tarafında, oturum açmış ve yetkili bir kullanıcı isteğinde
// çağrılır (bkz. zip.ts). Gerekli BLOB_READ_WRITE_TOKEN ortam değişkeni
// olmadan hiçbir fonksiyon çalışmaz - Vercel projesine bir Blob deposu
// bağlanmalı.

export async function belgeIcerigiGetir(depoUrl: string): Promise<Buffer> {
  const sonuc = await get(depoUrl, { access: "private" });
  if (!sonuc || sonuc.stream === null) {
    throw new Error(`Belge depoda bulunamadı: ${depoUrl}`);
  }
  const parcalar: Uint8Array[] = [];
  const okuyucu = sonuc.stream.getReader();
  for (;;) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    parcalar.push(value);
  }
  return Buffer.concat(parcalar);
}

export async function belgeSil(depoUrl: string): Promise<void> {
  await del(depoUrl);
}
