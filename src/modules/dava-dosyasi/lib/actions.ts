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

// Karsi taraf secimini cozumler: secilen "karsiTarafIds" (coklu - bir
// icra takibi genelde cek/bono zincirindeki TUM muteselsil sorumlulara
// birden acilir, tek bir karsi tarafa degil) + "yeniKarsiTarafAdlari"
// (YeniKarsiTarafEkleyici bilesenindeki "Ekle" butonuyla birer birer
// eklenen isimler, her biri gizli bir input olarak forma tasinir) - her
// biri icin ayri bir KarsiTaraf olusturulup listeye eklenir.
async function karsiTarafIdleriniCozumle(formData: FormData, musteriIdleri: string[]): Promise<string[]> {
  const secilenIdler = formData.getAll("karsiTarafIds").map(String).filter(Boolean);
  const yeniAdlar = formData
    .getAll("yeniKarsiTarafAdlari")
    .map(String)
    .map((ad) => ad.trim())
    .filter(Boolean);

  const yeniIdler: string[] = [];
  for (const ad of yeniAdlar) {
    const yeni = await prisma.karsiTaraf.create({
      data: { musteriId: musteriIdleri[0], ad },
    });
    yeniIdler.push(yeni.id);
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
  const bagliOlduguDosyaId = metinYaAlNull(formData, "bagliOlduguDosyaId");
  const hukukiIliskiTuruId = metinYaAlNull(formData, "hukukiIliskiTuruId");

  const dosya = await prisma.davaDosyasi.create({
    data: {
      dosyaNo: metinYaAlNull(formData, "dosyaNo"),
      birimAdi: metinYaAlNull(formData, "birimAdi"),
      konu,
      turId,
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
  const bagliOlduguDosyaIdHam = metinYaAlNull(formData, "bagliOlduguDosyaId");
  const bagliOlduguDosyaId = bagliOlduguDosyaIdHam === id ? null : bagliOlduguDosyaIdHam;
  const hukukiIliskiTuruId = metinYaAlNull(formData, "hukukiIliskiTuruId");

  await prisma.$transaction([
    prisma.davaDosyasi.update({
      where: { id },
      data: {
        dosyaNo: metinYaAlNull(formData, "dosyaNo"),
        birimAdi: metinYaAlNull(formData, "birimAdi"),
        konu,
        turId,
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

  await prisma.davaDosyasi.delete({ where: { id } });
  revalidatePath("/kokpit/dava-dosyalari");
  redirect("/kokpit/dava-dosyalari");
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
