import { NextResponse } from "next/server";
import { eksiBakiyeGorevleriniGuncelle } from "@/modules/dava-dosyasi/lib/eksi-bakiye-gorevi";
import { iadeGorevleriniGuncelle } from "@/modules/dava-dosyasi/lib/iade-gorevi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Günlük (vercel.json crons): eksi bakiye veren dosyalar için finans yetkililerine "müvekkilden para iste" görevi açar.
export async function GET(request: Request) {
  const sir = process.env.CRON_SECRET;
  if (!sir || request.headers.get("authorization") !== `Bearer ${sir}`) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  const eksi = await eksiBakiyeGorevleriniGuncelle();
  // Ayni gunluk calismada: 109 iade hesabinda bekleyen tutarlar icin gorev ac / kapat.
  const iade = await iadeGorevleriniGuncelle(undefined, true);
  return NextResponse.json({ ...eksi, iade });
}
