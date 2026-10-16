import { prisma } from "@/core/db/prisma";
import { dosyaKisaNo } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { dosyaAgaciCariHesapOzeti } from "@/modules/dava-dosyasi/lib/queries";

// MUVEKKIL + DOSYA EKONOMISI (on muhasebe mantigi)
//
// Hesaplar (CariHesap): 100 Para Trafigi, 101 Akdi Vekalet, 102 Harcama,
// 103 Bloke Para ... admin yenisini ekleyebilir. AYNI hesaplar iki duzeyde:
//   - Muvekkil duzeyi: muvekkilin TUM dosyalarinin satirlari (her satir hangi
//     dosyaya ait oldugunu tasir),
//   - Dosya duzeyi: yalniz o dosyanin satirlari.
// Tek kayit iki yerde gorunur; hicbir tutar iki kere girilmez.
//
// Bakiye KAYITLARDAN hesaplanir (elle formul yok, satir siniri yok):
//   Para Trafigi: Alacak - Borc (dagitilmamis para)
//   Diger hesaplar: Borc - Alacak (muvekkilin kalan borcu)
// Net = Σ diger hesap bakiyeleri - Para Trafigi bakiyesi
//   (pozitifse muvekkil bize borclu, negatifse lehine fazla/bekleyen para var).

export type Kapsam = { musteriId: string; dosyaId?: string };

export type SatirSilme =
  | { tip: "hareket"; id: string }
  | { tip: "virman"; id: string }
  | { tip: "masraf"; id: string }
  | { tip: "avansAktarimi"; id: string };

export type DefterSatiri = {
  id: string;
  tarih: Date;
  dosyaId: string | null;
  dosyaEtiketi: string | null;
  aciklama: string;
  borc: number;
  alacak: number;
  silme?: SilmeKaynagi;
  duzenleHref?: string;
  turetilmis?: boolean;
};
type SilmeKaynagi = SatirSilme;

export type HesapOzeti = {
  hesapId: string;
  no: number;
  ad: string;
  paraHesabiMi: boolean;
  masrafHesabiMi: boolean;
  borc: number;
  alacak: number;
  bakiye: number;
};

export type KapsamOzeti = {
  hesaplar: HesapOzeti[];
  paraBakiyesi: number;
  digerBorclar: number;
  net: number;
};

const sayi = (v: unknown) => Number(v ?? 0);

// Eski ParaTrafigiDagitimi kullanim amaclarinin karsilik geldigi eski cari kod.
const ESKI_DAGITIM_AMACI_KODU: Record<string, string> = {
  gecmis_masraf: "masraf_hesabi",
  dosya_avansi: "masraf_hesabi",
  vekalet_ucreti_odeme: "akdi_vekalet_hesabi",
};

const dosyaSecimi = {
  select: { id: true, kayitNo: true, altSiraNo: true, buroNo: true, dosyaNo: true, anaDosya: { select: { kayitNo: true } } },
} as const;

export function dosyaEtiketiYaz(d: {
  kayitNo: number;
  altSiraNo?: number | null;
  buroNo: string | null;
  dosyaNo: string | null;
  anaDosya?: { kayitNo: number } | null;
}) {
  return `${dosyaKisaNo(d)}${d.dosyaNo ? ` · ${d.dosyaNo}` : ""}`;
}

export async function hesaplariGetir(hepsi = false) {
  return prisma.cariHesap.findMany({
    where: hepsi ? {} : { aktifMi: true },
    orderBy: { no: "asc" },
  });
}

export async function kapsamDosyaIdleri(kapsam: Kapsam): Promise<string[]> {
  if (kapsam.dosyaId) return [kapsam.dosyaId];
  const dosyalar = await prisma.davaDosyasi.findMany({
    where: { muvekkiller: { some: { musteriId: kapsam.musteriId } } },
    select: { id: true },
  });
  return dosyalar.map((d) => d.id);
}

// Hesap bazinda Borc/Alacak/Bakiye (groupBy ile; satirlari tek tek cekmez).
export async function kapsamOzeti(kapsam: Kapsam): Promise<KapsamOzeti> {
  const dosyaIdleri = await kapsamDosyaIdleri(kapsam);
  const hareketKosulu = {
    musteriId: kapsam.musteriId,
    ...(kapsam.dosyaId ? { dosyaId: kapsam.dosyaId } : {}),
  };
  const [hesaplar, hareketler, havuzdanAktarim, masraflar, eskiOzet] = await Promise.all([
    hesaplariGetir(),
    prisma.cariHareketi.groupBy({ by: ["hesapId", "yon"], where: hareketKosulu, _sum: { tutar: true } }),
    // Dosya gorunumunde, muvekkil havuzundan yapilan virmanlar Para Trafigi'ne ALACAK olarak turetilir.
    kapsam.dosyaId
      ? prisma.cariHareketi.groupBy({
          by: ["hesapId"],
          where: { ...hareketKosulu, yon: "BORC", havuzKaynakli: true },
          _sum: { tutar: true },
        })
      : Promise.resolve([]),
    prisma.dosyaMasrafi.groupBy({
      by: ["cariKodId"],
      where: { dosyaId: { in: dosyaIdleri }, yansitmaHedefi: "MUVEKKIL" },
      _sum: { tutar: true },
    }),
    dosyaAgaciCariHesapOzeti(dosyaIdleri),
  ]);

  const cariKodlar = await prisma.secenekDegeri.findMany({
    where: { id: { in: masraflar.map((m) => m.cariKodId) } },
    select: { id: true, kod: true },
  });
  const kodOf = new Map(cariKodlar.map((k) => [k.id, k.kod]));
  const masrafByKod = new Map<string, number>();
  for (const m of masraflar) {
    const kod = kodOf.get(m.cariKodId);
    if (kod) masrafByKod.set(kod, (masrafByKod.get(kod) ?? 0) + sayi(m._sum.tutar));
  }
  const eskiByKod = new Map(eskiOzet.map((o) => [o.cariKod.kod, o]));

  const ozetler: HesapOzeti[] = hesaplar.map((h) => {
    let borc = 0;
    let alacak = 0;
    for (const x of hareketler) {
      if (x.hesapId !== h.id) continue;
      if (x.yon === "BORC") borc += sayi(x._sum.tutar);
      else alacak += sayi(x._sum.tutar);
    }
    if (h.paraHesabiMi) {
      alacak += havuzdanAktarim.reduce((t, x) => t + (x.hesapId === h.id ? sayi(x._sum.tutar) : 0), 0);
    }
    if (h.eskiKod) {
      borc += (masrafByKod.get(h.eskiKod) ?? 0) + (eskiByKod.get(h.eskiKod)?.gidenAktarim ?? 0);
      alacak += (eskiByKod.get(h.eskiKod)?.tasnifToplami ?? 0) + (eskiByKod.get(h.eskiKod)?.gelenAktarim ?? 0);
    }
    return {
      hesapId: h.id,
      no: h.no,
      ad: h.ad,
      paraHesabiMi: h.paraHesabiMi,
      masrafHesabiMi: h.masrafHesabiMi,
      borc,
      alacak,
      bakiye: h.paraHesabiMi ? alacak - borc : borc - alacak,
    };
  });

  const paraBakiyesi = ozetler.filter((o) => o.paraHesabiMi).reduce((t, o) => t + o.bakiye, 0);
  const digerBorclar = ozetler.filter((o) => !o.paraHesabiMi).reduce((t, o) => t + o.bakiye, 0);
  return { hesaplar: ozetler, paraBakiyesi, digerBorclar, net: digerBorclar - paraBakiyesi };
}

// Tek hesabin defteri: kapsamdaki tum satirlar (kronolojik siralanmak uzere).
export async function hesapDefteri(kapsam: Kapsam, hesap: { id: string; paraHesabiMi: boolean; eskiKod: string | null }) {
  const dosyaIdleri = await kapsamDosyaIdleri(kapsam);
  const hareketKosulu = {
    musteriId: kapsam.musteriId,
    hesapId: hesap.id,
    ...(kapsam.dosyaId ? { dosyaId: kapsam.dosyaId } : {}),
  };
  const musteriBazli = !kapsam.dosyaId;

  const [hareketler, masraflar, eskiTasnif, eskiDagitim, gelenler, gidenler] = await Promise.all([
    prisma.cariHareketi.findMany({ where: hareketKosulu, include: { dosya: dosyaSecimi } }),
    hesap.eskiKod
      ? prisma.dosyaMasrafi.findMany({
          where: { dosyaId: { in: dosyaIdleri }, yansitmaHedefi: "MUVEKKIL", cariKod: { kod: hesap.eskiKod } },
          include: { tur: true, dosya: dosyaSecimi },
        })
      : Promise.resolve([]),
    hesap.eskiKod
      ? prisma.paraTrafigiTasnif.findMany({
          where: {
            cariKod: { kod: hesap.eskiKod },
            paraTrafigi: {
              durum: { kod: "tahsil_edildi" },
              dosyalar: { some: { dosyaId: { in: dosyaIdleri } } },
              dagitimlar: { none: {} },
            },
          },
          include: { paraTrafigi: { include: { tip: true, dosyalar: { include: { dosya: dosyaSecimi } } } } },
        })
      : Promise.resolve([]),
    hesap.eskiKod
      ? prisma.paraTrafigiDagitimi.findMany({
          where: { dosyaId: { in: dosyaIdleri }, paraTrafigi: { durum: { kod: "tahsil_edildi" } } },
          include: { kullanimAmaci: true, paraTrafigi: { include: { tip: true } }, dosya: dosyaSecimi },
        })
      : Promise.resolve([]),
    hesap.eskiKod
      ? prisma.dosyaAvansAktarimi.findMany({
          where: { hedefDosyaId: { in: dosyaIdleri }, kaynakDosyaId: { notIn: musteriBazli ? dosyaIdleri : [] }, cariKod: { kod: hesap.eskiKod } },
          include: { kaynakDosya: dosyaSecimi, hedefDosya: dosyaSecimi },
        })
      : Promise.resolve([]),
    hesap.eskiKod
      ? prisma.dosyaAvansAktarimi.findMany({
          where: { kaynakDosyaId: { in: dosyaIdleri }, hedefDosyaId: { notIn: musteriBazli ? dosyaIdleri : [] }, cariKod: { kod: hesap.eskiKod } },
          include: { kaynakDosya: dosyaSecimi, hedefDosya: dosyaSecimi },
        })
      : Promise.resolve([]),
  ]);

  const satirlar: DefterSatiri[] = [];
  const etiket = (d: Parameters<typeof dosyaEtiketiYaz>[0] | null | undefined) => (d ? dosyaEtiketiYaz(d) : null);

  for (const h of hareketler) {
    const virmanMi = Boolean(h.virmanId);
    // Havuzdan aktarim ALACAGI, ayni tarihli BORC virman satirindan once gelir (bakiye eksiye dusmesin).
    if (kapsam.dosyaId && hesap.paraHesabiMi && h.yon === "BORC" && h.havuzKaynakli) {
      satirlar.push({
        id: `turetilmis-${h.id}`,
        tarih: h.tarih,
        dosyaId: h.dosyaId,
        dosyaEtiketi: etiket(h.dosya),
        aciklama: "MÜVEKKİL HAVUZUNDAN AKTARIM",
        borc: 0,
        alacak: sayi(h.tutar),
        turetilmis: true,
      });
    }
    satirlar.push({
      id: `hareket-${h.id}`,
      tarih: h.tarih,
      dosyaId: h.dosyaId,
      dosyaEtiketi: etiket(h.dosya),
      aciklama: h.aciklama ?? "",
      borc: h.yon === "BORC" ? sayi(h.tutar) : 0,
      alacak: h.yon === "ALACAK" ? sayi(h.tutar) : 0,
      silme: virmanMi ? { tip: "virman", id: h.virmanId! } : { tip: "hareket", id: h.id },
      duzenleHref: virmanMi ? undefined : `/kokpit/finans/musteri-iliskileri/${kapsam.musteriId}/hareket/${h.id}/duzenle`,
    });
  }
  for (const m of masraflar) {
    satirlar.push({
      id: `masraf-${m.id}`,
      tarih: m.tarih,
      dosyaId: m.dosyaId,
      dosyaEtiketi: etiket(m.dosya),
      aciklama: `${m.tur.etiket} — ${m.aciklama}`,
      borc: sayi(m.tutar),
      alacak: 0,
      silme: { tip: "masraf", id: m.id },
      duzenleHref: `/kokpit/dava-dosyalari/${m.dosyaId}/masraflar/${m.id}/duzenle`,
    });
  }
  for (const t of eskiTasnif) {
    const dosya = t.paraTrafigi.dosyalar.find((d) => dosyaIdleri.includes(d.dosyaId))?.dosya;
    satirlar.push({
      id: `eski-tasnif-${t.id}`,
      tarih: t.paraTrafigi.tarih,
      dosyaId: dosya?.id ?? null,
      dosyaEtiketi: etiket(dosya),
      aciklama: `Eski kayıt — ${t.paraTrafigi.tip.etiket}`,
      borc: 0,
      alacak: sayi(t.tutar),
    });
  }
  for (const d of eskiDagitim) {
    if (ESKI_DAGITIM_AMACI_KODU[d.kullanimAmaci.kod] !== hesap.eskiKod) continue;
    satirlar.push({
      id: `eski-dagitim-${d.id}`,
      tarih: d.paraTrafigi.tarih,
      dosyaId: d.dosyaId,
      dosyaEtiketi: etiket(d.dosya),
      aciklama: `Eski kayıt — ${d.paraTrafigi.tip.etiket} (${d.kullanimAmaci.etiket})`,
      borc: 0,
      alacak: sayi(d.tutar),
    });
  }
  for (const a of gelenler) {
    satirlar.push({
      id: `gelen-${a.id}`,
      tarih: a.tarih,
      dosyaId: a.hedefDosyaId,
      dosyaEtiketi: etiket(a.hedefDosya),
      aciklama: `Avans aktarımı: ${dosyaKisaNo(a.kaynakDosya)} dosyasından — ${a.aciklama}`,
      borc: 0,
      alacak: sayi(a.tutar),
      silme: { tip: "avansAktarimi", id: a.id },
    });
  }
  for (const a of gidenler) {
    satirlar.push({
      id: `giden-${a.id}`,
      tarih: a.tarih,
      dosyaId: a.kaynakDosyaId,
      dosyaEtiketi: etiket(a.kaynakDosya),
      aciklama: `Avans aktarımı: ${dosyaKisaNo(a.hedefDosya)} dosyasına — ${a.aciklama}`,
      borc: sayi(a.tutar),
      alacak: 0,
      silme: { tip: "avansAktarimi", id: a.id },
    });
  }
  return satirlar.sort((a, b) => a.tarih.getTime() - b.tarih.getTime());
}

// Muvekkilin dosyalari (sayfa sekmeleri ve secim kutulari icin).
export async function muvekkilDosyalari(musteriId: string) {
  const dosyalar = await prisma.davaDosyasi.findMany({
    where: { muvekkiller: { some: { musteriId } } },
    select: { ...dosyaSecimi.select, konu: true, birimAdi: true },
    orderBy: { olusturmaTarihi: "asc" },
  });
  return dosyalar.map((d) => ({ id: d.id, etiket: dosyaEtiketiYaz(d), konu: d.konu, birimAdi: d.birimAdi }));
}

export async function secenekListesiTumDegerlerle(anahtar: string) {
  const liste = await prisma.secenekListesi.findUnique({
    where: { anahtar },
    include: { degerler: { orderBy: { siraNo: "asc" } } },
  });
  if (!liste) return null;
  return {
    id: liste.id,
    ad: liste.ad,
    degerler: liste.degerler.map((d) => ({
      id: d.id,
      kod: d.kod,
      etiket: d.etiket,
      aktifMi: d.aktifMi,
      maktuTutar: d.maktuTutar !== null ? Number(d.maktuTutar) : null,
    })),
  };
}
