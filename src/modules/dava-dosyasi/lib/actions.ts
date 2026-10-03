"use server";

import { silmeSifresiniDogrula } from "@/core/auth/silme-dogrulama";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { MuvekkilSifati, HukukiMudahaleDurumu, DosyaEvresi, AdliBirimHareketYonu, MasrafYansitmaHedefi } from "@prisma/client";
import { prisma } from "@/core/db/prisma";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { silebilirMi } from "@/core/auth/yetki";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { dosyaCariHesapOzeti } from "./queries";

function metinYaAlNull(formData: FormData, alan: string): string | null {
  const deger = String(formData.get(alan) ?? "").trim();
  return deger === "" ? null : deger;
}

// useActionState ile dogrulama hatasinda formu yeniden doldurmak icin:
// gonderilen TUM duz metin/select degerlerini (File olanlar disinda)
// yakalar - React, bir form action'i tamamlandiginda (basarili ya da
// { hata } donse de fark etmez, throw ETMEDIGI surece) uncontrolled
// alanlari otomatik SIFIRLAR (React 19'un dokumante edilen davranisi);
// bu yuzden bir sonraki render'da defaultValue'yu buradan (dosya'nin
// mevcut degeri degil, kullanicinin SON yazdigi deger) beslemek gerekir
// (bkz. dava-dosyasi-form-icerik.tsx).
function formVerileriniAl(formData: FormData): Record<string, string> {
  const veriler: Record<string, string> = {};
  for (const [anahtar, deger] of formData.entries()) {
    if (typeof deger === "string") veriler[anahtar] = deger;
  }
  return veriler;
}

async function varsayilanDurumIdGetir(): Promise<string> {
  const durumlar = await secenekleriGetir("dava_dosyasi_durumu");
  const acik = durumlar.find((d) => d.kod === "acik");
  if (!acik) throw new Error("Varsayılan durum (Açık) bulunamadı.");
  return acik.id;
}

// Formdaki "Tür" / "Yargı Kolu" / "Müvekkil Sıfatı" alanları. Yargı kolu
// yalnızca Dava türünde anlamlıdır, başka türde boş bırakılır.
async function dosyaSinifiniAl(formData: FormData) {
  const turId = metinYaAlNull(formData, "turId") ?? (await varsayilanTurIdGetir());
  const tur = await prisma.secenekDegeri.findUnique({ where: { id: turId }, select: { kod: true } });
  const yargiKoluId = tur?.kod === "dava_dosyasi" ? metinYaAlNull(formData, "yargiKoluId") : null;
  const muvekkilSifati: MuvekkilSifati = formData.get("muvekkilSifati") === "BORCLU" ? "BORCLU" : "ALACAKLI";
  return { turId, yargiKoluId, muvekkilSifati };
}

async function varsayilanTurIdGetir(): Promise<string> {
  const turler = await secenekleriGetir("dosya_turu");
  const davaDosyasi = turler.find((t) => t.kod === "dava_dosyasi");
  if (!davaDosyasi) throw new Error("Varsayılan dosya türü (Dava Dosyası) bulunamadı.");
  return davaDosyasi.id;
}

// Sadelestirilmis formda Dosya Kumesi artik kullaniciya sorulmuyor -
// musterinin kendi adiyla ayni isimde zaten bir kumesi varsa onu kullanir
// (finans/cari hesap ozeti hep ayni yerde birikir), yoksa musteri adiyla
// otomatik bir tane olusturur. Birden fazla muvekkil secilmisse ilkinin
// kumesi esas alinir (bkz. karsiTarafIdleriniCozumle'deki ayni "ilk
// musteri" varsayimi).
async function uyusmazlikGrubuOtomatikCozumle(musteriId: string): Promise<string> {
  const musteri = await prisma.musteri.findUniqueOrThrow({ where: { id: musteriId } });
  const mevcut = await prisma.uyusmazlikGrubu.findFirst({
    where: { musteriId, ad: { equals: musteri.adSoyadUnvan, mode: "insensitive" } },
  });
  if (mevcut) return mevcut.id;
  const yeni = await prisma.uyusmazlikGrubu.create({ data: { musteriId, ad: musteri.adSoyadUnvan } });
  return yeni.id;
}

function musteriIdleriniAl(formData: FormData): string[] {
  return formData.getAll("musteriIds").map(String).filter(Boolean);
}

// "Uyuşmazlık Türü" menüsünde "MANUEL GİR" seçilmişse yazılan etiketi
// (büyük/küçük harf duyarsız) listede arar, yoksa listeye kalıcı ekler.
async function hukukiIliskiTuruIdCozumle(formData: FormData): Promise<string | null> {
  return manuelSecenekIdCozumle(formData, "hukukiIliskiTuruId", "yeniHukukiIliskiTuruEtiketi", "hukuki_iliski_turu");
}

async function manuelSecenekIdCozumle(
  formData: FormData,
  alan: string,
  yeniAlan: string,
  listeAnahtari: string,
): Promise<string | null> {
  const secim = metinYaAlNull(formData, alan);
  if (secim !== "__manuel__") return secim;

  const etiket = metinYaAlNull(formData, yeniAlan);
  if (!etiket) return null;

  const liste = await prisma.secenekListesi.findUnique({ where: { anahtar: listeAnahtari } });
  if (!liste) return null;

  const mevcut = await prisma.secenekDegeri.findFirst({
    where: { listeId: liste.id, etiket: { equals: etiket, mode: "insensitive" } },
  });
  if (mevcut) return mevcut.id;

  const temelKod = etiket.toLocaleLowerCase("tr").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "deger";
  let kod = temelKod;
  for (let sayac = 2; await prisma.secenekDegeri.findUnique({ where: { listeId_kod: { listeId: liste.id, kod } } }); sayac++) {
    kod = `${temelKod}_${sayac}`;
  }
  const enBuyukSira = await prisma.secenekDegeri.aggregate({ where: { listeId: liste.id }, _max: { siraNo: true } });
  const yeni = await prisma.secenekDegeri.create({
    data: { listeId: liste.id, kod, etiket, siraNo: (enBuyukSira._max.siraNo ?? -1) + 1 },
  });
  updateTag("secenek-listeleri");
  return yeni.id;
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
  // "yeniKarsiTarafTcleri" her yeni isimle AYNI sirada gelir (bos olabilir).
  const tamAdlar = formData.getAll("yeniKarsiTarafAdlari").map(String);
  const tcler = formData.getAll("yeniKarsiTarafTcleri").map(String);
  const yeniAdlar = tamAdlar
    .map((ad, i) => ({ ad: ad.trim(), tc: (tcler[i] ?? "").trim() || null }))
    .filter((k) => k.ad);

  const yeniIdler: string[] = [];
  for (const { ad, tc } of yeniAdlar) {
    // Ayni musteri altinda ayni isimde (buyuk/kucuk harf ve bosluk
    // duyarsiz) zaten bir karsi taraf varsa YENI kayit olusturmak yerine
    // onu kullan - aksi halde ayni "Mata Kauçuk"tan birden fazla, birbirine
    // bagli olmayan kayit birikir (bkz. GELISTIRME_KUTUSU.md gecmisi).
    const mevcut = await prisma.karsiTaraf.findFirst({
      where: { musteriId: musteriIdleri[0], ad: { equals: ad, mode: "insensitive" } },
    });
    if (mevcut && tc && mevcut.tanimlayiciKod !== tc) {
      await prisma.karsiTaraf.update({ where: { id: mevcut.id }, data: { tanimlayiciKod: tc } });
    }
    const id = mevcut
      ? mevcut.id
      : (await prisma.karsiTaraf.create({ data: { musteriId: musteriIdleri[0], ad, tanimlayiciKod: tc } })).id;
    yeniIdler.push(id);
  }

  return [...secilenIdler, ...yeniIdler];
}

// Talep Sonucu artik tek bir metin kutusu degil, kullanicinin ayri ayri
// ekleyip cikarabildigi maddelerin listesi (bkz. talep-sonucu-listesi.tsx) -
// sunucuda tum maddeler "\n" ile birlestirilip mevcut `talepSonucu`
// sutununa yazilir, ayri bir tablo gerekmez.
function talepSonucuAl(formData: FormData): string | null {
  const maddeler = formData
    .getAll("talepMaddeleri")
    .map(String)
    .map((m) => m.trim())
    .filter(Boolean);
  return maddeler.length > 0 ? maddeler.join("\n") : null;
}

// gonderilenMusteriIdleri ve gonderilenTalepMaddeleri AYRI tutulur:
// MuvekkilSecici (defaultChecked'e dayanan uncontrolled checkbox listesi)
// ve TalepSonucuListesi (coklu "talepMaddeleri" alani) React 19'un
// form-sifirlama davranisindan etkileniyor, ama coklu deger oldugu icin
// (formData.getAll) formVerileriniAl'in tek-degerli Record'una sigmiyorlar,
// ayri tasinirlar.
export type DavaDosyasiSonucu =
  | {
      hata: string;
      gonderilenAlanlar: Record<string, string>;
      gonderilenMusteriIdleri: string[];
      gonderilenTalepMaddeleri: string[];
    }
  | undefined;

// useActionState ile kullanilir: dogrulama hatalarinda throw yerine
// { hata } donerek formun (ve icindeki tum musteri/karsi taraf secimleri,
// yazilmis alanlar gibi client state'in) hata sonrasi SIFIRLANMASINI
// (error.tsx'e dusup tum agacin unmount olmasini) engeller - throw edilen
// bir hata useActionState tarafindan yakalanmaz, en yakin error boundary'ye
// gider ve formu komple kaybettirir (bkz. girisYap'taki ayni desen).
export async function davaDosyasiOlustur(
  _oncekiDurum: DavaDosyasiSonucu,
  formData: FormData,
): Promise<DavaDosyasiSonucu> {
  const musteriIdleri = musteriIdleriniAl(formData);
  const davaTuruId = await manuelSecenekIdCozumle(formData, "davaTuruId", "yeniDavaTuruEtiketi", "dava_turu");
  const talepSonucu = talepSonucuAl(formData);
  const gonderilenAlanlar = formVerileriniAl(formData);
  const gonderilenTalepMaddeleri = formData.getAll("talepMaddeleri").map(String);

  if (musteriIdleri.length === 0) {
    return {
      hata: "En az bir müvekkil seçilmelidir.",
      gonderilenAlanlar,
      gonderilenMusteriIdleri: musteriIdleri,
      gonderilenTalepMaddeleri,
    };
  }
  if (!davaTuruId) {
    return {
      hata: "Dava türü seçilmelidir.",
      gonderilenAlanlar,
      gonderilenMusteriIdleri: musteriIdleri,
      gonderilenTalepMaddeleri,
    };
  }
  if (!talepSonucu) {
    return {
      hata: "Talep sonucu zorunludur.",
      gonderilenAlanlar,
      gonderilenMusteriIdleri: musteriIdleri,
      gonderilenTalepMaddeleri,
    };
  }

  const karsiTarafIdleri = await karsiTarafIdleriniCozumle(formData, musteriIdleri);
  const hukukiIliskiTuruId = await hukukiIliskiTuruIdCozumle(formData);
  const durusmaTarihiHam = metinYaAlNull(formData, "durusmaTarihi");

  const [durumId, { turId, yargiKoluId, muvekkilSifati }, davaTuru, uyusmazlikGrubuId] = await Promise.all([
    varsayilanDurumIdGetir(),
    dosyaSinifiniAl(formData),
    prisma.secenekDegeri.findUnique({ where: { id: davaTuruId } }),
    uyusmazlikGrubuOtomatikCozumle(musteriIdleri[0]),
  ]);
  // Konu artik ayrica sorulmuyor - Dava Turu'nden otomatik uretilir
  // (liste/detay basliklarinda TEK SATIRLIK kisa bir etiket olarak
  // kullanilir, bkz. dava-dosyalari-tablosu.tsx). Talep Sonucu BILEREK
  // buna dahil edilmiyor - o artik coklu madde icerebiliyor (bkz.
  // talep-sonucu-listesi.tsx), Konu'ya eklenirse baslik devasa buyur ve
  // zaten kendi kartinda ayrica gosterildigi icin ayni bilgi iki yerde
  // tekrar eder (bkz. kullanici geri bildirimi).
  const konu = davaTuru?.etiket ?? "";

  const dosya = await prisma.davaDosyasi.create({
    data: {
      buroNo: metinYaAlNull(formData, "buroNo"),
      dosyaNo: metinYaAlNull(formData, "dosyaNo"),
      birimAdi: metinYaAlNull(formData, "birimAdi"),
      konu,
      turId,
      yargiKoluId,
      muvekkilSifati,
      hukukiIliskiTuruId,
      davaTuruId,
      talepSonucu,
      durusmaTarihi: durusmaTarihiHam ? new Date(durusmaTarihiHam) : null,
      uyusmazlikGrubuId,
      durumId,
      acilisTarihi: new Date(),
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

export async function davaDosyasiGuncelle(
  id: string,
  _oncekiDurum: DavaDosyasiSonucu,
  formData: FormData,
): Promise<DavaDosyasiSonucu> {
  const musteriIdleri = musteriIdleriniAl(formData);
  const davaTuruId = await manuelSecenekIdCozumle(formData, "davaTuruId", "yeniDavaTuruEtiketi", "dava_turu");
  const talepSonucu = talepSonucuAl(formData);
  const gonderilenAlanlar = formVerileriniAl(formData);
  const gonderilenTalepMaddeleri = formData.getAll("talepMaddeleri").map(String);

  if (musteriIdleri.length === 0) {
    return {
      hata: "En az bir müvekkil seçilmelidir.",
      gonderilenAlanlar,
      gonderilenMusteriIdleri: musteriIdleri,
      gonderilenTalepMaddeleri,
    };
  }
  if (!davaTuruId) {
    return {
      hata: "Dava türü seçilmelidir.",
      gonderilenAlanlar,
      gonderilenMusteriIdleri: musteriIdleri,
      gonderilenTalepMaddeleri,
    };
  }
  if (!talepSonucu) {
    return {
      hata: "Talep sonucu zorunludur.",
      gonderilenAlanlar,
      gonderilenMusteriIdleri: musteriIdleri,
      gonderilenTalepMaddeleri,
    };
  }

  const karsiTarafIdleri = await karsiTarafIdleriniCozumle(formData, musteriIdleri);
  const hukukiIliskiTuruId = await hukukiIliskiTuruIdCozumle(formData);
  const durusmaTarihiHam = metinYaAlNull(formData, "durusmaTarihi");
  const davaTuru = await prisma.secenekDegeri.findUnique({ where: { id: davaTuruId } });
  const konu = davaTuru?.etiket ?? "";
  const { turId, yargiKoluId, muvekkilSifati } = await dosyaSinifiniAl(formData);

  // DIKKAT: durumId/acilisTarihi/uyusmazlikGrubuId/kapanisTarihi/
  // sorumluAvukatId/aciklama/icraAltTuruId/bagliOlduguDosyaId
  // BILEREK bu update'e dahil DEGIL - sadelestirilmis formda artik hic
  // toplanmiyorlar, update data'sinda olmayan bir alan Prisma tarafindan
  // DOKUNULMADAN oldugu gibi birakilir (silinmez/sifirlanmaz).
  await prisma.$transaction([
    prisma.davaDosyasi.update({
      where: { id },
      data: {
        buroNo: metinYaAlNull(formData, "buroNo"),
      dosyaNo: metinYaAlNull(formData, "dosyaNo"),
        birimAdi: metinYaAlNull(formData, "birimAdi"),
        konu,
        turId,
        yargiKoluId,
        muvekkilSifati,
        hukukiIliskiTuruId,
        davaTuruId,
        talepSonucu,
        durusmaTarihi: durusmaTarihiHam ? new Date(durusmaTarihiHam) : null,
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

export async function davaDosyasiSil(id: string, sifre?: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  await silmeSifresiniDogrula(sifre);

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
          altDosyalar: true,
        },
      },
    },
  });
  if (!dosya) return;
  if (dosya._count.altDosyalar > 0) {
    throw new Error("Bu dosyanın alt dosyaları var. Önce alt dosyaları ana dosyadan ayırın.");
  }
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

// "Paneli düzenle" ile dosya detayindaki kartlardan yapilan tekil alan
// guncellemeleri. Yalnizca izin verilen alanlar degistirilebilir; tur
// Dava degilse yargi kolu temizlenir, Dava Turu degisince Konu (baslik)
// yeniden uretilir (bkz. davaDosyasiGuncelle ile ayni kural).
const DETAY_DUZENLENEBILIR_ALANLAR = [
  "turId", "yargiKoluId", "muvekkilSifati", "hukukiIliskiTuruId", "davaTuruId",
  "birimAdi", "buroNo", "dosyaNo", "talepSonucu", "durusmaTarihi",
];

export async function dosyaAlanlariniGuncelle(dosyaId: string, degerler: Record<string, string>) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için yetkiniz yok.");

  const data: Record<string, unknown> = {};
  for (const [alan, ham] of Object.entries(degerler)) {
    if (!DETAY_DUZENLENEBILIR_ALANLAR.includes(alan)) {
      throw new Error("Bu alan buradan değiştirilemez.");
    }
    const deger = ham.trim();
    switch (alan) {
      case "muvekkilSifati":
        data.muvekkilSifati = deger === "BORCLU" ? "BORCLU" : "ALACAKLI";
        break;
      case "turId":
        if (!deger) throw new Error("Tür boş bırakılamaz.");
        data.turId = deger;
        break;
      case "davaTuruId": {
        if (!deger) throw new Error("Dava Türü boş bırakılamaz.");
        const davaTuru = await prisma.secenekDegeri.findUnique({ where: { id: deger } });
        if (!davaTuru) throw new Error("Dava Türü bulunamadı.");
        data.davaTuruId = deger;
        data.konu = davaTuru.etiket;
        break;
      }
      case "yargiKoluId":
      case "hukukiIliskiTuruId":
        data[alan] = deger || null;
        break;
      case "durusmaTarihi":
        data.durusmaTarihi = deger ? new Date(deger) : null;
        break;
      case "talepSonucu":
        data.talepSonucu =
          deger.split("\n").map((m) => m.trim()).filter(Boolean).join("\n") || null;
        break;
      default:
        data[alan] = deger || null;
    }
  }

  // Tur Dava degilse yargi kolu anlamsizdir.
  const turId =
    (data.turId as string | undefined) ??
    (await prisma.davaDosyasi.findUnique({ where: { id: dosyaId }, select: { turId: true } }))?.turId;
  if (turId) {
    const tur = await prisma.secenekDegeri.findUnique({ where: { id: turId }, select: { kod: true } });
    if (tur && tur.kod !== "dava_dosyasi") data.yargiKoluId = null;
  }

  await prisma.davaDosyasi.update({ where: { id: dosyaId }, data });
  revalidatePath("/kokpit/dava-dosyalari");
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

// Dosya agaci: bir dosyayi baska bir dosyanin ALT dosyasi yapar (ya da
// anaDosyaId=null ile ayirir). Tek seviye kurali: ana dosya olacak dosya
// kendisi alt dosya olamaz, alt dosyasi olan bir dosya baskasinin altina
// alinamaz. Alt sira no ana dosya icinde en buyuk numara + 1 olarak verilir.
export async function anaDosyaBagla(dosyaId: string, anaDosyaId: string | null) {
  const kullanici = await mevcutKullanici();
  if (!kullanici) throw new Error("Bu işlem için yetkiniz yok.");

  const dosya = await prisma.davaDosyasi.findUnique({
    where: { id: dosyaId },
    select: { id: true, anaDosyaId: true, _count: { select: { altDosyalar: true } } },
  });
  if (!dosya) throw new Error("Dosya bulunamadı.");

  if (anaDosyaId === null) {
    await prisma.davaDosyasi.update({ where: { id: dosyaId }, data: { anaDosyaId: null, altSiraNo: null } });
  } else {
    if (anaDosyaId === dosyaId) throw new Error("Bir dosya kendi ana dosyası olamaz.");
    if (dosya._count.altDosyalar > 0) {
      throw new Error("Bu dosyanın kendi alt dosyaları var, başka bir dosyanın altına alınamaz.");
    }
    const ana = await prisma.davaDosyasi.findUnique({
      where: { id: anaDosyaId },
      select: { id: true, anaDosyaId: true },
    });
    if (!ana) throw new Error("Ana dosya bulunamadı.");
    if (ana.anaDosyaId) throw new Error("Seçilen dosya zaten başka bir dosyanın alt dosyası.");
    if (dosya.anaDosyaId === anaDosyaId) return;

    await prisma.$transaction(async (tx) => {
      const enBuyuk = await tx.davaDosyasi.aggregate({
        where: { anaDosyaId },
        _max: { altSiraNo: true },
      });
      await tx.davaDosyasi.update({
        where: { id: dosyaId },
        data: { anaDosyaId, altSiraNo: (enBuyuk._max.altSiraNo ?? 0) + 1 },
      });
    });
  }

  revalidatePath("/kokpit/dava-dosyalari");
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
  if (anaDosyaId) revalidatePath(`/kokpit/dava-dosyalari/${anaDosyaId}`);
  if (dosya.anaDosyaId) revalidatePath(`/kokpit/dava-dosyalari/${dosya.anaDosyaId}`);
  revalidatePath("/kokpit/finans/musteri-iliskileri");
}

const GECERLI_YANSITMA_HEDEFLERI: MasrafYansitmaHedefi[] = ["MUVEKKIL", "BURO", "BORCLU"];

function yansitmaHedefiAl(formData: FormData): MasrafYansitmaHedefi {
  const ham = String(formData.get("yansitmaHedefi") ?? "MUVEKKIL") as MasrafYansitmaHedefi;
  return GECERLI_YANSITMA_HEDEFLERI.includes(ham) ? ham : "MUVEKKIL";
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
      yansitmaHedefi: yansitmaHedefiAl(formData),
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
      yansitmaHedefi: yansitmaHedefiAl(formData),
    },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
  redirect(`/kokpit/dava-dosyalari/${dosyaId}`);
}

// Listeden tek tikla "kime yansitilsin" degistirme (Muvekkil / Buro / Borclu).
export async function dosyaMasrafiYansitmaDegistir(id: string, dosyaId: string, hedef: MasrafYansitmaHedefi) {
  if (!GECERLI_YANSITMA_HEDEFLERI.includes(hedef)) throw new Error("Geçerli bir yansıtma hedefi seçin.");
  await prisma.dosyaMasrafi.update({ where: { id }, data: { yansitmaHedefi: hedef } });
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
  revalidatePath("/kokpit/finans/musteri-iliskileri");
}

// Ayni muvekkile ait iki dosya arasinda avans aktarimi - bkz.
// DosyaAvansAktarimi model yorumu. `kaynakDosyaId` URL'den (bind) gelir; form
// hedef dosya, cari kod, tutar, tarih ve aciklamayi verir. Kaynaktaki
// mevcut bakiyeden fazlasi aktarilamaz (kaynak eksiye dusmesin).
export async function avansAktarimiEkle(kaynakDosyaId: string, formData: FormData) {
  const hedefDosyaId = String(formData.get("hedefDosyaId") ?? "");
  const cariKodId = String(formData.get("cariKodId") ?? "");
  const tarih = String(formData.get("tarih") ?? "");
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const tutarHam = String(formData.get("tutar") ?? "").replace(",", ".");
  const tutar = Number(tutarHam);

  if (!hedefDosyaId || !cariKodId || !tarih || !aciklama || !Number.isFinite(tutar) || tutar <= 0) {
    throw new Error("Hedef dosya, cari kod, tarih, tutar ve açıklama zorunludur.");
  }
  if (hedefDosyaId === kaynakDosyaId) {
    throw new Error("Kaynak ve hedef dosya aynı olamaz.");
  }

  const [kaynak, hedef] = await Promise.all([
    prisma.davaDosyasi.findUnique({ where: { id: kaynakDosyaId }, select: { muvekkiller: true } }),
    prisma.davaDosyasi.findUnique({ where: { id: hedefDosyaId }, select: { muvekkiller: true } }),
  ]);
  if (!kaynak || !hedef) throw new Error("Dosya bulunamadı.");
  const ortakMuvekkil = kaynak.muvekkiller.some((k) => hedef.muvekkiller.some((h) => h.musteriId === k.musteriId));
  if (!ortakMuvekkil) {
    throw new Error("Avans yalnızca aynı müvekkilin dosyaları arasında aktarılabilir.");
  }

  const ozet = await dosyaCariHesapOzeti(kaynakDosyaId);
  const satir = ozet.find((o) => o.cariKod.id === cariKodId);
  const mevcutBakiye = satir?.bakiye ?? 0;
  if (tutar > mevcutBakiye + 0.005) {
    throw new Error(
      `Kaynak dosyada seçilen cari kodda aktarılabilir bakiye yetersiz (mevcut: ${mevcutBakiye.toFixed(2)} TL).`,
    );
  }

  await prisma.dosyaAvansAktarimi.create({
    data: {
      kaynakDosyaId,
      hedefDosyaId,
      cariKodId,
      tarih: new Date(tarih),
      tutar: tutar.toFixed(2),
      aciklama,
    },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${kaynakDosyaId}`);
  revalidatePath(`/kokpit/dava-dosyalari/${hedefDosyaId}`);
  revalidatePath("/kokpit/finans/musteri-iliskileri");
}

export async function avansAktarimiSil(id: string, dosyaId: string, sifre?: string) {
  await silmeSifresiniDogrula(sifre);
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }
  const aktarim = await prisma.dosyaAvansAktarimi.delete({ where: { id } });
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
  revalidatePath(`/kokpit/dava-dosyalari/${aktarim.kaynakDosyaId}`);
  revalidatePath(`/kokpit/dava-dosyalari/${aktarim.hedefDosyaId}`);
  revalidatePath("/kokpit/finans/musteri-iliskileri");
}

export async function dosyaMasrafiSil(id: string, dosyaId: string, sifre?: string) {
  await silmeSifresiniDogrula(sifre);
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

export async function karsiTarafAlacagiSil(id: string, dosyaId: string, sifre?: string) {
  await silmeSifresiniDogrula(sifre);
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

// ============================================================
// Avukat Sapkasi (HukukiMudahale) + Karar Sonrasi Takip (dosyaEvresi)
// bkz. ARCHITECTURE.md "Dava Dosyasi Yasam Dongusu"
// ============================================================

const GECERLI_HUKUKI_MUDAHALE_DURUMLARI: HukukiMudahaleDurumu[] = [
  "BEKLEMEDE",
  "DEVAM_EDIYOR",
  "TAMAMLANDI",
  "IPTAL_EDILDI",
];

const GECERLI_DOSYA_EVRELERI: DosyaEvresi[] = [
  "ACILIS",
  "DERDEST",
  "KARAR_VERILDI",
  "GEREKCELI_KARAR_BEKLENIYOR",
  "GEREKCELI_KARAR_HAZIR",
  "TEBLIG_BEKLENIYOR",
  "KANUN_YOLU_DEGERLENDIRME",
  "ISTINAFTA",
  "BAM_KARARI_GELDI",
  "TEMYIZ_DEGERLENDIRME",
  "TEMYIZDE",
  "KESINLESME_BEKLENIYOR",
  "KESINLESTI",
];

export async function hukukiMudahaleEkle(davaDosyasiId: string, formData: FormData) {
  const baslik = String(formData.get("baslik") ?? "").trim();
  if (!baslik) {
    throw new Error("Müdahale başlığı zorunludur.");
  }

  await prisma.hukukiMudahale.create({
    data: {
      davaDosyasiId,
      baslik,
      aciklama: metinYaAlNull(formData, "aciklama"),
      mudahaleTuruId: metinYaAlNull(formData, "mudahaleTuruId"),
      oncelikId: metinYaAlNull(formData, "oncelikId"),
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      sonTarih: (() => {
        const deger = metinYaAlNull(formData, "sonTarih");
        return deger ? new Date(deger) : null;
      })(),
    },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${davaDosyasiId}`);
  revalidatePath("/kokpit/dava-dosyalari/avukat-sapkasi");
}

export async function hukukiMudahaleGuncelle(id: string, davaDosyasiId: string, formData: FormData) {
  const baslik = String(formData.get("baslik") ?? "").trim();
  if (!baslik) {
    throw new Error("Müdahale başlığı zorunludur.");
  }
  const durum = String(formData.get("durum") ?? "") as HukukiMudahaleDurumu;
  if (!GECERLI_HUKUKI_MUDAHALE_DURUMLARI.includes(durum)) {
    throw new Error("Geçerli bir durum seçin.");
  }
  const sonTarihHam = metinYaAlNull(formData, "sonTarih");

  await prisma.hukukiMudahale.update({
    where: { id },
    data: {
      baslik,
      aciklama: metinYaAlNull(formData, "aciklama"),
      mudahaleTuruId: metinYaAlNull(formData, "mudahaleTuruId"),
      oncelikId: metinYaAlNull(formData, "oncelikId"),
      sorumluAvukatId: metinYaAlNull(formData, "sorumluAvukatId"),
      sonTarih: sonTarihHam ? new Date(sonTarihHam) : null,
      durum,
      tamamlanmaTarihi: durum === "TAMAMLANDI" ? new Date() : null,
    },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${davaDosyasiId}`);
  revalidatePath("/kokpit/dava-dosyalari/avukat-sapkasi");
}

// Listeden hizli durum degistirme (ör. "Tamamlandi" isaretleme) - tam
// duzenleme formuna girmeden.
export async function hukukiMudahaleDurumDegistir(id: string, davaDosyasiId: string, durum: HukukiMudahaleDurumu) {
  if (!GECERLI_HUKUKI_MUDAHALE_DURUMLARI.includes(durum)) {
    throw new Error("Geçerli bir durum seçin.");
  }

  await prisma.hukukiMudahale.update({
    where: { id },
    data: { durum, tamamlanmaTarihi: durum === "TAMAMLANDI" ? new Date() : null },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${davaDosyasiId}`);
  revalidatePath("/kokpit/dava-dosyalari/avukat-sapkasi");
}

export async function hukukiMudahaleSil(id: string, davaDosyasiId: string) {
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.hukukiMudahale.delete({ where: { id } });
  revalidatePath(`/kokpit/dava-dosyalari/${davaDosyasiId}`);
  revalidatePath("/kokpit/dava-dosyalari/avukat-sapkasi");
}

// Karar Sonrasi Takip: dosyaEvresi + kontrol alanlari TEK yerde
// (DavaDosyasi'nin kendi kaydi) guncellenir - ayri bir tablo/model yok.
// evreDegisiklikTarihi SADECE evre gercekten degistiginde guncellenir.
export async function dosyaEvresiGuncelle(davaDosyasiId: string, formData: FormData) {
  const dosyaEvresiHam = metinYaAlNull(formData, "dosyaEvresi");
  if (dosyaEvresiHam && !GECERLI_DOSYA_EVRELERI.includes(dosyaEvresiHam as DosyaEvresi)) {
    throw new Error("Geçerli bir dosya evresi seçin.");
  }
  const dosyaEvresi = (dosyaEvresiHam as DosyaEvresi | null) ?? null;

  const sonrakiKontrolTarihiHam = metinYaAlNull(formData, "sonrakiKontrolTarihi");
  const sonKontrolTarihiHam = metinYaAlNull(formData, "sonKontrolTarihi");

  const mevcut = await prisma.davaDosyasi.findUnique({
    where: { id: davaDosyasiId },
    select: { dosyaEvresi: true },
  });
  if (!mevcut) return;

  await prisma.davaDosyasi.update({
    where: { id: davaDosyasiId },
    data: {
      dosyaEvresi,
      evreDegisiklikTarihi: dosyaEvresi !== mevcut.dosyaEvresi ? new Date() : undefined,
      sonrakiKontrolTarihi: sonrakiKontrolTarihiHam ? new Date(sonrakiKontrolTarihiHam) : null,
      sonrakiKontrolSorusu: metinYaAlNull(formData, "sonrakiKontrolSorusu"),
      sonKontrolTarihi: sonKontrolTarihiHam ? new Date(sonKontrolTarihiHam) : null,
      sonKontrolSonucu: metinYaAlNull(formData, "sonKontrolSonucu"),
    },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${davaDosyasiId}`);
  revalidatePath("/kokpit/dava-dosyalari/karar-sonrasi-takip");
}

// ============================================================
// Büro <-> Adli Birim Cari Hesabı (Dosya Ekonomisi sekmesi) -
// bkz. AdliBirimHareketi model yorumu. Klasik cari hesap mantığı: büro
// adli birime (mahkeme/icra dairesi) öderse ODEME (borç hanesi), adli
// birimden para gelirse (iade, aktarılan tahsilat vb.) TAHSILAT (alacak
// hanesi).
// ============================================================

const GECERLI_ADLI_BIRIM_HAREKET_YONLERI: AdliBirimHareketYonu[] = ["ODEME", "TAHSILAT"];

export async function adliBirimHareketiEkle(dosyaId: string, formData: FormData) {
  const tarih = String(formData.get("tarih") ?? "");
  const yon = String(formData.get("yon") ?? "") as AdliBirimHareketYonu;
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const tutar = String(formData.get("tutar") ?? "");

  if (!tarih || !GECERLI_ADLI_BIRIM_HAREKET_YONLERI.includes(yon) || !aciklama || !tutar) {
    throw new Error("Tarih, yön, açıklama ve tutar alanları zorunludur.");
  }

  await prisma.adliBirimHareketi.create({
    data: { dosyaId, yon, tarih: new Date(tarih), aciklama, tutar },
  });

  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}

export async function adliBirimHareketiSil(id: string, dosyaId: string, sifre?: string) {
  await silmeSifresiniDogrula(sifre);
  const kullanici = await mevcutKullanici();
  if (!kullanici || !silebilirMi(kullanici.rol)) {
    throw new Error("Bu işlem için yetkiniz yok.");
  }

  await prisma.adliBirimHareketi.delete({ where: { id } });
  revalidatePath(`/kokpit/dava-dosyalari/${dosyaId}`);
}
