import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { eksiyeDusmeKontrolu } from "@/modules/dava-dosyasi/lib/para-bakiye";

// Islem gunlugu: kullanici kendi son islemini geri alir / yeniden uygular (en son yapilan once).
// Her islem, degisen kayitlarin "once" ve "sonra" goruntusuyle saklanir; geri alirken kayitlarin
// hala o sonraki durumda olup olmadigi kontrol edilir, degismisse (cakisma) geri alinmaz.

type Satir = Record<string, unknown> & { id: string };
type CariVeri = { tur: "CARI"; olusturulan: Satir[]; silinen: Satir[]; degisen: { once: Satir; sonra: Satir }[] };
type IsSilVeri = { tur: "IS_SIL"; agac: Satir & { maddeler: Satir[]; yorumlar: (Satir & { ekler: Satir[] })[]; yardimlar: Satir[]; operasyonKayitlari: Satir[] } };
type IsDurumVeri = { tur: "IS_DURUM"; isId: string; once: { durum: string; tamamlanmaTarihi: string | null }; sonra: { durum: string; tamamlanmaTarihi: string | null } };
type Veri = CariVeri | IsSilVeri | IsDurumVeri;

class Cakisma extends Error {}

const duz = <T>(x: T): T => JSON.parse(JSON.stringify(x));
function kanonik(v: unknown): string {
  return JSON.stringify(v, (_k, d) => (d && typeof d === "object" && !Array.isArray(d) ? Object.fromEntries(Object.entries(d as object).sort(([a], [b]) => (a < b ? -1 : 1))) : d));
}
function canli<T extends Record<string, unknown>>(satir: T, tarihAlanlari: string[]) {
  const s: Record<string, unknown> = { ...satir };
  for (const a of tarihAlanlari) if (typeof s[a] === "string") s[a] = new Date(s[a] as string);
  return s;
}

const ic = new AsyncLocalStorage<true>();

async function gunlugeYaz(kullaniciId: string, ozet: string, veri: Veri) {
  await prisma.islemGunlugu.deleteMany({ where: { kullaniciId, durum: "GERI_ALINDI" } });
  await prisma.islemGunlugu.create({ data: { kullaniciId, ozet: ozet.slice(0, 200), veri: veri as unknown as Prisma.InputJsonValue } });
}

// ---- Cari defter ----
async function cariGoruntu(musteriIdleri: string[]) {
  const satirlar = await prisma.cariHareketi.findMany({ where: { musteriId: { in: musteriIdleri } } });
  return new Map(satirlar.map((s) => [s.id, duz(s) as unknown as Satir]));
}

export async function cariGunlukle<T>(ozet: string, musteriler: string[] | (() => Promise<string[]>), fn: () => Promise<T>): Promise<T> {
  if (ic.getStore()) return fn();
  let k: Awaited<ReturnType<typeof mevcutKullanici>> = null;
  let idler: string[] = [];
  try {
    k = await mevcutKullanici();
    idler = [...new Set(typeof musteriler === "function" ? await musteriler() : musteriler)].filter(Boolean);
  } catch {
    idler = [];
  }
  if (!k || idler.length === 0) return fn();
  const once = await cariGoruntu(idler);
  let hata: unknown;
  let sonuc: T | undefined;
  try {
    sonuc = await ic.run(true, fn);
  } catch (e) {
    hata = e;
  }
  try {
    const sonra = await cariGoruntu(idler);
    const veri: CariVeri = { tur: "CARI", olusturulan: [], silinen: [], degisen: [] };
    for (const [id, s] of sonra) {
      const o = once.get(id);
      if (!o) veri.olusturulan.push(s);
      else if (kanonik(o) !== kanonik(s)) veri.degisen.push({ once: o, sonra: s });
    }
    for (const [id, s] of once) if (!sonra.has(id)) veri.silinen.push(s);
    if (veri.olusturulan.length + veri.silinen.length + veri.degisen.length > 0) await gunlugeYaz(k.kullaniciId, ozet, veri);
  } catch {
    // gunluk yazilamazsa asil islem etkilenmez
  }
  if (hata) throw hata;
  return sonuc as T;
}

const CARI_TARIH = ["tarih", "olusturmaTarihi"];

async function cariUygula(veri: CariVeri, yon: "geri" | "ileri") {
  const geri = yon === "geri";
  const silinecek = geri ? veri.olusturulan : veri.silinen; // su an var, silinecek
  const eklenecek = geri ? veri.silinen : veri.olusturulan; // su an yok, eklenecek
  const degisenler = veri.degisen.map((d) => ({ simdi: geri ? d.sonra : d.once, hedef: geri ? d.once : d.sonra }));
  const cakisma = "Bu işlem artık geri alınamıyor: ilgili kayıtlar sonradan değiştirilmiş ya da başka bir işlemle kullanılmış.";
  await prisma.$transaction(async (tx) => {
    const idler = [...silinecek, ...eklenecek, ...degisenler.map((d) => d.simdi)].map((s) => s.id);
    const mevcut = new Map((await tx.cariHareketi.findMany({ where: { id: { in: idler } } })).map((s) => [s.id, kanonik(duz(s))]));
    for (const s of silinecek) if (mevcut.get(s.id) !== kanonik(s)) throw new Cakisma(cakisma);
    for (const s of eklenecek) if (mevcut.has(s.id)) throw new Cakisma(cakisma);
    for (const d of degisenler) if (mevcut.get(d.simdi.id) !== kanonik(d.simdi)) throw new Cakisma(cakisma);
    if (silinecek.length) await tx.cariHareketi.deleteMany({ where: { id: { in: silinecek.map((s) => s.id) } } });
    if (eklenecek.length) await tx.cariHareketi.createMany({ data: eklenecek.map((s) => canli(s, CARI_TARIH)) as Prisma.CariHareketiCreateManyInput[] });
    for (const d of degisenler) {
      const { id, ...alanlar } = canli(d.hedef, CARI_TARIH);
      await tx.cariHareketi.update({ where: { id: id as string }, data: alanlar as Prisma.CariHareketiUncheckedUpdateInput });
    }
    const gorulen = new Set<string>();
    for (const s of [...silinecek, ...eklenecek, ...degisenler.flatMap((d) => [d.simdi, d.hedef])]) {
      const a = `${s.musteriId}|${s.dosyaId ?? ""}`;
      if (gorulen.has(a)) continue;
      gorulen.add(a);
      await eksiyeDusmeKontrolu(tx, s.musteriId as string, (s.dosyaId as string | null) ?? null);
    }
  });
}

// ---- Gorevler ----
const IS_TARIH = ["vade", "olusturmaTarihi", "guncellemeTarihi", "tamamlanmaTarihi"];

export async function isDurumuGunlukle<T>(ozet: string, isId: string, fn: () => Promise<T>): Promise<T> {
  const k = await mevcutKullanici().catch(() => null);
  const once = k ? await prisma.is.findUnique({ where: { id: isId }, select: { durum: true, tamamlanmaTarihi: true } }) : null;
  const sonuc = await fn();
  if (k && once) {
    try {
      const sonra = await prisma.is.findUnique({ where: { id: isId }, select: { durum: true, tamamlanmaTarihi: true } });
      if (sonra && sonra.durum !== once.durum) await gunlugeYaz(k.kullaniciId, ozet, { tur: "IS_DURUM", isId, once: duz(once) as unknown as IsDurumVeri["once"], sonra: duz(sonra) as unknown as IsDurumVeri["sonra"] });
    } catch {
      // gunluk yazilamazsa asil islem etkilenmez
    }
  }
  return sonuc;
}

export async function isSilmeyiGunlukle<T>(ozet: string, isId: string, fn: () => Promise<T>): Promise<T> {
  const k = await mevcutKullanici().catch(() => null);
  const agac = k
    ? await prisma.is.findUnique({ where: { id: isId }, include: { maddeler: true, yorumlar: { include: { ekler: true } }, yardimlar: true, operasyonKayitlari: true } })
    : null;
  const sonuc = await fn();
  if (k && agac) {
    try {
      if (!(await prisma.is.findUnique({ where: { id: isId }, select: { id: true } }))) await gunlugeYaz(k.kullaniciId, ozet, { tur: "IS_SIL", agac: duz(agac) as unknown as IsSilVeri["agac"] });
    } catch {
      // gunluk yazilamazsa asil islem etkilenmez
    }
  }
  return sonuc;
}

async function isDurumUygula(veri: IsDurumVeri, yon: "geri" | "ileri") {
  const [simdi, hedef] = yon === "geri" ? [veri.sonra, veri.once] : [veri.once, veri.sonra];
  const m = await prisma.is.findUnique({ where: { id: veri.isId }, select: { durum: true } });
  if (!m || m.durum !== simdi.durum) throw new Cakisma("Bu işlem artık geri alınamıyor: görevin durumu sonradan değiştirilmiş ya da görev silinmiş.");
  await prisma.is.update({
    where: { id: veri.isId },
    data: { durum: hedef.durum, tamamlanmaTarihi: hedef.tamamlanmaTarihi ? new Date(hedef.tamamlanmaTarihi) : null, guncellemeTarihi: new Date() },
  });
}

async function isSilUygula(veri: IsSilVeri, yon: "geri" | "ileri") {
  const { maddeler, yorumlar, yardimlar, operasyonKayitlari, ...is } = veri.agac;
  const var_ = await prisma.is.findUnique({ where: { id: is.id }, select: { id: true } });
  if (yon === "ileri") {
    if (!var_) throw new Cakisma("Bu işlem artık yeniden uygulanamıyor: görev zaten yok.");
    await prisma.is.delete({ where: { id: is.id } });
    return;
  }
  if (var_) throw new Cakisma("Bu görev zaten mevcut.");
  await prisma.$transaction(async (tx) => {
    await tx.is.create({ data: canli(is, IS_TARIH) as Prisma.IsUncheckedCreateInput });
    if (maddeler.length) await tx.isMaddesi.createMany({ data: maddeler as Prisma.IsMaddesiCreateManyInput[] });
    if (yorumlar.length) await tx.isYorumu.createMany({ data: yorumlar.map((y) => {
      const kopya: Record<string, unknown> = { ...y };
      delete kopya.ekler;
      return canli(kopya, ["tarih"]);
    }) as Prisma.IsYorumuCreateManyInput[] });
    const ekler = yorumlar.flatMap((y) => y.ekler);
    if (ekler.length) await tx.isEki.createMany({ data: ekler as Prisma.IsEkiCreateManyInput[] });
    if (yardimlar.length) await tx.isYardimi.createMany({ data: yardimlar.map((y) => canli(y, ["tarih"])) as Prisma.IsYardimiCreateManyInput[] });
    if (operasyonKayitlari.length) await tx.isOperasyonKaydi.createMany({ data: operasyonKayitlari.map((y) => canli(y, ["tarih"])) as Prisma.IsOperasyonKaydiCreateManyInput[] });
  });
}

// ---- Geri al / yeniden uygula ----
export async function geriAlVeyaYenidenUygula(yon: "geri" | "ileri"): Promise<{ hata?: string; ozet?: string }> {
  const k = await mevcutKullanici();
  if (!k) return { hata: "Oturum bulunamadı." };
  const kayit =
    yon === "geri"
      ? await prisma.islemGunlugu.findFirst({ where: { kullaniciId: k.kullaniciId, durum: "UYGULANDI" }, orderBy: { olusturmaTarihi: "desc" } })
      : await prisma.islemGunlugu.findFirst({ where: { kullaniciId: k.kullaniciId, durum: "GERI_ALINDI" }, orderBy: { geriAlmaTarihi: "desc" } });
  if (!kayit) return { hata: yon === "geri" ? "Geri alınacak işlem yok." : "Yeniden uygulanacak işlem yok." };
  const veri = kayit.veri as unknown as Veri;
  try {
    if (veri.tur === "CARI") await cariUygula(veri, yon);
    else if (veri.tur === "IS_SIL") await isSilUygula(veri, yon);
    else await isDurumUygula(veri, yon);
  } catch (e) {
    if (e instanceof Cakisma) {
      await prisma.islemGunlugu.update({ where: { id: kayit.id }, data: { durum: "GECERSIZ", neden: e.message } });
      return { hata: e.message, ozet: kayit.ozet };
    }
    return { hata: e instanceof Error ? e.message : "İşlem uygulanamadı.", ozet: kayit.ozet };
  }
  await prisma.islemGunlugu.update({
    where: { id: kayit.id },
    data: yon === "geri" ? { durum: "GERI_ALINDI", geriAlmaTarihi: new Date() } : { durum: "UYGULANDI", geriAlmaTarihi: null, olusturmaTarihi: new Date() },
  });
  return { ozet: kayit.ozet };
}

export type GunlukDurumu = {
  geri: { id: string; ozet: string; zaman: string } | null;
  ileri: { id: string; ozet: string; zaman: string } | null;
};

export const gunlukDurumu = cache(async (): Promise<GunlukDurumu> => {
  try {
    return await gunlukDurumuOku();
  } catch {
    return { geri: null, ileri: null }; // tablo henuz yoksa (yayin sirasi) sayfa bozulmasin
  }
});

async function gunlukDurumuOku(): Promise<GunlukDurumu> {
  const k = await mevcutKullanici();
  if (!k) return { geri: null, ileri: null };
  const [g, i] = await Promise.all([
    prisma.islemGunlugu.findFirst({ where: { kullaniciId: k.kullaniciId, durum: "UYGULANDI" }, orderBy: { olusturmaTarihi: "desc" }, select: { id: true, ozet: true, olusturmaTarihi: true } }),
    prisma.islemGunlugu.findFirst({ where: { kullaniciId: k.kullaniciId, durum: "GERI_ALINDI" }, orderBy: { geriAlmaTarihi: "desc" }, select: { id: true, ozet: true, geriAlmaTarihi: true } }),
  ]);
  return {
    geri: g ? { id: g.id, ozet: g.ozet, zaman: g.olusturmaTarihi.toISOString() } : null,
    ileri: i ? { id: i.id, ozet: i.ozet, zaman: (i.geriAlmaTarihi ?? new Date()).toISOString() } : null,
  };
}
