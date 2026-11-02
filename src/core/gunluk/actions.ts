"use server";

import { revalidatePath } from "next/cache";
import { geriAlVeyaYenidenUygula } from "./islem-gunlugu";

export async function sonIslemiGeriAl(): Promise<{ hata?: string; ozet?: string }> {
  const s = await geriAlVeyaYenidenUygula("geri");
  if (!s.hata) revalidatePath("/kokpit", "layout");
  return s;
}

export async function sonIslemiYenidenUygula(): Promise<{ hata?: string; ozet?: string }> {
  const s = await geriAlVeyaYenidenUygula("ileri");
  if (!s.hata) revalidatePath("/kokpit", "layout");
  return s;
}
