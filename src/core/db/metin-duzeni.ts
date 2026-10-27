import { Prisma } from "@prisma/client";
import { baslikDuzeni, cumleDuzeni } from "@/core/metin/bicim";

// Veri hangi yoldan girerse girsin (form, Excel aktarımı, iç içe kayıt) veritabanına
// YAZILIRKEN metin biçimi otomatik düzeltilir. Kurallar:
//  - baslik: kişi/kurum/mahkeme-birim adları -> Her Kelimenin İlk Harfi Büyük (bağlaçlar küçük)
//  - cumle:  not ve açıklamalar -> yalnızca cümle başları büyük
//  - numara, kod, e-posta, IBAN, tutar vb. hiçbir kurala dahil değildir (dokunulmaz).
// Mevcut kayıtlar bu uzantıyla değişmez; yalnızca bundan sonraki yazmalar etkilenir.
type Kural = (metin: string) => string;

export const KURALLAR: Record<string, Record<string, Kural>> = {
  Kullanici: { adSoyad: baslikDuzeni },
  Musteri: { adSoyadUnvan: baslikDuzeni, adres: cumleDuzeni, notlar: cumleDuzeni },
  IrtibatKisisi: { adSoyad: baslikDuzeni, unvanGorev: baslikDuzeni, konuBasligi: cumleDuzeni, notlar: cumleDuzeni },
  KarsiTaraf: { ad: baslikDuzeni, notlar: cumleDuzeni },
  UyusmazlikGrubu: { ad: baslikDuzeni, notlar: cumleDuzeni },
  DavaDosyasi: {
    birimAdi: baslikDuzeni, konu: cumleDuzeni, davaKonusu: cumleDuzeni, talepSonucu: cumleDuzeni,
    aciklama: cumleDuzeni, sonrakiKontrolSorusu: cumleDuzeni, sonKontrolSonucu: cumleDuzeni,
  },
  CMKDosyasi: { adSoyad: baslikDuzeni, suc: cumleDuzeni, birim: baslikDuzeni, notlar: cumleDuzeni },
  DosyaNabzi: { adSoyad: baslikDuzeni },
  MuvekkilAnlasma: { notlar: cumleDuzeni },
  MusteriParaTrafigi: { aciklama: cumleDuzeni },
  KarsiTarafAlacagi: { aciklama: cumleDuzeni },
  DosyaMasrafi: { aciklama: cumleDuzeni },
  DosyaAvansAktarimi: { aciklama: cumleDuzeni },
  AdliBirimHareketi: { aciklama: cumleDuzeni },
  MusteriFinansHareketi: { aciklama: cumleDuzeni },
  DosyaParaGirisi: { aciklama: cumleDuzeni },
  DosyaCariDagitimi: { aciklama: cumleDuzeni },
  CariHareketi: { aciklama: cumleDuzeni },
  HukukiMudahale: { baslik: cumleDuzeni, aciklama: cumleDuzeni },
};

type AlanBilgisi = { kind: string; type: string };

// Prisma şemasından model -> alan haritası (iç içe yazmalarda ilişkinin hangi modele
// gittiğini bilmek için).
const MODELLER = new Map<string, Map<string, AlanBilgisi>>(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name,
    new Map(m.fields.map((f) => [f.name, { kind: f.kind, type: f.type }])),
  ]),
);

// Yapılandırmadaki bir model/alan şemadan silinir ya da adı değişirse sessizce
// çalışmaz hâle gelmesin, açılışta hata versin.
for (const [model, alanlar] of Object.entries(KURALLAR)) {
  for (const alan of Object.keys(alanlar)) {
    if (!MODELLER.get(model)?.has(alan)) {
      throw new Error(`Metin düzeni yapılandırması şemayla uyuşmuyor: ${model}.${alan}`);
    }
  }
}

type Veri = Record<string, unknown>;
const nesneMi = (d: unknown): d is Veri => typeof d === "object" && d !== null && !Array.isArray(d);

export function veriyiDuzenle(model: string, veri: unknown): unknown {
  if (Array.isArray(veri)) return veri.map((v) => veriyiDuzenle(model, v));
  if (!nesneMi(veri)) return veri;
  // Prisma'nın özel değer nesneleri (Decimal, Date, Buffer...) düz nesne değildir; dokunma.
  if (Object.getPrototypeOf(veri) !== Object.prototype) return veri;

  const alanlar = MODELLER.get(model);
  const sonuc: Veri = { ...veri };
  for (const [anahtar, deger] of Object.entries(veri)) {
    const alan = alanlar?.get(anahtar);
    if (!alan) continue;

    if (alan.kind === "scalar") {
      const kural = KURALLAR[model]?.[anahtar];
      if (!kural) continue;
      if (typeof deger === "string") sonuc[anahtar] = kural(deger);
      else if (nesneMi(deger) && typeof deger.set === "string") sonuc[anahtar] = { ...deger, set: kural(deger.set) };
    } else if (alan.kind === "object") {
      sonuc[anahtar] = iliskiyiDuzenle(alan.type, deger);
    }
  }
  return sonuc;
}

// İlişki yazma işlemleri: create / createMany / update / upsert / connectOrCreate / updateMany
function iliskiyiDuzenle(hedefModel: string, islemler: unknown): unknown {
  if (!nesneMi(islemler)) return islemler;
  const s: Veri = { ...islemler };

  const veriyiGecir = (d: unknown): unknown => {
    // { where, data } biçimi ya da doğrudan veri nesnesi
    if (nesneMi(d) && "data" in d) return { ...d, data: veriyiDuzenle(hedefModel, d.data) };
    return veriyiDuzenle(hedefModel, d);
  };

  if ("create" in s) s.create = veriyiDuzenle(hedefModel, s.create);
  if ("createMany" in s && nesneMi(s.createMany)) {
    s.createMany = { ...s.createMany, data: veriyiDuzenle(hedefModel, s.createMany.data) };
  }
  if ("update" in s) s.update = Array.isArray(s.update) ? s.update.map(veriyiGecir) : veriyiGecir(s.update);
  if ("updateMany" in s) s.updateMany = Array.isArray(s.updateMany) ? s.updateMany.map(veriyiGecir) : veriyiGecir(s.updateMany);
  if ("upsert" in s) {
    const duzelt = (u: unknown) =>
      nesneMi(u)
        ? { ...u, create: veriyiDuzenle(hedefModel, u.create), update: veriyiDuzenle(hedefModel, u.update) }
        : u;
    s.upsert = Array.isArray(s.upsert) ? s.upsert.map(duzelt) : duzelt(s.upsert);
  }
  if ("connectOrCreate" in s) {
    const duzelt = (u: unknown) => (nesneMi(u) ? { ...u, create: veriyiDuzenle(hedefModel, u.create) } : u);
    s.connectOrCreate = Array.isArray(s.connectOrCreate) ? s.connectOrCreate.map(duzelt) : duzelt(s.connectOrCreate);
  }
  return s;
}

// Yalnızca yazma işlemleri sarılır (okuma/groupBy/aggregate'e dokunulmaz).
type YazmaArgs = Veri | undefined;
function veriAlaniDuzelt(model: string, args: YazmaArgs): YazmaArgs {
  return args ? { ...args, data: veriyiDuzenle(model, args.data) } : args;
}

export const metinDuzeniUzantisi = Prisma.defineExtension({
  name: "metin-duzeni",
  query: {
    $allModels: {
      create({ model, args, query }) {
        return query(veriAlaniDuzelt(model, args as YazmaArgs) as typeof args);
      },
      createMany({ model, args, query }) {
        return query(veriAlaniDuzelt(model, args as YazmaArgs) as typeof args);
      },
      createManyAndReturn({ model, args, query }) {
        return query(veriAlaniDuzelt(model, args as YazmaArgs) as typeof args);
      },
      update({ model, args, query }) {
        return query(veriAlaniDuzelt(model, args as YazmaArgs) as typeof args);
      },
      updateMany({ model, args, query }) {
        return query(veriAlaniDuzelt(model, args as YazmaArgs) as typeof args);
      },
      updateManyAndReturn({ model, args, query }) {
        return query(veriAlaniDuzelt(model, args as YazmaArgs) as typeof args);
      },
      upsert({ model, args, query }) {
        const a = args as Veri;
        return query({
          ...a,
          create: veriyiDuzenle(model, a.create),
          update: veriyiDuzenle(model, a.update),
        } as typeof args);
      },
    },
  },
});
