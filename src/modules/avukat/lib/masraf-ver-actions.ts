"use server";

import { redirect } from "next/navigation";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { dosyaMasrafiEkle } from "@/modules/dava-dosyasi/lib/actions";

export async function hacizMasrafiVer(formData: FormData) {
  if (!(await modulErisimiVarMi("avukat"))) throw new Error("Bu işlem için yetkiniz yok.");
  const dosyaId = String(formData.get("dosyaId") ?? "");
  if (!dosyaId) throw new Error("Dosya seçin.");
  await dosyaMasrafiEkle(dosyaId, formData);
  redirect(`/kokpit/dava-dosyalari/${dosyaId}`);
}
