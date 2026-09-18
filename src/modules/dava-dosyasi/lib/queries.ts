import { prisma } from "@/core/db/prisma";

export type DavaDosyasiFiltre = {
  arama?: string;
  durumKod?: string;
  musteriId?: string;
};

export async function davaDosyalariniListele(filtre: DavaDosyasiFiltre = {}) {
  return prisma.davaDosyasi.findMany({
    where: {
      ...(filtre.arama
        ? {
            // Hukuk Dosyalari listesindeki arama alanlari: Müvekkil Ünvanı,
            // Karşı Taraf, Konu, Birim Adı, Dosya Numarası (bkz. plan).
            OR: [
              { konu: { contains: filtre.arama, mode: "insensitive" } },
              { dosyaNo: { contains: filtre.arama, mode: "insensitive" } },
              { birimAdi: { contains: filtre.arama, mode: "insensitive" } },
              {
                muvekkiller: {
                  some: { musteri: { adSoyadUnvan: { contains: filtre.arama, mode: "insensitive" } } },
                },
              },
              {
                karsiTaraflar: {
                  some: { karsiTaraf: { ad: { contains: filtre.arama, mode: "insensitive" } } },
                },
              },
            ],
          }
        : {}),
      ...(filtre.durumKod ? { durum: { kod: filtre.durumKod } } : {}),
      ...(filtre.musteriId ? { muvekkiller: { some: { musteriId: filtre.musteriId } } } : {}),
    },
    include: {
      durum: true,
      tur: true,
      hukukiIliskiTuru: true,
      sorumluAvukat: true,
      karsiTaraflar: { include: { karsiTaraf: true } },
      uyusmazlikGrubu: true,
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
      hukukiIliskiTuru: true,
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
    },
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
) {
  const [cariKodlar, tasnifToplamlari, masrafToplamlari, dagitimToplamlari] = await Promise.all([
    prisma.secenekDegeri.findMany({
      where: { liste: { anahtar: "cari_kod" } },
      orderBy: { siraNo: "asc" },
    }),
    prisma.paraTrafigiTasnif.groupBy({
      by: ["cariKodId"],
      where: tasnifWhere,
      _sum: { tutar: true },
    }),
    prisma.dosyaMasrafi.groupBy({
      by: ["cariKodId"],
      where: masrafWhere,
      _sum: { tutar: true },
    }),
    prisma.paraTrafigiDagitimi.groupBy({
      by: ["kullanimAmaciId"],
      where: dagitimWhere,
      _sum: { tutar: true },
    }),
  ]);

  const tasnifMap = new Map(tasnifToplamlari.map((t) => [t.cariKodId, Number(t._sum.tutar ?? 0)]));
  const masrafMap = new Map(masrafToplamlari.map((m) => [m.cariKodId, Number(m._sum.tutar ?? 0)]));

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
      return {
        cariKod: kod,
        tasnifToplami,
        masrafToplami,
        bakiye: tasnifToplami - masrafToplami,
      };
    })
    .filter((satir) => satir.tasnifToplami !== 0 || satir.masrafToplami !== 0);
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
  );
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
