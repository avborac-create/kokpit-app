"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";

function metinYaAlNull(formData: FormData, alan: string): string | null {
  const deger = String(formData.get(alan) ?? "").trim();
  return deger === "" ? null : deger;
}

function musteriIdleriniAl(formData: FormData): string[] {
  return formData.getAll("musteriIds").map(String).filter(Boolean);
}

// Karsi taraf secimini cozumler: "karsiTarafIds" (KarsiTarafEkleyici
// bilesenindeki, dosyaya zaten bagli olup kaldirilmamis kartlarin id'leri -
// bir icra takibi genelde cek/bono zincirindeki TUM muteselsil sorumlulara
// birden acilir, tek bir karsi tarafa degil) + "yeniKarsiTarafAdlari" (ayni
// bilesende "Ekle" ile birer birer eklenen YENI isimler, her biri gizli bir
// input olarak forma tasinir) - her yeni isim icin ayni musteri altinda
// zaten ayni isimde bir KarsiTaraf var mi diye bakilir (varsa o kullanilir,
// yoksa yeni olusturulur) - kullaniciya "var olan karsi taraflar" diye ayri
// bir liste hic gosterilmez, tek giris noktasi bu "yaz + Ekle" akisidir.
async function karsiTarafIdleriniCozumle(formData: FormData, musteriIdleri: string[]): Promise<string[]> {
  const secilenIdler = formData.getAll("karsiTarafIds").map(String).filter(Boolean);
  const yeniAdlar = formData
    .getAll("yeniKarsiTarafAdlari")
    .map(String)
    .map((ad) => ad.trim())
    .filter(Boolean);

  const yeniIdler: string[] = [];
  for (const ad of yeniAdlar) {
    // Ayni musteri altinda ayni isimde (buyuk/kucuk harf ve bosluk
    // duyarsiz) zaten bir karsi taraf varsa YENI kayit olusturmak yerine
    // onu kullan - aksi halde ayni "Mata Kauçuk"tan birden fazla, birbirine
    // bagli olmayan kayit birikir (bkz. GELISTIRME_KUTUSU.md gecmisi).
    const mevcut = await prisma.karsiTaraf.findFirst({
      where: { musteriId: musteriIdleri[0], ad: { equals: ad, mode: "insensitive" } },
    });
    const id = mevcut
      ? mevcut.id
      : (await prisma.karsiTaraf.create({ data: { musteriId: musteriIdleri[0], ad } })).id;
    yeniIdler.push(id);
  }

  return [...secilenIdler, ...yeniIdler];
}

// Uyusmazlik grubu secimini cozumler: "yeniUyusmazlikGrubuAdi" doluysa yeni
// bir UyusmazlikGrubu olusturup id'sini dondurur, degilse secilen
// "uyusmazlikGrubuId"yi (varsa) kullanir. Ayni alacagin/uyusmazligin birden
// fazla dosyaya (asil borclu + sonradan devreye giren kefil vb.) yayilmasi
// durumunda dosyalari tek bir grup altinda toplamak icin kullanilir.
async function uyusmazlikGrubuIdCozumle(formData: FormData, musteriIdleri: string[]): Promise<string | null> {
  const yeniAd = metinYaAlNull(formData, "yeniUyusmazlikGrubuAdi");
  if (yeniAd) {
    // Ayni musteri altinda ayni isimde bir grup zaten varsa onu kullan -
    // bkz. karsiTarafIdleriniCozumle'deki ayni gerekcedeki duzeltme.
    const mevcut = await prisma.uyusmazlikGrubu.findFirst({
      where: { musteriId: musteriIdleri[0], ad: { equals: yeniAd, mode: "insensitive" } },
    });
    if (mevcut) return mevcut.id;
    const yeni = await prisma.uyusmazlikGrubu.create({
      data: { musteriId: musteriIdleri[0], ad: yeniAd },
    });
    return yeni.id;
  }
  return metinYaAlNull(formData, "uyusmazlikGrubuId");
}

export async function davaDosyasiOlustur(formData: FormData) {
  const konu = String(formData.get("konu") ?? "").trim();
  const durumId = String(formData.get("durumId") ?? "");
  const turId = String(formData.get("turId") ?? "");
  const acilisTarihi = String(formData.get("acilisTarihi") ?? "");
  const musteriIdleri = musteriIdleriniAl(formData);

  if (!konu || !durumId || !turId || !acilisTarihi) {
    throw new Error("Konu, tür, durum ve açılış tarihi alanları zorunludur.");
  }
  if (musteriIdleri.length === 0) {
    throw new Error("En az bir müvekkil seçilmelidir.");
  }

  const karsiTarafIdleri = await karsiTarafIdleriniCozumle(formData, musteriIdleri);
  const uyusmazlikGrubuId = await uyusmazlikGrubuIdCozumle(formData, musteriIdleri);
  if (!uyusmazlikGrubuId) {
    throw new Error("Dosya Kümesi seçilmelidir.");
  }
  const bagliOlduguDosyaId = metinYaAlNull(formData, "bagliOlduguDosyaId");
  const hukukiIliskiTuruId = metinYaAlNull(formData, "hukukiIliskiTuruId");
  const icraAltTuruId = metinYaAlNull(formData, "icraAltTuruId");
  const yargiKoluId = metinYaAlNull(formData, "yargiKoluId");

  const dosya = await prisma.davaDosyasi.create({
    data: {
      dosyaNo: metinYaAlNull(formData, "dosyaNo"),
      birimAdi: metinYaAlNull(formData, "birimAdi"),
      konu,
      turId,
      icraAltTuruId,
      yargiKoluId,
      hukukiIliskiTuruId,
      uyusmazlikGrubuId,
      bagliOlduguDosyaId,
      durumId,
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      acilisTarihi: new Date(acilisTarihi),
      aciklama: metinYaAlNull(formData, "aciklama"),
      muvekkiller: {
        create: musteriIdleri.map((musteriId) => ({ musteriId })),
      },
      karsiTaraflar: {
        create: karsiTarafIdleri.map((karsiTarafId) => ({ karsiTarafId })),
      },
    },
  });

  revalidatePath("/kokpit/dava-dosyalari");
  redirect(`/kokpit/dava-dosyalari/${dosya.id}`);
}

export async function davaDosyasiGuncelle(id: string, formData: FormData) {
  const konu = String(formData.get("konu") ?? "").trim();
  const durumId = String(formData.get("durumId") ?? "");
  const turId = String(formData.get("turId") ?? "");
  const acilisTarihi = String(formData.get("acilisTarihi") ?? "");
  const kapanisTarihiHam = String(formData.get("kapanisTarihi") ?? "").trim();
  const musteriIdleri = musteriIdleriniAl(formData);

  if (!konu || !durumId || !turId || !acilisTarihi) {
    throw new Error("Konu, tür, durum ve açılış tarihi alanları zorunludur.");
  }
  if (musteriIdleri.length === 0) {
    throw new Error("En az bir müvekkil seçilmelidir.");
  }

  const karsiTarafIdleri = await karsiTarafIdleriniCozumle(formData, musteriIdleri);
  const uyusmazlikGrubuId = await uyusmazlikGrubuIdCozumle(formData, musteriIdleri);
  if (!uyusmazlikGrubuId) {
    throw new Error("Dosya Kümesi seçilmelidir.");
  }
  const bagliOlduguDosyaIdHam = metinYaAlNull(formData, "bagliOlduguDosyaId");
  const bagliOlduguDosyaId = bagliOlduguDosyaIdHam === id ? null : bagliOlduguDosyaIdHam;
  const hukukiIliskiTuruId = metinYaAlNull(formData, "hukukiIliskiTuruId");
  const icraAltTuruId = metinYaAlNull(formData, "icraAltTuruId");
  const yargiKoluId = metinYaAlNull(formData, "yargiKoluId");

  await prisma.$transaction([
    prisma.davaDosyasi.update({
      where: { id },
      data: {
        dosyaNo: metinYaAlNull(formData, "dosyaNo"),
        birimAdi: metinYaAlNull(formData, "birimAdi"),
        konu,
        turId,
        icraAltTuruId,
        yargiKoluId,
        hukukiIliskiTuruId,
        uyusmazlikGrubuId,
        bagliOlduguDosyaId,
        durumId,
        sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
        acilisTarihi: new Date(acilisTarihi),
        kapanisTarihi: kapanisTarihiHam ? new Date(kapanisTarihiHam) : null,
        aciklama: metinYaAlNull(formData, "aciklama"),
      },
    }),
    prisma.dosyaMuvekkili.deleteMany({
      where: { dosyaId: id, musteriId: { notIn: musteriIdleri } },
    }),
    ...musteriIdleri.map((musteriId) =>
      prisma.dosyaMuvekkili.upsert({
        where: { dosyaId_musteriId: { dosyaId: id, musteriId } },
        update: {},
        create: { dosyaId: id, musteriId },
      }),
    ),
    prisma.dosyaKarsiTarafi.deleteMany({
      where: { dosyaId: id, karsiTarafId: { notIn: karsiTarafIdleri } },
    }),
    ...karsiTarafIdleri.map((karsiTarafId) =>
      prisma.dosyaKarsiTarafi.upsert({
        where: { dosyaId_karsiTarafId: { dosyaId: id, karsiTarafId } },
        update: {},
        create: { dosyaId: id, karsiTarafId },
      }),
    ),
  ]);

  revalidatePath("/kokpit/dava-dosyalari");
  revalidatePath(`/kokpit/dava-dosyalari/${id}`);
  redirect(`/kokpit/dava-dosyalari/${id}`);
}

export async function davaDosyasiSil(id: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  // Finansal kaydi olan bir dosya artik dogrudan silinemez - yanlislikla
  // gercek para hareketi/masraf/alacak kaydini yok etmemek icin. Bunun
  // yerine dosya "Kapalı"/"Arşiv" durumuna alinarak (mevcut durum alani
  // uzerinden) arsivlenir; finansal kayitlar hep gecmiste durur.
  const dosya = await prisma.davaDosyasi.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          masraflar: true,
          karsiTarafAlacaklari: true,
          paraTrafigiKayitlari: true,
          paraTrafigiDagitimlari: true,
          finansHareketleri: true,
        },
      },
    },
  });
  if (!dosya) return;
  const { masraflar, karsiTarafAlacaklari, paraTrafigiKayitlari, paraTrafigiDagitimlari, finansHareketleri } =
    dosya._count;
  if (
    masraflar > 0 ||
    karsiTarafAlacaklari > 0 ||
    paraTrafigiKayitlari > 0 ||
    paraTrafigiDagitimlari > 0 ||
    finansHareketleri > 0
  ) {
    throw new Error(
      "Bu dosyada finansal kayıt var, silinemez. Önce durumunu \"Kapalı\" veya \"Arşiv\" yaparak arşivleyin.",
    );
  }

  await prisma.davaDosyasi.delete({ where: { id } });
  revalidatePath("/kokpit/dava-dosyalari");
  revalidatePath("/kokpit/finans/musteri-iliskileri");
}

export async function dosyaMasrafiEkle(dosyaId: string, formData: FormData) {
  const tarih = String(formData.get("tarih") ?? "");
  const cariKodId = String(formData.get("cariKodId") ?? "");
  const turId = String(formData.get("turId") ?? "");
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const tutar = String(formData.get("tutar") ?? "");

  if (!tarih || !cariKodId || !turId || !aciklama || !tutar) {
    throw new Error("Tarih, cari kod, tür, açıklama ve tutar alanları zorunludur.");
  }

  await prisma.dosyaMasrafi.create({
    data: {
      dosyaId,
      cariKodId,
      turId,
      tarih: new Date(tarih),
      aciklama,
      tutar,
    },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

// Bloke Para gibi gecici tutulan bir kalemin gercek hayatta kalici bir
// masrafa donusmesi (or. arac yakalama avansi, arac yediemine cekilip
// icra mudurlugune bildirilirse artik geri alinamayabilir) gibi durumlar
// icin: kalem silinip yeniden girilmek yerine ayni satirin cari kodu/
// turu/tutari/aciklamasi duzenlenebilir - boylece tarihce/id korunur.
export async function dosyaMasrafiGuncelle(dosyaId: string, masrafId: string, formData: FormData) {
  const tarih = String(formData.get("tarih") ?? "");
  const cariKodId = String(formData.get("cariKodId") ?? "");
  const turId = String(formData.get("turId") ?? "");
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const tutar = String(formData.get("tutar") ?? "");

  if (!tarih || !cariKodId || !turId || !aciklama || !tutar) {
    throw new Error("Tarih, cari kod, tür, açıklama ve tutar alanları zorunludur.");
  }

  await prisma.dosyaMasrafi.update({
    where: { id: masrafId },
    data: {
      cariKodId,
      turId,
      tarih: new Date(tarih),
      aciklama,
      tutar,
    },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
  redirect(`/kokpit/dava-dosyalari/${dosyaId}`);
}

export async function dosyaMasrafiSil(id: string, dosyaId: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.dosyaMasrafi.delete({ where: { id } });
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

// Karsi Taraftan Alacak: muvekkil cari hesabindan (tasnif/masraf) BILEREK
// ayri bir mekanizma - bkz. KarsiTarafAlacagi model yorumu. Cebimizden
// para cikmaz, tersine karsi taraftan (borclu) beklenen bir tahsilattir.
export async function karsiTarafAlacagiEkle(dosyaId: string, formData: FormData) {
  const tutar = String(formData.get("tutar") ?? "");
  const aciklama = String(formData.get("aciklama") ?? "").trim();

  if (!tutar || !aciklama) {
    throw new Error("Tutar ve açıklama alanları zorunludur.");
  }

  await prisma.karsiTarafAlacagi.create({
    data: { dosyaId, tutar, aciklama },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

export async function karsiTarafAlacagiTahsilDurumuDegistir(
  id: string,
  dosyaId: string,
  tahsilEdildiMi: boolean,
) {
  await prisma.karsiTarafAlacagi.update({
    where: { id },
    data: { tahsilEdildiMi, tahsilTarihi: tahsilEdildiMi ? new Date() : null },
  });
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

export async function karsiTarafAlacagiSil(id: string, dosyaId: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.karsiTarafAlacagi.delete({ where: { id } });
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

// Yanlis girilen bir masraf artik SILINMEK yerine IPTAL EDILEBILIR (bkz.
// ARCHITECTURE.md) - satir kalici olarak durur, sadece Cari Hesap'a
// dahil edilmez (cariHesapOzetiHesapla'nin masrafWhere'i durumu
// "iptal_edildi" olanlari disliyor).
export async function dosyaMasrafiDurumDegistir(id: string, dosyaId: string, durumKodu: "odendi" | "iptal_edildi") {
  const durum = await prisma.secenekDegeri.findFirst({
    where: { kod: durumKodu, liste: { anahtar: "masraf_durumu" } },
  });
  if (!durum) throw new Error("Masraf durum listesi bulunamadı.");

  await prisma.dosyaMasrafi.update({ where: { id }, data: { durumId: durum.id } });
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

// ============================================================
// Dosya Kümesi (UyusmazlikGrubu) - bkz. ARCHITECTURE.md
// ============================================================

export async function uyusmazlikGrubuOlustur(formData: FormData) {
  const musteriId = String(formData.get("musteriId") ?? "").trim();
  const ad = String(formData.get("ad") ?? "").trim();
  const notlar = metinYaAlNull(formData, "notlar");
  const durumId = metinYaAlNull(formData, "durumId");

  if (!musteriId || !ad) {
    throw new Error("Müvekkil ve küme adı zorunludur.");
  }

  const karsiTarafIdleri = await karsiTarafIdleriniCozumle(formData, [musteriId]);

  const grup = await prisma.uyusmazlikGrubu.create({
    data: {
      musteriId,
      ad,
      notlar,
      durumId,
      karsiTaraflar: {
        create: karsiTarafIdleri.map((karsiTarafId) => ({ karsiTarafId })),
      },
    },
  });

  revalidatePath("/kokpit/dava-dosyalari");
  redirect(`/kokpit/dava-dosyalari/gruplar/${grup.id}`);
}

export async function uyusmazlikGrubuGuncelle(id: string, formData: FormData) {
  const musteriId = String(formData.get("musteriId") ?? "").trim();
  const ad = String(formData.get("ad") ?? "").trim();
  const notlar = metinYaAlNull(formData, "notlar");
  const durumId = metinYaAlNull(formData, "durumId");

  if (!musteriId || !ad) {
    throw new Error("Müvekkil ve küme adı zorunludur.");
  }

  const karsiTarafIdleri = await karsiTarafIdleriniCozumle(formData, [musteriId]);

  await prisma.$transaction([
    prisma.uyusmazlikGrubu.update({
      where: { id },
      data: { musteriId, ad, notlar, durumId },
    }),
    prisma.uyusmazlikGrubuKarsiTarafi.deleteMany({
      where: { uyusmazlikGrubuId: id, karsiTarafId: { notIn: karsiTarafIdleri } },
    }),
    ...karsiTarafIdleri.map((karsiTarafId) =>
      prisma.uyusmazlikGrubuKarsiTarafi.upsert({
        where: { uyusmazlikGrubuId_karsiTarafId: { uyusmazlikGrubuId: id, karsiTarafId } },
        update: {},
        create: { uyusmazlikGrubuId: id, karsiTarafId },
      }),
    ),
  ]);

  revalidatePath("/kokpit/dava-dosyalari");
  revalidatePath(`/kokpit/dava-dosyalari/gruplar/${id}`);
  redirect(`/kokpit/dava-dosyalari/gruplar/${id}`);
}

export async function uyusmazlikGrubuSil(id: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  const grup = await prisma.uyusmazlikGrubu.findUnique({
    where: { id },
    select: {
      _count: { select: { dosyalar: true, paraTrafigiKayitlari: true, dagitimlar: true } },
    },
  });
  if (!grup) return;

  if (grup._count.dosyalar > 0) {
    throw new Error("Bu kümeye bağlı yargısal dosya(lar) var, silinemez. Önce dosyaları başka bir kümeye taşıyın.");
  }
  if (grup._count.paraTrafigiKayitlari > 0 || grup._count.dagitimlar > 0) {
    throw new Error(
      "Bu kümede doğrudan bağlı finansal kayıt var, silinemez. Önce durumunu \"Arşiv\" yaparak arşivleyin.",
    );
  }

  await prisma.uyusmazlikGrubu.delete({ where: { id } });
  revalidatePath("/kokpit/dava-dosyalari");
}
