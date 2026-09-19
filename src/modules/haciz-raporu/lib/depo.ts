import { put, del, get } from "@vercel/blob";

// Haciz raporu belgeleri (tutanak/protokol taramaları, saha fotoğrafları)
// müvekkile/dosyaya özel, gizli belgeler - hepsi "private" olarak
// saklanır (tahmin edilebilir/genel bir url ile ERİŞİLEMEZ). Tek okuma
// yolu bu dosyadaki belgeIcerigiGetir - o da sunucu tarafında, oturum
// açmış ve yetkili bir kullanıcı isteğinde çağrılır (bkz. actions.ts,
// zip.ts). Gerekli BLOB_READ_WRITE_TOKEN ortam değişkeni olmadan hiçbir
// fonksiyon çalışmaz - Vercel projesine bir Blob deposu bağlanmalı.

function dosyaYoluOlustur(hacizRaporuId: string, dosyaAdi: string): string {
  return `haciz-raporlari/${hacizRaporuId}/${crypto.randomUUID()}-${dosyaAdi}`;
}

export async function belgeYukle(
  hacizRaporuId: string,
  dosyaAdi: string,
  icerik: Buffer | Blob,
  mimeTipi: string,
): Promise<{ depoUrl: string; boyutBayt: number }> {
  const sonuc = await put(dosyaYoluOlustur(hacizRaporuId, dosyaAdi), icerik, {
    access: "private",
    contentType: mimeTipi,
    addRandomSuffix: false,
  });
  const boyutBayt = icerik instanceof Blob ? icerik.size : icerik.byteLength;
  return { depoUrl: sonuc.url, boyutBayt };
}

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
