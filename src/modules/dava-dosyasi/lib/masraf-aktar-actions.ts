"use server";

import { revalidatePath } from "next/cache";
import type { MasrafYansitmaHedefi } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { kuralAnahtari, normalize, satiriTahminEt, type HamSatir } from "./masraf-tasnif";
import { excelSatirlariniOku } from "./masraf-excel-oku";

export type OnizlemeSatiri = {
  anahtar: string; // satirin istemcideki kimligi
  satirNo: number;
  tarih: string | null;
  excelTur: string;
  excelCariKod: string;
  aciklama: string;
  tutar: number | null;
  turId: string;
  grupId: string;
  kalemId: string;
  cariKodId: string;
  yansitmaHedefi: MasrafYansitmaHedefi;
  guven: "yuksek" | "dusuk" | "ogrenilmis";
  nedenler: string[];
  tekrarMi: boolean; // ayni dosyada ayni tarih+tutar+aciklama zaten var
  gecersizNedeni: string | null; // tarih/tutar eksik -> aktarilamaz
  kuralAnahtari: string;
};

export type OnizlemeSonucu =
  | {
      satirlar: OnizlemeSatiri[];
      secenekler: Record<"tur" | "grup" | "kalem" | "cariKod", { id: string; etiket: string }[]>;
    }
  | { hata: string };

async function secenekler(listeAnahtari: string) {
  return prisma.secenekDegeri.findMany({
    where: { liste: { anahtar: listeAnahtari }, aktifMi: true },
    orderBy: { siraNo: "asc" },
    select: { id: true, kod: true, etiket: true },
  });
}

// 1. adim: Excel'i oku, her satira bir tasnif TAHMINI uret. Hicbir sey
// kaydedilmez - sonuc kullanicinin onay ekranina gider.
export async function masrafExcelOnizle(dosyaId: string, formData: FormData): Promise<OnizlemeSonucu> {
  const kullanici = await mevcutKullanici();
  if (!kullanici) return { hata: "Bu işlem için yetkiniz yok." };

  const dosya = formData.get("excel");
  if (!(dosya instanceof File) || dosya.size === 0) return { hata: "Bir Excel dosyası (.xlsx) seçin." };
  if (!dosya.name.toLowerCase().endsWith(".xlsx")) return { hata: "Yalnızca .xlsx dosyaları desteklenir." };

  let hamSatirlar: HamSatir[];
  try {
    hamSatirlar = await excelSatirlariniOku(await dosya.arrayBuffer());
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Excel okunamadı." };
  }
  if (hamSatirlar.length === 0) return { hata: "Excel'de aktarılabilir satır bulunamadı." };
  if (hamSatirlar.length > 500) return { hata: "Tek seferde en fazla 500 satır aktarılabilir." };

  const [turler, gruplar, kalemler, cariKodlar, kurallar, mevcutMasraflar] = await Promise.all([
    secenekler("masraf_turu"),
    secenekler("masraf_grubu"),
    secenekler("masraf_kalemi"),
    secenekler("cari_kod"),
    prisma.masrafTasnifKurali.findMany(),
    prisma.dosyaMasrafi.findMany({ where: { dosyaId }, select: { tarih: true, tutar: true, aciklama: true } }),
  ]);
  const idBul = (liste: { id: string; kod: string }[], kod: string | null) =>
    (kod && liste.find((o) => o.kod === kod)?.id) || "";
  const kuralHaritasi = new Map(kurallar.map((k) => [k.anahtar, k]));
  const mevcutAnahtarlar = new Set(
    mevcutMasraflar.map((m) => `${m.tarih.toISOString().slice(0, 10)}|${Number(m.tutar).toFixed(2)}|${normalize(m.aciklama)}`),
  );

  const satirlar: OnizlemeSatiri[] = hamSatirlar.map((ham) => {
    const kural = kuralHaritasi.get(kuralAnahtari(ham));
    const tahmin = satiriTahminEt(ham);
    const aciklama = ham.aciklama || [ham.excelTur, ...ham.digerMetinler].filter(Boolean).join(" - ");
    const gecersizNedeni = !ham.tarih
      ? "Tarih okunamadı"
      : ham.tutar === null || ham.tutar <= 0
        ? "Tutar eksik ya da sıfır"
        : null;
    const tekrarMi =
      !gecersizNedeni &&
      mevcutAnahtarlar.has(`${ham.tarih}|${(ham.tutar as number).toFixed(2)}|${normalize(aciklama)}`);

    return {
      anahtar: `s${ham.satirNo}`,
      satirNo: ham.satirNo,
      tarih: ham.tarih,
      excelTur: ham.excelTur,
      excelCariKod: [ham.excelCariKod, ...ham.digerMetinler].filter(Boolean).join(" | "),
      aciklama,
      tutar: ham.tutar,
      turId: kural?.turId ?? idBul(turler, tahmin.turKodu),
      grupId: kural?.grupId ?? idBul(gruplar, tahmin.grupKodu),
      kalemId: kural?.kalemId ?? idBul(kalemler, tahmin.kalemKodu),
      cariKodId: kural?.cariKodId ?? idBul(cariKodlar, tahmin.cariKodKodu),
      yansitmaHedefi: kural?.yansitmaHedefi ?? "MUVEKKIL",
      guven: kural ? "ogrenilmis" : tahmin.guven,
      nedenler: kural
        ? [`Daha önce onayladığınız bir karar uygulandı (${kural.kullanimSayisi} kez kullanıldı).`]
        : tahmin.nedenler,
      tekrarMi,
      gecersizNedeni,
      kuralAnahtari: kuralAnahtari(ham),
    };
  });

  const sade = (liste: { id: string; etiket: string }[]) => liste.map((o) => ({ id: o.id, etiket: o.etiket }));
  return {
    satirlar,
    secenekler: { tur: sade(turler), grup: sade(gruplar), kalem: sade(kalemler), cariKod: sade(cariKodlar) },
  };
}

export type AktarilacakSatir = {
  tarih: string;
  tutar: number;
  aciklama: string;
  turId: string;
  grupId: string;
  kalemId: string;
  cariKodId: string;
  yansitmaHedefi: MasrafYansitmaHedefi;
  hatirla: boolean;
  kuralAnahtari: string;
};

// 2. adim: kullanicinin ONAYLADIGI satirlari kaydet. Onaylanmayan satirlar
// istemciden hic gelmez. "Hatirla" isaretli olanlar bir sonraki aktarimda
// otomatik uygulanmak uzere kural olarak saklanir.
export async function masrafExcelAktar(dosyaId: string, satirlar: AktarilacakSatir[]) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için yetkiniz yok.");
  if (satirlar.length === 0) throw new Error("Aktarılacak onaylı satır yok.");
  if (satirlar.length > 500) throw new Error("Tek seferde en fazla 500 satır aktarılabilir.");

  for (const s of satirlar) {
    if (!s.turId || !s.cariKodId) throw new Error("Her onaylı satırda Tür ve Cari Kod seçili olmalı.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.tarih) || !(s.tutar > 0) || !s.aciklama.trim()) {
      throw new Error("Satırlarda tarih, tutar ve açıklama zorunludur.");
    }
  }

  await prisma.$transaction([
    prisma.dosyaMasrafi.createMany({
      data: satirlar.map((s) => ({
        dosyaId,
        cariKodId: s.cariKodId,
        turId: s.turId,
        grupId: s.grupId || null,
        kalemId: s.kalemId || null,
        tarih: new Date(s.tarih),
        aciklama: s.aciklama.trim(),
        tutar: s.tutar,
        yansitmaHedefi: s.yansitmaHedefi,
      })),
    }),
    ...satirlar
      .filter((s) => s.hatirla && s.kuralAnahtari.length > 1)
      .map((s) =>
        prisma.masrafTasnifKurali.upsert({
          where: { anahtar: s.kuralAnahtari },
          update: {
            turId: s.turId,
            cariKodId: s.cariKodId,
            grupId: s.grupId || null,
            kalemId: s.kalemId || null,
            yansitmaHedefi: s.yansitmaHedefi,
            kullanimSayisi: { increment: 1 },
          },
          create: {
            anahtar: s.kuralAnahtari,
            turId: s.turId,
            cariKodId: s.cariKodId,
            grupId: s.grupId || null,
            kalemId: s.kalemId || null,
            yansitmaHedefi: s.yansitmaHedefi,
          },
        }),
      ),
  ]);

  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
  return { eklenen: satirlar.length };
}
