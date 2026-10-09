import { prisma } from "@/core/db/prisma";
import { dosyaKisaNo } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { dosyaAgaciCariHesapOzeti } from "@/modules/dava-dosyasi/lib/queries";
import type { DefterSatiri } from "@/modules/dava-dosyasi/lib/cari-defter";

// Dosya Ekonomisi: on muhasebe mantigi. Her cari kodun (Akdi Vekalet,
// Harcamalar, Karsi Vekalet, Harc Hesabi, Bloke Paralar, Ticari Hesap...)
// dosya icinde ayri BORC ve ALACAK hanesi vardir:
//   BORC   = muvekkilin o koda odemesi gereken (tahakkuk ya da masraf)
//   ALACAK = o koda odenmis/dagitilmis tutar (havuzdan aktarim, eski tasnif)
//   BAKIYE = Borc - Alacak (pozitif: muvekkil borclu, negatif: fazla odeme)
// Muvekkilden gelen para ONCE havuza girer (hicbir koda ait degil), sonra
// kullanici istedigi koda (kismen de olabilir) dagitir.

export const HARCAMA_KODU = "masraf_hesabi";
export const HAVUZ_HESAP_NO = 101;

// Hesap numaralari: 101 Havuz (sabit), 102 Akdi Vekalet, 103 Masraf; diger
// cari kodlar liste sirasiyla 104'ten baslar.
const SABIT_HESAP_NO: Record<string, number> = { akdi_vekalet_hesabi: 102, [HARCAMA_KODU]: 103 };

// Eski ParaTrafigiDagitimi kullanim amaclarinin karsilik geldigi cari kod.
const ESKI_DAGITIM_AMACI_KODU: Record<string, string> = {
  gecmis_masraf: "masraf_hesabi",
  dosya_avansi: "masraf_hesabi",
  vekalet_ucreti_odeme: "akdi_vekalet_hesabi",
};

export type KodOzeti = {
  hesapNo: number;
  kodId: string;
  kod: string;
  etiket: string;
  borc: number;
  alacak: number;
  bakiye: number;
};

export type HavuzGirisi = {
  id: string;
  tarih: Date;
  aciklama: string | null;
  tutar: number;
  dagitilan: number;
  kalan: number;
};

export type DosyaEkonomisi = {
  kodlar: KodOzeti[];
  havuz: HavuzGirisi[];
  havuzKalan: number;
  toplamBorc: number;
  toplamAlacak: number;
  // Borc - (alacak + havuz): pozitifse muvekkil toplamda buroya borclu,
  // negatifse buroda muvekkile ait fazla/bekleyen para var.
  net: number;
};

const sayi = (v: unknown) => Number(v ?? 0);

export async function havuzGirisleri(dosyaIdleri: string[]): Promise<HavuzGirisi[]> {
  const girisler = await prisma.dosyaParaGirisi.findMany({
    where: { dosyaId: { in: dosyaIdleri } },
    include: { dagitimlar: { select: { tutar: true } } },
    orderBy: { tarih: "asc" },
  });
  return girisler.map((g) => {
    const dagitilan = g.dagitimlar.reduce((t, d) => t + sayi(d.tutar), 0);
    return {
      id: g.id,
      tarih: g.tarih,
      aciklama: g.aciklama,
      tutar: sayi(g.tutar),
      dagitilan,
      kalan: sayi(g.tutar) - dagitilan,
    };
  });
}

// Bir ya da birden fazla dosyanin (tek dosya, ana+alt dosyalar ya da bir
// muvekkilin tum dosyalari) cari kod bazinda Borc/Alacak/Bakiye ozeti.
// Dosyalar arasi avans aktarimlari (eski mekanizma) kapsam icinde hem giris
// hem cikis olarak girdiginden birbirini goturur.
export async function ekonomiHesapla(dosyaIdleri: string[]): Promise<DosyaEkonomisi> {
  if (dosyaIdleri.length === 0) {
    return { kodlar: [], havuz: [], havuzKalan: 0, toplamBorc: 0, toplamAlacak: 0, net: 0 };
  }
  const [cariKodlar, tahakkuklar, masraflar, dagitimlar, eskiOzet, havuz] = await Promise.all([
    prisma.secenekDegeri.findMany({
      where: { liste: { anahtar: "cari_kod" }, aktifMi: true },
      orderBy: { siraNo: "asc" },
    }),
    prisma.dosyaCariTahakkuku.groupBy({
      by: ["cariKodId"],
      where: { dosyaId: { in: dosyaIdleri } },
      _sum: { tutar: true },
    }),
    prisma.dosyaMasrafi.groupBy({
      by: ["cariKodId"],
      where: { dosyaId: { in: dosyaIdleri }, yansitmaHedefi: "MUVEKKIL" },
      _sum: { tutar: true },
    }),
    prisma.dosyaCariDagitimi.groupBy({
      by: ["cariKodId"],
      where: { dosyaId: { in: dosyaIdleri } },
      _sum: { tutar: true },
    }),
    dosyaAgaciCariHesapOzeti(dosyaIdleri),
    havuzGirisleri(dosyaIdleri),
  ]);

  const harita = (satirlar: { cariKodId: string; _sum: { tutar: unknown } }[]) =>
    new Map(satirlar.map((s) => [s.cariKodId, sayi(s._sum.tutar)]));
  const tahakkukMap = harita(tahakkuklar);
  const masrafMap = harita(masraflar);
  const dagitimMap = harita(dagitimlar);
  const eskiMap = new Map(eskiOzet.map((o) => [o.cariKod.id, o]));

  let siradakiNo = 104;
  const kodlar: KodOzeti[] = cariKodlar
    .map((k) => {
      const eski = eskiMap.get(k.id);
      const hesapNo = SABIT_HESAP_NO[k.kod] ?? siradakiNo++;
      const borc = (tahakkukMap.get(k.id) ?? 0) + (masrafMap.get(k.id) ?? 0) + (eski?.gidenAktarim ?? 0);
      const alacak = (dagitimMap.get(k.id) ?? 0) + (eski?.tasnifToplami ?? 0) + (eski?.gelenAktarim ?? 0);
      return { hesapNo, kodId: k.id, kod: k.kod, etiket: k.etiket, borc, alacak, bakiye: borc - alacak };
    })
    .sort((a, b) => a.hesapNo - b.hesapNo);

  const havuzKalan = havuz.reduce((t, h) => t + h.kalan, 0);
  const toplamBorc = kodlar.reduce((t, k) => t + k.borc, 0);
  const toplamAlacak = kodlar.reduce((t, k) => t + k.alacak, 0);
  return { kodlar, havuz, havuzKalan, toplamBorc, toplamAlacak, net: toplamBorc - toplamAlacak - havuzKalan };
}

export function dosyaEkonomisi(dosyaId: string) {
  return ekonomiHesapla([dosyaId]);
}

const siraliSatirlar = (satirlar: DefterSatiri[]) =>
  [...satirlar].sort((a, b) => a.tarih.getTime() - b.tarih.getTime());

// Tek cari kodun (ör. Akdi Vekalet) dosya ici defteri: borc ve alacak satirlari.
export async function kodDefteri(dosyaId: string, kodId: string, kod: string): Promise<DefterSatiri[]> {
  const [tahakkuklar, masraflar, dagitimlar, eskiTasnif, eskiDagitim, gelenler, gidenler] = await Promise.all([
    prisma.dosyaCariTahakkuku.findMany({ where: { dosyaId, cariKodId: kodId } }),
    prisma.dosyaMasrafi.findMany({
      where: { dosyaId, cariKodId: kodId, yansitmaHedefi: "MUVEKKIL" },
      include: { tur: true },
    }),
    prisma.dosyaCariDagitimi.findMany({ where: { dosyaId, cariKodId: kodId }, include: { paraGirisi: true } }),
    prisma.paraTrafigiTasnif.findMany({
      where: {
        cariKodId: kodId,
        paraTrafigi: { durum: { kod: "tahsil_edildi" }, dosyalar: { some: { dosyaId } }, dagitimlar: { none: {} } },
      },
      include: { paraTrafigi: { include: { tip: true } } },
    }),
    prisma.paraTrafigiDagitimi.findMany({
      where: { dosyaId, paraTrafigi: { durum: { kod: "tahsil_edildi" } } },
      include: { kullanimAmaci: true, paraTrafigi: { include: { tip: true } } },
    }),
    prisma.dosyaAvansAktarimi.findMany({
      where: { hedefDosyaId: dosyaId, cariKodId: kodId },
      include: { kaynakDosya: { include: { anaDosya: { select: { kayitNo: true } } } } },
    }),
    prisma.dosyaAvansAktarimi.findMany({
      where: { kaynakDosyaId: dosyaId, cariKodId: kodId },
      include: { hedefDosya: { include: { anaDosya: { select: { kayitNo: true } } } } },
    }),
  ]);

  const satirlar: DefterSatiri[] = [];
  for (const t of tahakkuklar) {
    satirlar.push({
      id: `tahakkuk-${t.id}`,
      tarih: t.tarih,
      aciklama: t.dayanak,
      borc: sayi(t.tutar),
      alacak: 0,
      silme: { tip: "tahakkuk", id: t.id },
    });
  }
  for (const m of masraflar) {
    satirlar.push({
      id: `masraf-${m.id}`,
      tarih: m.tarih,
      aciklama: `${m.tur.etiket} — ${m.aciklama}`,
      borc: sayi(m.tutar),
      alacak: 0,
      silme: { tip: "masraf", id: m.id },
      duzenleHref: `/kokpit/dava-dosyalari/${dosyaId}/masraflar/${m.id}/duzenle`,
    });
  }
  for (const d of dagitimlar) {
    satirlar.push({
      id: `dagitim-${d.id}`,
      tarih: d.tarih,
      aciklama: `101-HAVUZ VİRMAN${d.aciklama ? ` — ${d.aciklama}` : ""}`,
      borc: 0,
      alacak: sayi(d.tutar),
      silme: { tip: "dagitim", id: d.id },
    });
  }
  for (const t of eskiTasnif) {
    satirlar.push({
      id: `eski-tasnif-${t.id}`,
      tarih: t.paraTrafigi.tarih,
      aciklama: `Eski kayıt — ${t.paraTrafigi.tip.etiket}`,
      borc: 0,
      alacak: sayi(t.tutar),
    });
  }
  for (const d of eskiDagitim) {
    if (ESKI_DAGITIM_AMACI_KODU[d.kullanimAmaci.kod] !== kod) continue;
    satirlar.push({
      id: `eski-dagitim-${d.id}`,
      tarih: d.paraTrafigi.tarih,
      aciklama: `Eski kayıt — ${d.paraTrafigi.tip.etiket} (${d.kullanimAmaci.etiket})`,
      borc: 0,
      alacak: sayi(d.tutar),
    });
  }
  for (const a of gelenler) {
    satirlar.push({
      id: `gelen-${a.id}`,
      tarih: a.tarih,
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
      aciklama: `Avans aktarımı: ${dosyaKisaNo(a.hedefDosya)} dosyasına — ${a.aciklama}`,
      borc: sayi(a.tutar),
      alacak: 0,
      silme: { tip: "avansAktarimi", id: a.id },
    });
  }
  return siraliSatirlar(satirlar);
}

// 101 Havuz defteri: gelen paralar ALACAK, hesaplara yapilan virmanlar BORC
// ("103-MASRAF VIRMAN"). Bakiye = Alacak - Borc (dagitim bekleyen para).
export async function havuzDefteri(dosyaId: string, kodlar: KodOzeti[]): Promise<DefterSatiri[]> {
  const [girisler, dagitimlar] = await Promise.all([
    prisma.dosyaParaGirisi.findMany({ where: { dosyaId } }),
    prisma.dosyaCariDagitimi.findMany({ where: { dosyaId } }),
  ]);
  const kodMap = new Map(kodlar.map((k) => [k.kodId, k]));
  const satirlar: DefterSatiri[] = [];
  for (const g of girisler) {
    satirlar.push({
      id: `giris-${g.id}`,
      tarih: g.tarih,
      aciklama: g.aciklama ?? "Müvekkilden gelen para",
      borc: 0,
      alacak: sayi(g.tutar),
      silme: { tip: "paraGirisi", id: g.id },
    });
  }
  for (const d of dagitimlar) {
    const k = kodMap.get(d.cariKodId);
    satirlar.push({
      id: `virman-${d.id}`,
      tarih: d.tarih,
      aciklama: `${k ? `${k.hesapNo}-${k.etiket.toLocaleUpperCase("tr-TR")}` : "?"} VİRMAN`,
      borc: sayi(d.tutar),
      alacak: 0,
      silme: { tip: "dagitim", id: d.id },
    });
  }
  return siraliSatirlar(satirlar);
}

export type MuvekkilEkonomiSatiri = {
  dosyaId: string;
  dosyaNo: string;
  konu: string;
  ekonomi: DosyaEkonomisi;
};

// Muvekkilin tum dosyalari icin ayri ayri ekonomi + toplam: "10 dosyanin
// toplam akdi vekalet borcu / masraf borcu ne kadar?" sorusunun cevabi.
export async function muvekkilEkonomisi(musteriId: string) {
  const dosyalar = await prisma.davaDosyasi.findMany({
    where: { muvekkiller: { some: { musteriId } } },
    select: {
      id: true,
      kayitNo: true,
      altSiraNo: true,
      anaDosya: { select: { kayitNo: true } },
      buroNo: true,
      dosyaNo: true,
      konu: true,
    },
    orderBy: { olusturmaTarihi: "asc" },
  });
  const satirlar: MuvekkilEkonomiSatiri[] = await Promise.all(
    dosyalar.map(async (d) => ({
      dosyaId: d.id,
      dosyaNo: dosyaKisaNo(d),
      konu: d.konu,
      ekonomi: await ekonomiHesapla([d.id]),
    })),
  );
  const toplam = await ekonomiHesapla(dosyalar.map((d) => d.id));
  return { satirlar, toplam };
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
