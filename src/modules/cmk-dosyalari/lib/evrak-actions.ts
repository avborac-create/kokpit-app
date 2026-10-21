"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { adindanTarihBul, evrakHazirla, gorunenAdUret } from "@/modules/cmk-dosyalari/lib/evrak-hazirla";

async function oturumSart() {
  if (!(await mevcutKullanici())) throw new Error("Oturum bulunamadı.");
}

const IZIN_VERILEN_BOYUT = 4 * 1024 * 1024;

// Bir ya da birden fazla evraki yukler. Tarih bos birakilirsa dosya adindan
// (ör. ..._16_10_2025) yakalanmaya calisilir.
export async function evrakYukle(cmkDosyasiId: string, formData: FormData) {
  await oturumSart();
  const klasor = String(formData.get("klasor") ?? "").trim() || "Diğer";
  const tarihMetni = String(formData.get("evrakTarihi") ?? "").trim();
  const dosyalar = formData.getAll("dosya").filter((d): d is File => d instanceof File && d.size > 0);
  if (dosyalar.length === 0) throw new Error("Bir dosya seçin.");

  for (const dosya of dosyalar) {
    if (dosya.size > IZIN_VERILEN_BOYUT) {
      throw new Error(`${dosya.name} 4 MB'tan büyük; daha küçük bir dosya yükleyin.`);
    }
    const icerik = Buffer.from(await dosya.arrayBuffer());
    const hazir = await evrakHazirla(dosya.name, icerik, dosya.type);
    const tarih = tarihMetni ? new Date(`${tarihMetni}T12:00:00Z`) : adindanTarihBul(dosya.name);
    await prisma.cMKEvrak.create({
      data: {
        cmkDosyasiId,
        klasor,
        ad: gorunenAdUret(dosya.name),
        evrakTarihi: tarih,
        mimeTipi: hazir.mimeTipi,
        boyutBayt: dosya.size,
        onizlemeTuru: hazir.onizlemeTuru,
        icerik: {
          create: {
            orijinalAd: dosya.name,
            orijinal: new Uint8Array(icerik),
            onizleme: hazir.onizleme ? new Uint8Array(hazir.onizleme) : null,
            onizlemeMime: hazir.onizlemeMime,
            metin: hazir.metin,
          },
        },
      },
    });
  }
  revalidatePath(`/kokpit/cmk-dosyalari/${cmkDosyasiId}`);
}

export async function evrakGuncelle(cmkDosyasiId: string, evrakId: string, formData: FormData) {
  await oturumSart();
  const ad = String(formData.get("ad") ?? "").trim();
  const klasor = String(formData.get("klasor") ?? "").trim();
  const tarihMetni = String(formData.get("evrakTarihi") ?? "").trim();
  if (!ad || !klasor) throw new Error("Ad ve klasör boş olamaz.");
  await prisma.cMKEvrak.update({
    where: { id: evrakId },
    data: { ad, klasor, evrakTarihi: tarihMetni ? new Date(`${tarihMetni}T12:00:00Z`) : null },
  });
  revalidatePath(`/kokpit/cmk-dosyalari/${cmkDosyasiId}`);
}

export async function evrakSil(cmkDosyasiId: string, evrakId: string) {
  await oturumSart();
  await prisma.cMKEvrak.delete({ where: { id: evrakId } });
  revalidatePath(`/kokpit/cmk-dosyalari/${cmkDosyasiId}`);
}
