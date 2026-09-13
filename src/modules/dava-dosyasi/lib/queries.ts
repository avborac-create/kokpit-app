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
            OR: [
              { konu: { contains: filtre.arama, mode: "insensitive" } },
              { dosyaNo: { contains: filtre.arama, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filtre.durumKod ? { durum: { kod: filtre.durumKod } } : {}),
      ...(filtre.musteriId ? { muvekkiller: { some: { musteriId: filtre.musteriId } } } : {}),
    },
    include: {
      durum: true,
      sorumluAvukat: true,
      karsiTaraf: true,
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
      sorumluAvukat: true,
      karsiTaraf: true,
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
    },
  });
}

export async function musterininDosyalari(musteriId: string) {
  return prisma.davaDosyasi.findMany({
    where: { muvekkiller: { some: { musteriId } } },
    include: { durum: true, karsiTaraf: true },
    orderBy: { olusturmaTarihi: "desc" },
  });
}

export async function karsiTaraflariListele(musteriIdleri: string[]) {
  if (musteriIdleri.length === 0) return [];
  return prisma.karsiTaraf.findMany({
    where: { musteriId: { in: musteriIdleri } },
    orderBy: { ad: "asc" },
  });
}

export async function uyusmazlikGruplariniListele(musteriIdleri: string[]) {
  if (musteriIdleri.length === 0) return [];
  return prisma.uyusmazlikGrubu.findMany({
    where: { musteriId: { in: musteriIdleri } },
    orderBy: { ad: "asc" },
  });
}

// Cari kod bazinda Borc/Alacak/Bakiye ozeti (paylasilan cekirdek): tasnif =
// paranin GELIRKEN bu koda ayrilan kismi (ParaTrafigiTasnif); masraf = o
// koddan SONRADAN yapilan harcamalarin toplami (DosyaMasrafi). Bakiye =
// tasnif - masraf: pozitifse o kodda henuz kullanilmamis/kalan bir tutar
// var (bkz. ARCHITECTURE.md). `tasnifWhere`/`masrafWhere` cagiran tarafindan
// (tek dosya ya da butun bir uyusmazlik grubu) verilir.
async function cariHesapOzetiHesapla(
  tasnifWhere: Parameters<typeof prisma.paraTrafigiTasnif.groupBy>[0]["where"],
  masrafWhere: Parameters<typeof prisma.dosyaMasrafi.groupBy>[0]["where"],
) {
  const [cariKodlar, tasnifToplamlari, masrafToplamlari] = await Promise.all([
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
  ]);

  const tasnifMap = new Map(tasnifToplamlari.map((t) => [t.cariKodId, Number(t._sum.tutar ?? 0)]));
  const masrafMap = new Map(masrafToplamlari.map((m) => [m.cariKodId, Number(m._sum.tutar ?? 0)]));

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
      },
    },
    { dosyaId },
  );
}

// Uyuşmazlık grubu seviyesinde ozet: mustekilden gelen bir masraf avansi
// genelde TEK bir dosyaya degil, butun ticari iliskiye (ör. "Asya Park
// Ticareti") aittir - grup icindeki HERHANGI bir dosyaya baglanan
// odeme/masraf, grubun ortak cari hesabinin bir parcasidir. Bu yuzden
// müvekkile/büroya asil gosterilecek Borc/Alacak/Bakiye bu seviyededir;
// dosyaCariHesapOzeti sadece grup icinde "hangi dosyaya ne kadar gitti"
// diye bakmak icin bir alt-kirilimdir.
export async function uyusmazlikGrubuCariHesapOzeti(uyusmazlikGrubuId: string) {
  return cariHesapOzetiHesapla(
    {
      paraTrafigi: {
        durum: { kod: "tahsil_edildi" },
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
      },
    },
    { dosya: { muvekkiller: { some: { musteriId } } } },
  );
}

export async function uyusmazlikGrubuGetir(id: string) {
  return prisma.uyusmazlikGrubu.findUnique({
    where: { id },
    include: {
      musteri: true,
      dosyalar: {
        include: { durum: true, karsiTaraf: true, bagliOlduguDosya: true },
        orderBy: { olusturmaTarihi: "asc" },
      },
    },
  });
}
