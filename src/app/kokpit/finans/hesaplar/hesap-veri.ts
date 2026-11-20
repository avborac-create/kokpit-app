import { prisma } from "@/core/db/prisma";
import { kisiselHesapMi } from "@/core/hesap/hesaplar";

export type HesapHareketi = { id: string; tarih: Date; yon: "GIRIS" | "CIKIS"; tutar: number; kaynak: string; aciklama: string; hesapBelirsiz: boolean };

const yuvarla = (n: number) => Math.round(n * 100) / 100;

// Tum para hareketlerini (masraf, teyitli gelen odeme, para havuzu, nakit kasa) hesaplara dagitir.
// Hesabi bos kayit: kasa -> nakit kasa, digerleri -> varsayilan buro hesabi (hesapBelirsiz=true ile isaretlenir).
export async function hesapHareketleri() {
  const [hesaplar, masraflar, gelenler, havuzlar, kasa] = await Promise.all([
    prisma.paraHesabi.findMany({ orderBy: [{ sira: "asc" }, { ad: "asc" }], include: { mahsuplar: { orderBy: { tarih: "desc" } } } }),
    prisma.dosyaMasrafi.findMany({
      where: { OR: [{ durumId: null }, { durum: { kod: { not: "iptal_edildi" } } }] },
      select: { id: true, tarih: true, tutar: true, aciklama: true, hesapId: true },
    }),
    prisma.gelenOdemeKaydi.findMany({ where: { durum: "TEYIT_EDILDI" }, select: { id: true, tarih: true, tutar: true, odeyenAdi: true, aciklama: true, hesapId: true, havuzGirisiId: true } }),
    prisma.paraHavuzuGirisi.findMany({ select: { id: true, tarih: true, tutar: true, kaynak: true, aciklama: true, hesapId: true } }),
    prisma.kasaHareketi.findMany({ include: { kod: true } }),
  ]);
  const varsayilan = hesaplar.find((h) => h.varsayilanMi)?.id ?? hesaplar[0]?.id ?? "";
  const nakit = hesaplar.find((h) => h.tur === "NAKIT")?.id ?? varsayilan;
  const gelenHavuzlari = new Set(gelenler.map((g) => g.havuzGirisiId).filter(Boolean));

  const harita = new Map<string, HesapHareketi[]>();
  const ekle = (hesapId: string | null, yedek: string, h: Omit<HesapHareketi, "hesapBelirsiz">, belirsizSayilsin = true) => {
    const id = hesapId ?? yedek;
    const liste = harita.get(id) ?? [];
    liste.push({ ...h, hesapBelirsiz: belirsizSayilsin && !hesapId });
    harita.set(id, liste);
  };
  for (const m of masraflar) ekle(m.hesapId, varsayilan, { id: "m:" + m.id, tarih: m.tarih, yon: "CIKIS", tutar: Number(m.tutar), kaynak: "Dosya masrafı", aciklama: m.aciklama });
  for (const g of gelenler) ekle(g.hesapId, varsayilan, { id: "g:" + g.id, tarih: g.tarih, yon: "GIRIS", tutar: Number(g.tutar), kaynak: "Gelen ödeme", aciklama: [g.odeyenAdi, g.aciklama].filter(Boolean).join(" · ") });
  for (const v of havuzlar) {
    if (gelenHavuzlari.has(v.id)) continue; // teyitli gelen odemeden olusan giris zaten sayildi
    ekle(v.hesapId, varsayilan, { id: "h:" + v.id, tarih: v.tarih, yon: "GIRIS", tutar: Number(v.tutar), kaynak: "Para havuzu girişi", aciklama: [v.kaynak, v.aciklama].filter(Boolean).join(" · ") });
  }
  // Kasa hareketleri dogasi geregi nakit kasadadir: "belirsiz" sayilmaz.
  for (const c of kasa) ekle(null, nakit, { id: "k:" + c.id, tarih: c.tarih, yon: c.yon, tutar: Number(c.tutar), kaynak: `Kasa: ${c.kod.ad}`, aciklama: c.aciklama ?? "" }, false);

  return hesaplar.map((h) => {
    const hareketler = (harita.get(h.id) ?? []).sort((a, b) => b.tarih.getTime() - a.tarih.getTime());
    const giris = yuvarla(hareketler.filter((x) => x.yon === "GIRIS").reduce((t, x) => t + x.tutar, 0));
    const cikis = yuvarla(hareketler.filter((x) => x.yon === "CIKIS").reduce((t, x) => t + x.tutar, 0));
    const gecerli = h.mahsuplar.filter((m) => !m.iptalZamani);
    const buroyaAktarilan = yuvarla(gecerli.filter((m) => m.yon === "BUROYA_AKTARILDI").reduce((t, m) => t + Number(m.tutar), 0));
    const sahibeOdenen = yuvarla(gecerli.filter((m) => m.yon === "SAHIBE_ODENDI").reduce((t, m) => t + Number(m.tutar), 0));
    // Kisisel hesapta: pozitif = hesap sahibi buroya borclu; negatif = buro hesap sahibine borclu.
    const sahipBorcu = kisiselHesapMi(h.tur) ? yuvarla(giris - cikis - buroyaAktarilan + sahibeOdenen) : 0;
    return { hesap: h, hareketler, giris, cikis, net: yuvarla(giris - cikis), buroyaAktarilan, sahibeOdenen, sahipBorcu, belirsiz: hareketler.filter((x) => x.hesapBelirsiz).length };
  });
}
