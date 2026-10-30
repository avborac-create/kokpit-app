// Buro takvimi: istemci ve sunucunun ortak tipleri ve saf (yan etkisiz) yardimcilari.

export type TakvimKodu = "IS" | "KISISEL" | "DURUSMA" | "ICRA" | "DOGUM";
export type OgeTuru = "DURUSMA" | "GOREV" | "TOPLANTI" | "NOT";
export type OgeDurumu = "BEKLIYOR" | "DEVAM" | "TAMAM";
export type Tekrar = "GUNLUK" | "HAFTALIK" | "AYLIK";

export type Oge = {
  id: string; // elle girilenler: veritabani kimligi; turetilmisler: "d:<id>" | "c:<id>" | "b:<id>-<yil>"
  baslik: string;
  tur: OgeTuru;
  takvim: TakvimKodu;
  tarih: string; // YYYY-MM-DD
  saat: string | null;
  bitisTarihi: string | null;
  bitisSaati: string | null;
  yer: string | null;
  meet: string | null;
  sorumluId: string | null;
  etiketler: string[];
  durum: OgeDurumu;
  tamam: boolean;
  icerik: string;
  tekrar: Tekrar | null;
  tekrarBitis: string | null;
  sira: number;
  dosya: string | null; // "d:<davaId>" | "c:<cmkId>"
  dosyaEtiketi: string | null;
  turetilmis: null | "dava" | "cmk" | "dogum";
};

export type OgeGirdisi = Omit<Oge, "id" | "turetilmis" | "dosyaEtiketi" | "sira"> & { id: string | null };

export const TAKVIMLER: { kod: TakvimKodu; ad: string; renk: string }[] = [
  { kod: "IS", ad: "İş", renk: "#4d97ff" },
  { kod: "KISISEL", ad: "Kişisel", renk: "#7bd88f" },
  { kod: "DURUSMA", ad: "Duruşma", renk: "#ff6b6b" },
  { kod: "ICRA", ad: "İcra", renk: "#f5a742" },
  { kod: "DOGUM", ad: "Doğum günü", renk: "#f78fb3" },
];
export const takvimRengi = (k: string) => TAKVIMLER.find((t) => t.kod === k)?.renk ?? "#4d97ff";

export const TURLER: { kod: OgeTuru; ad: string }[] = [
  { kod: "DURUSMA", ad: "Duruşma" },
  { kod: "GOREV", ad: "Görev" },
  { kod: "TOPLANTI", ad: "Toplantı" },
  { kod: "NOT", ad: "Not" },
];
export const DURUMLAR: { kod: OgeDurumu; ad: string }[] = [
  { kod: "BEKLIYOR", ad: "Bekliyor" },
  { kod: "DEVAM", ad: "Devam ediyor" },
  { kod: "TAMAM", ad: "Tamamlandı" },
];
export const TEKRARLAR: { kod: Tekrar; ad: string }[] = [
  { kod: "GUNLUK", ad: "Her gün" },
  { kod: "HAFTALIK", ad: "Her hafta" },
  { kod: "AYLIK", ad: "Her ay" },
];

export const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const GUN_ADLARI = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
export const GUN_ADLARI_UZUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

// ---- Gun (YYYY-MM-DD) aritmetigi: saat dilimi kaymasi olmasin diye UTC uzerinden ----
const iki = (n: number) => String(n).padStart(2, "0");
const ayir = (g: string) => g.split("-").map(Number) as [number, number, number];
export const gunStr = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${iki(d.getUTCMonth() + 1)}-${iki(d.getUTCDate())}`;
};
const ms = (g: string) => {
  const [y, m, d] = ayir(g);
  return Date.UTC(y, m - 1, d);
};
export const gunEkle = (g: string, n: number) => gunStr(ms(g) + n * 86400000);
export const gunFarki = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 86400000);
export const haftaninGunu = (g: string) => (new Date(ms(g)).getUTCDay() + 6) % 7; // Pazartesi = 0
export const haftaBasi = (g: string) => gunEkle(g, -haftaninGunu(g));
export const ayBasi = (g: string) => g.slice(0, 8) + "01";
export const ayEkle = (g: string, n: number) => {
  const [y, m] = ayir(g);
  return gunStr(Date.UTC(y, m - 1 + n, 1));
};
const aySonuGunu = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export const gunBicimi = (g: string) => {
  const [y, m, d] = ayir(g);
  return `${d} ${AY_ADLARI[m - 1]} ${y}`;
};
export const kisaTarih = (g: string) => g.split("-").reverse().join(".");

// Bir ogenin [bas, son] araligina dusen tum gorunumleri (tekrar + cok gunluk aralik).
export type Ornek = { key: string; oge: Oge; gun: string; ilkGun: boolean };

export function ornekleriUret(ogeler: Oge[], bas: string, son: string): Ornek[] {
  const cikti: Ornek[] = [];
  for (const oge of ogeler) {
    const sure = oge.bitisTarihi && oge.bitisTarihi > oge.tarih ? gunFarki(oge.tarih, oge.bitisTarihi) : 0;
    const baslangiclar: string[] = [];
    if (oge.tekrar) {
      const sinir = oge.tekrarBitis && oge.tekrarBitis < son ? oge.tekrarBitis : son;
      const [y0, m0, d0] = ayir(oge.tarih);
      for (let n = 0; n < 1000; n++) {
        let g: string;
        if (oge.tekrar === "GUNLUK") g = gunEkle(oge.tarih, n);
        else if (oge.tekrar === "HAFTALIK") g = gunEkle(oge.tarih, n * 7);
        else {
          const yy = y0 + Math.floor((m0 - 1 + n) / 12);
          const mm = ((m0 - 1 + n) % 12) + 1;
          g = `${yy}-${iki(mm)}-${iki(Math.min(d0, aySonuGunu(yy, mm)))}`;
        }
        if (g > sinir) break;
        baslangiclar.push(g);
      }
    } else baslangiclar.push(oge.tarih);
    for (const b of baslangiclar) {
      for (let k = 0; k <= sure; k++) {
        const g = gunEkle(b, k);
        if (g < bas || g > son) continue;
        cikti.push({ key: `${oge.id}|${g}`, oge, gun: g, ilkGun: k === 0 });
      }
    }
  }
  return cikti;
}

export type SiralamaModu = "elle" | "saat";
// Ayni gun icindeki siralama: elle (sira alani) ya da saate gore; turetilmisler (dosya duruşması) hep ustte.
export function gunSirala(liste: Ornek[], mod: SiralamaModu): Ornek[] {
  return [...liste].sort((a, b) => {
    const ta = a.oge.turetilmis ? 0 : 1;
    const tb = b.oge.turetilmis ? 0 : 1;
    if (ta !== tb) return ta - tb;
    if (mod === "saat" || a.oge.turetilmis) {
      const c = (a.oge.saat ?? "").localeCompare(b.oge.saat ?? "");
      if (c) return c;
    }
    return a.oge.sira - b.oge.sira || a.oge.id.localeCompare(b.oge.id);
  });
}

// Bir kapsayicidaki ogelerin yeni sirasi icin `sira` degerleri: mevcut degerler benzersizse
// onlar yeniden dagitilir (diger gorunumlerdeki goreli siralar bozulmaz); degilse en sona yeni degerler.
export function siraDegerleri(mevcut: number[], tumEnBuyuk: number): number[] {
  const sirali = [...mevcut].sort((a, b) => a - b);
  const benzersiz = new Set(sirali).size === sirali.length;
  return benzersiz ? sirali : sirali.map((_, i) => tumEnBuyuk + 1 + i);
}

// ---- Disa aktarma ----
const icsMetin = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const icsTarih = (g: string, saat: string | null) => g.replace(/-/g, "") + (saat ? `T${saat.replace(":", "")}00` : "");

export function icsUret(ogeler: Oge[]): string {
  const satirlar = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kokpit//Buro Takvimi//TR", "CALSCALE:GREGORIAN"];
  for (const o of ogeler) {
    if (o.turetilmis === "dogum") continue;
    const bitisGun = o.bitisTarihi ?? o.tarih;
    satirlar.push("BEGIN:VEVENT", `UID:${o.id.replace(/[^\w-]/g, "")}@kokpit`, `DTSTAMP:${icsTarih(gunStr(Date.now()), "00:00")}Z`);
    if (o.saat) {
      satirlar.push(`DTSTART;TZID=Europe/Istanbul:${icsTarih(o.tarih, o.saat)}`);
      satirlar.push(`DTEND;TZID=Europe/Istanbul:${icsTarih(bitisGun, o.bitisSaati ?? o.saat)}`);
    } else {
      satirlar.push(`DTSTART;VALUE=DATE:${icsTarih(o.tarih, null)}`, `DTEND;VALUE=DATE:${icsTarih(gunEkle(bitisGun, 1), null)}`);
    }
    satirlar.push(`SUMMARY:${icsMetin(o.baslik)}`);
    if (o.yer) satirlar.push(`LOCATION:${icsMetin(o.yer)}`);
    const aciklama = [o.meet && `Toplantı bağlantısı: ${o.meet}`, o.icerik].filter(Boolean).join("\n");
    if (aciklama) satirlar.push(`DESCRIPTION:${icsMetin(aciklama)}`);
    if (o.tekrar) {
      const f = { GUNLUK: "DAILY", HAFTALIK: "WEEKLY", AYLIK: "MONTHLY" }[o.tekrar];
      satirlar.push(`RRULE:FREQ=${f}${o.tekrarBitis ? `;UNTIL=${o.tekrarBitis.replace(/-/g, "")}` : ""}`);
    }
    satirlar.push("END:VEVENT");
  }
  satirlar.push("END:VCALENDAR");
  return satirlar.join("\r\n");
}

// Google Takvim'de "etkinlik ekle" sayfasini onceden doldurur (hesap baglantisi gerekmez).
export function googleTakvimBaglantisi(o: Oge): string {
  const bitisGun = o.bitisTarihi ?? o.tarih;
  const tarihler = o.saat
    ? `${icsTarih(o.tarih, o.saat)}/${icsTarih(bitisGun, o.bitisSaati ?? o.saat)}`
    : `${icsTarih(o.tarih, null)}/${icsTarih(gunEkle(bitisGun, 1), null)}`;
  const p = new URLSearchParams({ action: "TEMPLATE", text: o.baslik, dates: tarihler, ctz: "Europe/Istanbul" });
  const detay = [o.meet && `Toplantı bağlantısı: ${o.meet}`, o.icerik].filter(Boolean).join("\n");
  if (detay) p.set("details", detay);
  if (o.yer) p.set("location", o.yer);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
