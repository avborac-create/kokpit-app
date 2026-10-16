import { prisma } from "@/core/db/prisma";
import { dosyaKisaNo } from "@/modules/dava-dosyasi/lib/kokpit-no";

// Dosya Ekonomisi sekmesindeki 3 cari defterin (Buro-Muvekkil, Buro-Adliye,
// Buro-Borclu) ortak satir bicimi. Klasik cari hesap mantigi KARSI TARAF
// acisindan yazilir: BORC = buronun o taraf adina odedigi/o tarafin buroya
// borclandigi, ALACAK = o taraftan alinan/mahsup edilen. Bakiye = kumulatif
// (Borc - Alacak); pozitifse karsi taraf buroya borclu, negatifse buro
// karsi tarafa borclu (ör. muvekkilin kullanilmamis avansi).
export type SilmeKaynagi =
  | { tip: "masraf"; id: string }
  | { tip: "avansAktarimi"; id: string }
  | { tip: "adliBirim"; id: string }
  | { tip: "karsiTarafAlacagi"; id: string };

export type DefterSatiri = {
  id: string;
  tarih: Date;
  aciklama: string;
  borc: number;
  alacak: number;
  silme?: SilmeKaynagi;
  duzenleHref?: string;
  tahsilDegistir?: { id: string; tahsilEdildiMi: boolean };
};

const AKDI_VEKALET_KODU = "akdi_vekalet_hesabi";
// Dagitim kullanim amaclarindan cari hesaba yansiyanlar (bkz. queries.ts).
const DAGITIM_AMACLARI = ["gecmis_masraf", "dosya_avansi", "vekalet_ucreti_odeme"];

export async function muvekkilDefteri(dosyaId: string): Promise<DefterSatiri[]> {
  const [tasnifler, dagitimlar, masraflar, gelenler, gidenler] = await Promise.all([
    prisma.paraTrafigiTasnif.findMany({
      where: {
        paraTrafigi: {
          durum: { kod: "tahsil_edildi" },
          dosyalar: { some: { dosyaId } },
          dagitimlar: { none: {} },
        },
      },
      include: { cariKod: true, paraTrafigi: { include: { tip: true } } },
    }),
    prisma.paraTrafigiDagitimi.findMany({
      where: { dosyaId, paraTrafigi: { durum: { kod: "tahsil_edildi" } } },
      include: { kullanimAmaci: true, paraTrafigi: { include: { tip: true } } },
    }),
    prisma.dosyaMasrafi.findMany({
      where: { dosyaId, yansitmaHedefi: "MUVEKKIL" },
      include: { tur: true },
    }),
    prisma.dosyaAvansAktarimi.findMany({
      where: { hedefDosyaId: dosyaId },
      include: { kaynakDosya: { include: { anaDosya: { select: { kayitNo: true } } } } },
    }),
    prisma.dosyaAvansAktarimi.findMany({
      where: { kaynakDosyaId: dosyaId },
      include: { hedefDosya: { include: { anaDosya: { select: { kayitNo: true } } } } },
    }),
  ]);

  const satirlar: DefterSatiri[] = [];

  // Muvekkilden alinan para = ALACAK. Akdi vekalet ucreti buronun kesin
  // gelirdir: alinir alinmaz mahsup edilir (esit BORC satiri), boylece
  // bakiye "muvekkilin geri alabilecegi avans"i gostermeye devam eder.
  const alinanEkle = (id: string, tarih: Date, aciklama: string, tutar: number, vekaletMi: boolean) => {
    satirlar.push({ id: `alinan-${id}`, tarih, aciklama, borc: 0, alacak: tutar });
    if (vekaletMi) {
      satirlar.push({
        id: `vekalet-${id}`,
        tarih,
        aciklama: "Akdi vekalet ücreti (büro gelirine mahsup)",
        borc: tutar,
        alacak: 0,
      });
    }
  };
  for (const t of tasnifler) {
    alinanEkle(
      t.id,
      t.paraTrafigi.tarih,
      `Müvekkilden alınan — ${t.paraTrafigi.tip.etiket} (${t.cariKod.etiket})`,
      Number(t.tutar),
      t.cariKod.kod === AKDI_VEKALET_KODU,
    );
  }
  for (const d of dagitimlar) {
    if (!DAGITIM_AMACLARI.includes(d.kullanimAmaci.kod)) continue;
    alinanEkle(
      d.id,
      d.paraTrafigi.tarih,
      `Müvekkilden alınan — ${d.paraTrafigi.tip.etiket} (${d.kullanimAmaci.etiket})`,
      Number(d.tutar),
      d.kullanimAmaci.kod === "vekalet_ucreti_odeme",
    );
  }
  for (const a of gelenler) {
    satirlar.push({
      id: `gelen-${a.id}`,
      tarih: a.tarih,
      aciklama: `Avans aktarımı: ${dosyaKisaNo(a.kaynakDosya)} dosyasından — ${a.aciklama}`,
      borc: 0,
      alacak: Number(a.tutar),
      silme: { tip: "avansAktarimi", id: a.id },
    });
  }
  for (const a of gidenler) {
    satirlar.push({
      id: `giden-${a.id}`,
      tarih: a.tarih,
      aciklama: `Avans aktarımı: ${dosyaKisaNo(a.hedefDosya)} dosyasına — ${a.aciklama}`,
      borc: Number(a.tutar),
      alacak: 0,
      silme: { tip: "avansAktarimi", id: a.id },
    });
  }
  for (const m of masraflar) {
    satirlar.push({
      id: `masraf-${m.id}`,
      tarih: m.tarih,
      aciklama: `${m.tur.etiket} — ${m.aciklama}`,
      borc: Number(m.tutar),
      alacak: 0,
      silme: { tip: "masraf", id: m.id },
      duzenleHref: `/kokpit/dava-dosyalari/${dosyaId}/masraflar/${m.id}/duzenle`,
    });
  }
  return siraliSatirlar(satirlar);
}

export async function adliyeDefteri(dosyaId: string): Promise<DefterSatiri[]> {
  const hareketler = await prisma.adliBirimHareketi.findMany({ where: { dosyaId } });
  return siraliSatirlar(
    hareketler.map((h) => ({
      id: h.id,
      tarih: h.tarih,
      aciklama: h.aciklama,
      // ODEME: buro -> adli birim (borc); TAHSILAT/iade: adli birim -> buro (alacak).
      borc: h.yon === "ODEME" ? Number(h.tutar) : 0,
      alacak: h.yon === "TAHSILAT" ? Number(h.tutar) : 0,
      silme: { tip: "adliBirim" as const, id: h.id },
    })),
  );
}

export async function borcluDefteri(dosyaId: string): Promise<DefterSatiri[]> {
  const [alacaklar, masraflar] = await Promise.all([
    prisma.karsiTarafAlacagi.findMany({ where: { dosyaId } }),
    prisma.dosyaMasrafi.findMany({ where: { dosyaId, yansitmaHedefi: "BORCLU" }, include: { tur: true } }),
  ]);
  const satirlar: DefterSatiri[] = [];
  for (const a of alacaklar) {
    satirlar.push({
      id: `alacak-${a.id}`,
      tarih: a.olusturmaTarihi,
      aciklama: a.aciklama,
      borc: Number(a.tutar),
      alacak: 0,
      silme: { tip: "karsiTarafAlacagi", id: a.id },
      tahsilDegistir: { id: a.id, tahsilEdildiMi: a.tahsilEdildiMi },
    });
    if (a.tahsilEdildiMi) {
      satirlar.push({
        id: `tahsil-${a.id}`,
        tarih: a.tahsilTarihi ?? a.olusturmaTarihi,
        aciklama: `Tahsil edildi — ${a.aciklama}`,
        borc: 0,
        alacak: Number(a.tutar),
      });
    }
  }
  for (const m of masraflar) {
    satirlar.push({
      id: `masraf-${m.id}`,
      tarih: m.tarih,
      aciklama: `Borçluya yansıtılan masraf: ${m.tur.etiket} — ${m.aciklama}`,
      borc: Number(m.tutar),
      alacak: 0,
      silme: { tip: "masraf", id: m.id },
      duzenleHref: `/kokpit/dava-dosyalari/${dosyaId}/masraflar/${m.id}/duzenle`,
    });
  }
  return siraliSatirlar(satirlar);
}

function siraliSatirlar(satirlar: DefterSatiri[]): DefterSatiri[] {
  return [...satirlar].sort((a, b) => a.tarih.getTime() - b.tarih.getTime());
}
