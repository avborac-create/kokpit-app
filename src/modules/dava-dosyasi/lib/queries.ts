import type { Prisma } from "@prisma/client";
import { prisma } from "@/core/db/prisma";

export type DavaDosyasiFiltre = {
  arama?: string;
  durumKod?: string;
  musteriId?: string;
};

// Arama kutusu: bosluklarla ayrilan her sozcuk (AND) listedeki herhangi bir
// sutunda gecmelidir - ör. "saray 2026" = Saray muvekkilinin 2026 dosyalari.
// "KP-0014" ya da "14" Kokpit No'ya da eslesir. Turkce I/İ farki icin sozcuk
// hem yazildigi hem tr-buyuk/kucuk haliyle aranir.
function aramaKosulu(arama?: string): Prisma.DavaDosyasiWhereInput {
  const sozcukler = (arama ?? "").trim().split(/\s+/).filter(Boolean);
  if (sozcukler.length === 0) return {};
  return {
    AND: sozcukler.map((sozcuk) => {
      const varyantlar = [
        ...new Set([sozcuk, sozcuk.toLocaleUpperCase("tr"), sozcuk.toLocaleLowerCase("tr")]),
      ];
      const kayitNoMatch = /^(?:kp-?)?0*(\d{1,9})$/i.exec(sozcuk);
      const metin = (alan: (v: string) => Prisma.DavaDosyasiWhereInput): Prisma.DavaDosyasiWhereInput[] =>
        varyantlar.map(alan);
      const icerir = { contains: "", mode: "insensitive" as const };
      return {
        OR: [
          ...metin((v) => ({ konu: { ...icerir, contains: v } })),
          ...metin((v) => ({ dosyaNo: { ...icerir, contains: v } })),
          ...metin((v) => ({ buroNo: { ...icerir, contains: v } })),
          ...metin((v) => ({ birimAdi: { ...icerir, contains: v } })),
          ...metin((v) => ({ durum: { etiket: { ...icerir, contains: v } } })),
          ...metin((v) => ({ tur: { etiket: { ...icerir, contains: v } } })),
          ...metin((v) => ({ sorumluAvukat: { adSoyad: { ...icerir, contains: v } } })),
          ...metin((v) => ({
            muvekkiller: { some: { musteri: { adSoyadUnvan: { ...icerir, contains: v } } } },
          })),
          ...metin((v) => ({
            karsiTaraflar: { some: { karsiTaraf: { ad: { ...icerir, contains: v } } } },
          })),
          ...(kayitNoMatch ? [{ kayitNo: Number(kayitNoMatch[1]) }] : []),
        ],
      };
    }),
  };
}

export async function davaDosyalariniListele(filtre: DavaDosyasiFiltre = {}) {
  return prisma.davaDosyasi.findMany({
    where: {
      ...aramaKosulu(filtre.arama),
      ...(filtre.durumKod ? { durum: { kod: filtre.durumKod } } : {}),
      ...(filtre.musteriId ? { muvekkiller: { some: { musteriId: filtre.musteriId } } } : {}),
    },
    // Liste ekrani (bkz. dava-dosyalari/page.tsx) hukukiIliskiTuru ve
    // uyusmazlikGrubu'nu gostermez - gereksiz gidis-donusu onlemek icin
    // burada cekilmez (detay sayfasi icin bkz. davaDosyasiGetir).
    include: {
      durum: true,
      tur: true,
      icraAltTuru: true,
      yargiKolu: true,
      sorumluAvukat: true,
      karsiTaraflar: { include: { karsiTaraf: true } },
      muvekkiller: { include: { musteri: true } },
    },
    orderBy: { olusturmaTarihi: "desc" },
  });
}

export async function davaDosyasiGetir(id: string) {
  return prisma.davaDosyasi.findUnique({
    where: { id },
    include: {
      durum: true,
      tur: true,
      icraAltTuru: true,
      yargiKolu: true,
      hukukiIliskiTuru: true,
      davaTuru: true,
      sorumluAvukat: true,
      karsiTaraflar: { include: { karsiTaraf: true } },
      uyusmazlikGrubu: true,
      bagliOlduguDosya: true,
      baglananDosyalar: true,
      muvekkiller: { include: { musteri: true } },
      paraTrafigiKayitlari: {
        include: {
          paraTrafigi: {
            include: { tip: true, durum: true, kaynak: true, musteri: true },
          },
        },
        orderBy: { paraTrafigi: { tarih: "desc" } },
      },
      masraflar: {
        include: { cariKod: true, tur: true },
        orderBy: { tarih: "desc" },
      },
      karsiTarafAlacaklari: {
        orderBy: { olusturmaTarihi: "desc" },
      },
      paraTrafigiDagitimlari: {
        include: { kullanimAmaci: true, paraTrafigi: true },
        orderBy: { olusturmaTarihi: "desc" },
      },
      hukukiMudahaleler: {
        include: { mudahaleTuru: true, oncelik: true, sorumluAvukat: true },
        orderBy: [{ durum: "asc" }, { sonTarih: "asc" }, { olusturmaTarihi: "desc" }],
      },
      finansHareketleri: {
        orderBy: { tarih: "desc" },
      },
      adliBirimHareketleri: {
        orderBy: { tarih: "desc" },
      },
    },
  });
}

export type BagliDosyaAday = { id: string; dosyaNo: string | null; konu: string; kayitNo: number };

// "Bağlantılı Dosya Seçimi" combobox'ı icin hafif arama - davaDosyalariniListele'nin
// tersine derin include YAPMAZ, sadece secim listesinde gosterilecek 3 alani
// (select) ceker ve sonucu kucuk bir sayiyla sinirlar (cok fazla dosya olsa
// bile combobox'a agir bir sorgu yuklenmesin diye). Butun burodaki dosyalarda
// arar - tek bir musteriyle sinirli DEGILDIR (bkz. musterininDosyalari).
export async function bagliDosyaAdaylariniAra(arama: string, haricTutulanId?: string): Promise<BagliDosyaAday[]> {
  const temizlenmisArama = arama.trim();
  return prisma.davaDosyasi.findMany({
    where: {
      ...(haricTutulanId ? { id: { not: haricTutulanId } } : {}),
      ...(temizlenmisArama
        ? {
            OR: [
              { konu: { contains: temizlenmisArama, mode: "insensitive" } },
              { dosyaNo: { contains: temizlenmisArama, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, dosyaNo: true, konu: true, kayitNo: true },
    orderBy: { olusturmaTarihi: "desc" },
    take: 20,
  });
}

export async function musterininDosyalari(musteriId: string) {
  return prisma.davaDosyasi.findMany({
    where: { muvekkiller: { some: { musteriId } } },
    include: { durum: true, tur: true, karsiTaraflar: { include: { karsiTaraf: true } } },
    orderBy: { olusturmaTarihi: "desc" },
  });
}

export async function uyusmazlikGruplariniListele(musteriIdleri: string[]) {
  if (musteriIdleri.length === 0) return [];
  return prisma.uyusmazlikGrubu.findMany({
    where: { musteriId: { in: musteriIdleri } },
    orderBy: { ad: "asc" },
  });
}

// "Muvekkilden Para Geldi" kaydinin dagitim satirlarindaki kullanim
// amacinin hangi cari koda karsilik geldigi - bkz. ParaTrafigiDagitimi.
// gecmis_masraf/dosya_avansi ikisi de "Masraf Hesabi"nda toplanir (aradaki
// fark artik cari kodda degil, kullanim amaci etiketinde gorunur).
const KULLANIM_AMACI_KOD_ILE_ESLESEN_CARI_KOD_KODU: Record<string, string> = {
  gecmis_masraf: "masraf_hesabi",
  dosya_avansi: "masraf_hesabi",
  vekalet_ucreti_odeme: "akdi_vekalet_hesabi",
};

// Cari kod bazinda Borc/Alacak/Bakiye ozeti (paylasilan cekirdek): tasnif =
// paranin GELIRKEN bu koda ayrilan kismi (ParaTrafigiTasnif VEYA - dagitimi
// olan kayitlar icin - ParaTrafigiDagitimi); masraf = o koddan SONRADAN
// yapilan harcamalarin toplami (DosyaMasrafi). Bakiye = tasnif - masraf:
// pozitifse o kodda henuz kullanilmamis/kalan bir tutar var (bkz.
// ARCHITECTURE.md). `tasnifWhere`/`masrafWhere`/`dagitimWhere` cagiran
// tarafindan (tek dosya, butun bir kume ya da musteri) verilir.
//
// ONEMLI: bir MusteriParaTrafigi kaydinin EN AZ 1 dagitim satiri varsa,
// o kaydin ESKI tasnifi hesaba katilmaz (cagiran taraf tasnifWhere'ine
// `paraTrafigi: { dagitimlar: { none: {} } }` sartini ekler) - aksi halde
// ayni para iki kere sayilirdi. Dagitimi OLMAYAN (gecmis kayitlar + hala
// aktif tekil-kume tipleriyle girilenler) kayitlarda tasnif eskisi gibi
// okunur - geriye donuk uyumluluk.
async function cariHesapOzetiHesapla(
  tasnifWhere: Parameters<typeof prisma.paraTrafigiTasnif.groupBy>[0]["where"],
  masrafWhere: Parameters<typeof prisma.dosyaMasrafi.groupBy>[0]["where"],
  dagitimWhere: Parameters<typeof prisma.paraTrafigiDagitimi.groupBy>[0]["where"],
  // Avans aktarimlari icin dosya kapsami: kapsamdaki bir dosyadan CIKAN
  // aktarim bakiyeyi dusurur, kapsama GIREN artirir. Kapsam hem kaynagi hem
  // hedefi iceriyorsa (musteri/kume seviyesi) ikisi birbirini goturur.
  aktarimKapsami: Prisma.DavaDosyasiWhereInput,
) {
  const [cariKodlar, tasnifToplamlari, masrafToplamlari, dagitimToplamlari, gelenAktarimlar, gidenAktarimlar] =
    await Promise.all([
    prisma.secenekDegeri.findMany({
      where: { liste: { anahtar: "cari_kod" } },
      orderBy: { siraNo: "asc" },
    }),
    prisma.paraTrafigiTasnif.groupBy({
      by: ["cariKodId"],
      where: tasnifWhere,
      _sum: { tutar: true },
    }),
    // Sadece MUVEKKILE yansitilan masraflar muvekkil carisinden duser;
    // Buro/Borclu'ya yansitilanlar bu hesaba girmez.
    prisma.dosyaMasrafi.groupBy({
      by: ["cariKodId"],
      where: { AND: [masrafWhere ?? {}, { yansitmaHedefi: "MUVEKKIL" }] },
      _sum: { tutar: true },
    }),
    prisma.paraTrafigiDagitimi.groupBy({
      by: ["kullanimAmaciId"],
      where: dagitimWhere,
      _sum: { tutar: true },
    }),
    prisma.dosyaAvansAktarimi.groupBy({
      by: ["cariKodId"],
      where: { hedefDosya: aktarimKapsami },
      _sum: { tutar: true },
    }),
    prisma.dosyaAvansAktarimi.groupBy({
      by: ["cariKodId"],
      where: { kaynakDosya: aktarimKapsami },
      _sum: { tutar: true },
    }),
  ]);

  const tasnifMap = new Map(tasnifToplamlari.map((t) => [t.cariKodId, Number(t._sum.tutar ?? 0)]));
  const masrafMap = new Map(masrafToplamlari.map((m) => [m.cariKodId, Number(m._sum.tutar ?? 0)]));
  const gelenMap = new Map(gelenAktarimlar.map((a) => [a.cariKodId, Number(a._sum.tutar ?? 0)]));
  const gidenMap = new Map(gidenAktarimlar.map((a) => [a.cariKodId, Number(a._sum.tutar ?? 0)]));

  if (dagitimToplamlari.length > 0) {
    const kullanimAmaclari = await prisma.secenekDegeri.findMany({
      where: { id: { in: dagitimToplamlari.map((d) => d.kullanimAmaciId) } },
    });
    const amaciKoduMap = new Map(kullanimAmaclari.map((k) => [k.id, k.kod]));
    for (const dagitim of dagitimToplamlari) {
      const amaciKodu = amaciKoduMap.get(dagitim.kullanimAmaciId);
      const cariKodKodu = amaciKodu ? KULLANIM_AMACI_KOD_ILE_ESLESEN_CARI_KOD_KODU[amaciKodu] : undefined;
      const cariKod = cariKodKodu ? cariKodlar.find((k) => k.kod === cariKodKodu) : undefined;
      if (!cariKod) continue;
      tasnifMap.set(cariKod.id, (tasnifMap.get(cariKod.id) ?? 0) + Number(dagitim._sum.tutar ?? 0));
    }
  }

  return cariKodlar
    .map((kod) => {
      const tasnifToplami = tasnifMap.get(kod.id) ?? 0;
      const masrafToplami = masrafMap.get(kod.id) ?? 0;
      // Musteri/kume seviyesinde giris ve cikis ayni kapsamda kalir; net
      // aktarim 0'dir ve satirda gosterilmez (bkz. filtre).
      const gelenAktarim = gelenMap.get(kod.id) ?? 0;
      const gidenAktarim = gidenMap.get(kod.id) ?? 0;
      const netAktarim = gelenAktarim - gidenAktarim;
      return {
        cariKod: kod,
        tasnifToplami,
        masrafToplami,
        gelenAktarim: netAktarim > 0 ? netAktarim : 0,
        gidenAktarim: netAktarim < 0 ? -netAktarim : 0,
        bakiye: tasnifToplami + netAktarim - masrafToplami,
      };
    })
    .filter(
      (satir) =>
        satir.tasnifToplami !== 0 ||
        satir.masrafToplami !== 0 ||
        satir.gelenAktarim !== 0 ||
        satir.gidenAktarim !== 0,
    );
}

export async function dosyaCariHesapOzeti(dosyaId: string) {
  return cariHesapOzetiHesapla(
    {
      paraTrafigi: {
        durum: { kod: "tahsil_edildi" },
        dosyalar: { some: { dosyaId } },
        dagitimlar: { none: {} },
      },
    },
    { dosyaId },
    { dosyaId, paraTrafigi: { durum: { kod: "tahsil_edildi" } } },
    { id: dosyaId },
  );
}

// Uyuşmazlık grubu (Dosya Kümesi) seviyesinde ozet: mustekilden gelen bir
// masraf avansi genelde TEK bir dosyaya degil, butun ticari iliskiye (ör.
// "Asya Park Ticareti") aittir - grup icindeki HERHANGI bir dosyaya
// baglanan odeme/masraf, grubun ortak cari hesabinin bir parcasidir. Bu
// yuzden müvekkile/büroya asil gosterilecek Borc/Alacak/Bakiye bu
// seviyededir; dosyaCariHesapOzeti sadece grup icinde "hangi dosyaya ne
// kadar gitti" diye bakmak icin bir alt-kirilimdir.
export async function uyusmazlikGrubuCariHesapOzeti(uyusmazlikGrubuId: string) {
  return cariHesapOzetiHesapla(
    {
      paraTrafigi: {
        durum: { kod: "tahsil_edildi" },
        dagitimlar: { none: {} },
        // Bir odeme ya bir/birden fazla dosya uzerinden (dosyalar iliskisi)
        // ya da hicbir dosya secilmeden dogrudan gruba (uyusmazlikGrubuId)
        // baglanmis olabilir - ör. henuz dosyasi acilmamis bir haciz
        // islemi icin istenen bir avans. Ikisi de grubun ortak cari
        // hesabinin bir parcasidir.
        OR: [
          { dosyalar: { some: { dosya: { uyusmazlikGrubuId } } } },
          { uyusmazlikGrubuId },
        ],
      },
    },
    { dosya: { uyusmazlikGrubuId } },
    { uyusmazlikGrubuId, paraTrafigi: { durum: { kod: "tahsil_edildi" } } },
    { uyusmazlikGrubuId },
  );
}

// Tek bir dosyanin "Muvekkil Bakiye Avans Miktari" - Akdi Vekalet Hesabi
// haric tum cari kodlardaki (tasnif + gelen aktarim - masraf - giden aktarim)
// net toplam. Negatifse muvekkilin dosyada borcu vardir.
export async function dosyaAvansBakiyesi(dosyaId: string): Promise<number> {
  const ozet = await dosyaCariHesapOzeti(dosyaId);
  return netAvansBakiyesi(ozet);
}

const NET_HESABA_DAHIL_OLMAYAN_CARI_KODLAR = ["akdi_vekalet_hesabi"];

export function netAvansBakiyesi(ozet: Awaited<ReturnType<typeof dosyaCariHesapOzeti>>): number {
  return ozet
    .filter((satir) => !NET_HESABA_DAHIL_OLMAYAN_CARI_KODLAR.includes(satir.cariKod.kod))
    .reduce((toplam, satir) => toplam + satir.bakiye, 0);
}

// Musterinin her dosyasi icin avans bakiyesi (Musteri Ekonomisi tablosu).
export async function musteriDosyaAvansBakiyeleri(musteriId: string) {
  const dosyalar = await prisma.davaDosyasi.findMany({
    where: { muvekkiller: { some: { musteriId } } },
    select: { id: true, kayitNo: true, buroNo: true, dosyaNo: true, birimAdi: true, konu: true },
    orderBy: { olusturmaTarihi: "asc" },
  });
  return Promise.all(
    dosyalar.map(async (dosya) => ({ ...dosya, bakiye: await dosyaAvansBakiyesi(dosya.id) })),
  );
}

// Aktarim formu icin: kaynak dosyayla AYNI muvekkile bagli diger dosyalar
// (hedef adaylari) ve bunlarin avans bakiyeleri.
export async function aktarimHedefAdaylari(dosyaId: string) {
  const dosya = await prisma.davaDosyasi.findUnique({
    where: { id: dosyaId },
    select: { muvekkiller: { select: { musteriId: true } } },
  });
  if (!dosya) return [];
  const adaylar = await prisma.davaDosyasi.findMany({
    where: {
      id: { not: dosyaId },
      muvekkiller: { some: { musteriId: { in: dosya.muvekkiller.map((m) => m.musteriId) } } },
    },
    select: { id: true, kayitNo: true, buroNo: true, dosyaNo: true, birimAdi: true },
    orderBy: { olusturmaTarihi: "asc" },
  });
  return Promise.all(adaylar.map(async (a) => ({ ...a, bakiye: await dosyaAvansBakiyesi(a.id) })));
}

export async function dosyaAvansAktarimlari(dosyaId: string) {
  return prisma.dosyaAvansAktarimi.findMany({
    where: { OR: [{ kaynakDosyaId: dosyaId }, { hedefDosyaId: dosyaId }] },
    include: { kaynakDosya: true, hedefDosya: true, cariKod: true },
    orderBy: { tarih: "desc" },
  });
}

export async function dosyaMasrafiGetir(masrafId: string) {
  return prisma.dosyaMasrafi.findUnique({ where: { id: masrafId } });
}

// Musteri seviyesinde ozet: musterinin TUM gruplarina/dosyalarina (ve
// hicbir dosya/gruba baglanmadan dogrudan musteriye islenmis kayitlara)
// yayilan toplam Borc/Alacak/Bakiye. Musteri Finans/Cari Hesap sayfasinda
// -once dosya/grup ayrimina bakmadan- "bu musteriden toplam ne kadar
// alindi, adina ne kadar harcandi" sorusuna cevap verir.
export async function musteriCariHesapOzeti(musteriId: string) {
  return cariHesapOzetiHesapla(
    {
      paraTrafigi: {
        musteriId,
        durum: { kod: "tahsil_edildi" },
        dagitimlar: { none: {} },
      },
    },
    { dosya: { muvekkiller: { some: { musteriId } } } },
    { paraTrafigi: { musteriId, durum: { kod: "tahsil_edildi" } } },
    { muvekkiller: { some: { musteriId } } },
  );
}

// "Musteriden Para Geldi" olarak girilmis ama henuz (hic ya da tamamen)
// bir Dosya Kumesine/kaleme dagitilmamis tutar - bkz. ParaTrafigiDagitimi.
// Saklanmaz, her seferinde hesaplanir (header.tutar - Σ dagitim.tutar,
// sadece pozitif kalanlar toplanir).
export async function dagitilmamisParaToplami(musteriId: string) {
  const kayitlar = await prisma.musteriParaTrafigi.findMany({
    where: { musteriId, tip: { kod: "muvekkilden_para_geldi" }, durum: { kod: "tahsil_edildi" } },
    select: { tutar: true, dagitimlar: { select: { tutar: true } } },
  });

  return kayitlar.reduce((toplam, kayit) => {
    const dagitilan = kayit.dagitimlar.reduce((t, d) => t + Number(d.tutar), 0);
    const kalan = Number(kayit.tutar) - dagitilan;
    return toplam + (kalan > 0 ? kalan : 0);
  }, 0);
}

export type DokumSatiri = {
  id: string;
  tarih: Date;
  kaynak: "masraf" | "dagitim";
  tutar: number;
  dosyaId: string | null;
  dosyaKonu: string | null;
  aciklama: string;
};

// Kume genelindeki TUM dosyalarin masraf + dagitim kalemlerini TEK bir
// kronolojik dokumde birlestirir (kaynak alaniyla ayirt edilir) - bkz.
// plan "Tum Dosyalarin Dokumu". Sadece dosyaya bagli DosyaMasrafi kayitlari
// ve kumeye ait (dosyali ya da dosyasiz) ParaTrafigiDagitimi kayitlari
// kapsanir; ayni kalemin iki kere gorunmesi soz konusu degil (farkli
// tablolar, farkli anlamlar - masraf = harcanan, dagitim = tahsis edilen).
export async function kumeDokumSatirlari(uyusmazlikGrubuId: string): Promise<DokumSatiri[]> {
  const [masraflar, dagitimlar] = await Promise.all([
    prisma.dosyaMasrafi.findMany({
      where: { dosya: { uyusmazlikGrubuId } },
      include: { dosya: true, tur: true },
      orderBy: { tarih: "desc" },
    }),
    prisma.paraTrafigiDagitimi.findMany({
      where: { uyusmazlikGrubuId },
      include: { dosya: true, kullanimAmaci: true },
      orderBy: { olusturmaTarihi: "desc" },
    }),
  ]);

  const satirlar: DokumSatiri[] = [
    ...masraflar.map((m) => ({
      id: `masraf-${m.id}`,
      tarih: m.tarih,
      kaynak: "masraf" as const,
      tutar: Number(m.tutar),
      dosyaId: m.dosyaId,
      dosyaKonu: m.dosya.konu,
      aciklama: `${m.tur.etiket} — ${m.aciklama}`,
    })),
    ...dagitimlar.map((d) => ({
      id: `dagitim-${d.id}`,
      tarih: d.olusturmaTarihi,
      kaynak: "dagitim" as const,
      tutar: Number(d.tutar),
      dosyaId: d.dosyaId,
      dosyaKonu: d.dosya?.konu ?? null,
      aciklama: d.kullanimAmaci.etiket,
    })),
  ];

  return satirlar.sort((a, b) => b.tarih.getTime() - a.tarih.getTime());
}

export async function uyusmazlikGrubuGetir(id: string) {
  return prisma.uyusmazlikGrubu.findUnique({
    where: { id },
    include: {
      musteri: true,
      durum: true,
      karsiTaraflar: { include: { karsiTaraf: true } },
      dosyalar: {
        include: { durum: true, karsiTaraflar: { include: { karsiTaraf: true } }, bagliOlduguDosya: true },
        orderBy: { olusturmaTarihi: "asc" },
      },
    },
  });
}

// Ana "Dosyalar" sayfasi artik once TUM kumeleri listeler (bkz.
// ARCHITECTURE.md "Dosya Kumesi") - musteri bazinda degil, buronun
// tum kumeleri.
export async function uyusmazlikGruplariniTumListele(filtre: { arama?: string } = {}) {
  return prisma.uyusmazlikGrubu.findMany({
    where: filtre.arama
      ? {
          OR: [
            { ad: { contains: filtre.arama, mode: "insensitive" } },
            { musteri: { adSoyadUnvan: { contains: filtre.arama, mode: "insensitive" } } },
          ],
        }
      : {},
    include: {
      musteri: true,
      durum: true,
      _count: { select: { dosyalar: true } },
    },
    orderBy: { olusturmaTarihi: "desc" },
  });
}

// ============================================================
// Dava Dosyasi Yasam Dongusu: Avukat Sapkasi + Karar Sonrasi Takip
// (bkz. ARCHITECTURE.md) - ikisi de AYNI DavaDosyasi kayitlarini farkli
// where kosullariyla okur, ayri bir model/tablo YOK.
// ============================================================

export type AvukatSapkasiFiltre = {
  arama?: string;
  sorumluAvukatId?: string;
  oncelikKod?: string;
  // varsayilan: sadece acik (Beklemede/Devam Ediyor) isler - "Tamamlandi"/
  // "Iptal Edildi" gecmis kayitlar olarak listede kalabalik yaratmasin.
  tumDurumlar?: boolean;
};

// Avukat Sapkasi ekrani: TUM dosyalardaki HukukiMudahale kayitlarinin
// genel calisma listesi - "Bu dosyada ne yapmaliyim?" sorusuna firma
// genelinde cevap verir.
export async function acikHukukiMudahaleleriListele(filtre: AvukatSapkasiFiltre = {}) {
  return prisma.hukukiMudahale.findMany({
    where: {
      ...(filtre.tumDurumlar ? {} : { durum: { in: ["BEKLEMEDE", "DEVAM_EDIYOR"] } }),
      ...(filtre.sorumluAvukatId ? { sorumluAvukatId: filtre.sorumluAvukatId } : {}),
      ...(filtre.oncelikKod ? { oncelik: { kod: filtre.oncelikKod } } : {}),
      ...(filtre.arama
        ? {
            OR: [
              { baslik: { contains: filtre.arama, mode: "insensitive" } },
              { davaDosyasi: { konu: { contains: filtre.arama, mode: "insensitive" } } },
              { davaDosyasi: { dosyaNo: { contains: filtre.arama, mode: "insensitive" } } },
              {
                davaDosyasi: {
                  muvekkiller: { some: { musteri: { adSoyadUnvan: { contains: filtre.arama, mode: "insensitive" } } } },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      davaDosyasi: { include: { muvekkiller: { include: { musteri: true } } } },
      mudahaleTuru: true,
      oncelik: true,
      sorumluAvukat: true,
    },
    orderBy: [{ sonTarih: { sort: "asc", nulls: "last" } }, { olusturmaTarihi: "desc" }],
  });
}

export type KararSonrasiTakipFiltre = {
  arama?: string;
  sorumluAvukatId?: string;
  // varsayilan: KESINLESTI olanlar aktif takip listesinde kalabalik
  // yaratmasin diye disarida - "Kesinlesmisler dahil" ile acilabilir.
  tumEvreler?: boolean;
};

// Karar Sonrasi Takip ekrani: dosyaEvresi ATANMIS (bos olmayan) tum
// dosyalarin listesi - "Bu dosya nerede, ne bekleniyor?" sorusuna cevap
// verir. Evre ataması yapılmamış dosyalar burada BILEREK gorunmez (bkz.
// ARCHITECTURE.md "Mevcut Veriyle Uyum").
export async function kararSonrasiTakipListele(filtre: KararSonrasiTakipFiltre = {}) {
  return prisma.davaDosyasi.findMany({
    where: {
      dosyaEvresi: { not: null },
      ...(filtre.tumEvreler ? {} : { NOT: { dosyaEvresi: "KESINLESTI" } }),
      ...(filtre.sorumluAvukatId ? { sorumluAvukatId: filtre.sorumluAvukatId } : {}),
      ...(filtre.arama
        ? {
            OR: [
              { konu: { contains: filtre.arama, mode: "insensitive" } },
              { dosyaNo: { contains: filtre.arama, mode: "insensitive" } },
              { muvekkiller: { some: { musteri: { adSoyadUnvan: { contains: filtre.arama, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    include: {
      muvekkiller: { include: { musteri: true } },
      sorumluAvukat: true,
    },
    orderBy: [{ sonrakiKontrolTarihi: { sort: "asc", nulls: "last" } }],
  });
}
