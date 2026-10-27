// Metin biçimi kuralları (kullanıcı onaylı, bkz. src/core/db/metin-duzeni.ts):
//  - baslikDuzeni: kişi/kurum/mahkeme-birim adları. Her kelimenin ilk harfi büyük,
//    kalanı küçük; bağlaçlar küçük; kısaltmalar ve numaralar korunur.
//  - cumleDuzeni: not ve açıklamalar. Yalnızca cümle başı büyük yapılır, geri
//    kalan harflere dokunulmaz (TBK, Ankara gibi yazımlar bozulmasın).
// Türkçe İ/ı dönüşümü için her yerde "tr-TR" yerel ayarı kullanılır.

const TR = "tr-TR";

// Küçük kalacak bağlaçlar (cümlenin/adın ilk kelimesi değilse).
const BAGLACLAR = new Set(["ve", "ile", "veya", "yahut", "ya", "da", "de", "ki", "ama", "fakat", "ancak", "lakin"]);

// Her zaman tamamı büyük yazılacak kısaltmalar (noktasız, büyük harfli hâliyle).
// Yeni bir kısaltma gerekirse buraya eklenir.
const KORUNAN_KISALTMALAR = new Set([
  "TC", "AŞ", "TBK", "HMK", "İİK", "CMK", "TCK", "TMK", "TTK", "İYUK", "SGK", "KDV", "AYM",
  "UYAP", "PTT", "TBMM", "SMMM", "YMM", "TL", "ÖTV", "MTV", "VKN", "TCKN", "KEP", "BDDK", "SPK", "ATM", "ASM", "TTOK", "QNB", "DYG",
]);

const buyut = (s: string) => s.toLocaleUpperCase(TR);
const kucult = (s: string) => s.toLocaleLowerCase(TR);

function ilkHarfiBuyut(s: string): string {
  const ilk = Array.from(s)[0] ?? "";
  return buyut(ilk) + kucult(s.slice(ilk.length));
}

// Tek bir kelime parçasını (tire/bölü içermeyen) biçimlendirir.
function parcaDuzenle(parca: string, ilkKelimeMi: boolean): string {
  if (!parca) return parca;
  const noktasiz = parca.replace(/\./g, "");

  // Baş harfler: "M", "M.", "A.Ş.", "M.A." -> tamamı büyük
  if (/^(\p{L}\.)+$/u.test(parca) || /^\p{L}$/u.test(parca)) return buyut(parca);
  // Bilinen kısaltmalar: "a.ş.", "tc", "kdv" -> büyük
  if (KORUNAN_KISALTMALAR.has(buyut(noktasiz))) return buyut(parca);

  // Kesme işaretinden sonrası ek: "ankara'DA" -> "Ankara'da"
  const kesme = parca.search(/['’]/);
  if (kesme > 0) {
    return parcaDuzenle(parca.slice(0, kesme), ilkKelimeMi) + parca[kesme] + kucult(parca.slice(kesme + 1));
  }

  if (!ilkKelimeMi && BAGLACLAR.has(kucult(parca))) return kucult(parca);
  return ilkHarfiBuyut(parca);
}

// Bir "kelime"yi (boşluksuz parça) baştaki/sondaki noktalamayı koruyarak düzenler.
function kelimeDuzenle(kelime: string, ilkKelimeMi: boolean): string {
  // "10.ASLİYE" gibi sıra numarasına bitişik yazılmış kelime: numara korunur, kalanı düzenlenir.
  const sira = kelime.match(/^(\d+\.)(\p{L}.*)$/u);
  if (sira) return sira[1] + kelimeDuzenle(sira[2], false);
  // Rakam, e-posta, adres, yol/kod içeren parçalara dokunulmaz (2026/412, KP-0025, a@b.com).
  if (/[\d@\\_]|:\/\//.test(kelime)) return kelime;
  if (!/\p{L}/u.test(kelime)) return kelime;

  const eslesme = kelime.match(/^([("'“‘[]*)(.*?)([)"'”’\],;:!?]*)$/u);
  if (!eslesme) return kelime;
  const [, bas, cekirdek, son] = eslesme;
  if (!cekirdek) return kelime;

  // Tire ve bölü ile birleşik adlar: "ayşe-nur", "ankara/kızılay" -> her parça ayrı
  const parcalar = cekirdek.split(/([-/])/);
  const duzgun = parcalar
    .map((p, i) => (p === "-" || p === "/" ? p : parcaDuzenle(p, ilkKelimeMi && i === 0)))
    .join("");
  return bas + duzgun + son;
}

export function baslikDuzeni(metin: string): string {
  if (!metin.trim()) return metin;
  let ilkKelimeGecildi = false;
  return metin
    .split(/(\s+)/)
    .map((parca) => {
      if (!parca || /^\s+$/.test(parca)) return parca;
      const sonuc = kelimeDuzenle(parca, !ilkKelimeGecildi);
      ilkKelimeGecildi = true;
      return sonuc;
    })
    .join("");
}

// Metnin başındaki kelime sayı/e-posta/kod gibi görünüyorsa (KP-0025 numaralı...)
// ilk harfe dokunulmaz.
function kodGibiMi(kelime: string) {
  return /[\d@\\_/]|:\/\//.test(kelime);
}

export function cumleDuzeni(metin: string): string {
  if (!metin.trim()) return metin;

  // 1) Metnin başı: baştaki boşluk/noktalamadan sonraki ilk harf büyür.
  const bas = metin.match(/^([^\p{L}\d]*)(\p{L})/u);
  const ilkKelime = metin.trim().split(/\s+/)[0] ?? "";
  let sonuc = metin;
  if (bas && !kodGibiMi(ilkKelime)) {
    const [tam, onEk, harf] = bas;
    sonuc = onEk + buyut(harf) + metin.slice(tam.length);
  }

  // 2) Yeni satır başları ve "!" "?" sonrası.
  sonuc = sonuc.replace(/([\n!?][ \t]*)(\p{L})/gu, (_m, onEk: string, harf: string) => onEk + buyut(harf));

  // 3) "Dört+ harfli kelime" + nokta + boşluk sonrası yeni cümle. "Av. Ali", "No. 5" gibi
  //    kısaltma noktaları (3 harf ve altı) yeni cümle sayılmaz.
  sonuc = sonuc.replace(
    /(\p{L}{4,}\.)(\s+)(\p{L}\p{L}*)/gu,
    (_m, onEk: string, bosluk: string, kelime: string) => onEk + bosluk + buyut(kelime[0]) + kelime.slice(1),
  );
  return sonuc;
}
