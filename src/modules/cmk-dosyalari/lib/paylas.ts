// Bir evrakı telefonun paylaş menüsüyle (WhatsApp dahil) dosya olarak gönderir.
// Tarayıcı dosya paylaşmayı desteklemiyorsa dosyayı indirir ve WhatsApp'ı hazır mesajla açar.
export async function evrakiPaylas(evrakId: string, dosyaAdi: string, mesaj: string): Promise<"paylasildi" | "indirildi"> {
  const cevap = await fetch(`/api/cmk-evrak/${evrakId}?tur=orijinal`);
  if (!cevap.ok) throw new Error("Evrak alınamadı.");
  const blob = await cevap.blob();
  const dosya = new File([blob], dosyaAdi, { type: blob.type || "application/octet-stream" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [dosya] })) {
    try {
      await navigator.share({ files: [dosya], text: mesaj });
      return "paylasildi";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "paylasildi"; // kullanıcı vazgeçti
    }
  }
  const adres = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = adres;
  a.download = dosyaAdi;
  a.click();
  setTimeout(() => URL.revokeObjectURL(adres), 10000);
  window.open(`https://wa.me/?text=${encodeURIComponent(mesaj)}`, "_blank");
  return "indirildi";
}
