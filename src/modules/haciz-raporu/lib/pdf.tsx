import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import type { hacizRaporuGetir } from "./queries";
import {
  HACIZ_ISLEMI_DURUMU_ETIKETLERI,
  TEMINAT_MUVAFAKAT_ETIKETLERI,
} from "./sabitler";
import { LIBERATION_SANS_REGULAR, LIBERATION_SANS_BOLD } from "./yazi-tipleri/liberation-sans";

type HacizRaporuDetay = NonNullable<Awaited<ReturnType<typeof hacizRaporuGetir>>>;

// react-pdf'in varsayilan Helvetica'si Turkce karakterleri (İ, ı, Ş, Ç
// vb.) ve Turk Lirasi isaretini (₺) DOGRU BASAMAZ (bkz. yazi-tipleri/
// liberation-sans.ts) - bu yuzden Latin Extended + Turkce destegi olan
// Liberation Sans gomulu font olarak kaydedilir.
Font.register({
  family: "Liberation Sans",
  fonts: [
    { src: LIBERATION_SANS_REGULAR, fontWeight: "normal" },
    { src: LIBERATION_SANS_BOLD, fontWeight: "bold" },
  ],
});

const stiller = StyleSheet.create({
  sayfa: { padding: 36, fontSize: 10, fontFamily: "Liberation Sans" },
  baslik: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  altBaslik: { fontSize: 10, color: "#555", marginBottom: 16 },
  bolum: { marginBottom: 12 },
  bolumBaslik: { fontSize: 11, fontWeight: 700, marginBottom: 4, borderBottom: 1, borderBottomColor: "#ccc", paddingBottom: 2 },
  satir: { flexDirection: "row", marginBottom: 3 },
  etiket: { width: 160, color: "#555" },
  deger: { flex: 1 },
  tabloBaslikSatiri: { flexDirection: "row", borderBottom: 1, borderBottomColor: "#999", paddingBottom: 2, marginBottom: 2 },
  tabloSatiri: { flexDirection: "row", paddingVertical: 2 },
  tabloHucre: { flex: 1 },
});

const tarihFormatlayici = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
// "₺" sembolu DEGIL: gomulu font (Liberation Sans) bu glifi icermiyor,
// PDF'te bozuk bir karaktere donusuyor. "TL" eki Turkce resmi
// evraklarda da yaygin, hicbir font bagimliligi olmadan calisir.
const paraFormatlayici = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function paraBicimlendir(tutar: number): string {
  return `${paraFormatlayici.format(tutar)} TL`;
}

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <View style={stiller.satir}>
      <Text style={stiller.etiket}>{etiket}</Text>
      <Text style={stiller.deger}>{deger}</Text>
    </View>
  );
}

export function HacizRaporuBelgesi({ rapor }: { rapor: HacizRaporuDetay }) {
  const muvekkiller = rapor.davaDosyasi.muvekkiller.map((m) => m.musteri.adSoyadUnvan).join(", ") || "—";

  return (
    <Document>
      <Page size="A4" style={stiller.sayfa}>
        <Text style={stiller.baslik}>HACİZ RAPORU</Text>
        <Text style={stiller.altBaslik}>
          {rapor.davaDosyasi.dosyaNo ? `${rapor.davaDosyasi.dosyaNo} — ` : ""}
          {rapor.davaDosyasi.konu}
        </Text>

        <View style={stiller.bolum}>
          <Text style={stiller.bolumBaslik}>Genel Bilgiler</Text>
          <Satir etiket="Avukat" deger={rapor.avukat.adSoyad} />
          <Satir etiket="Haciz Tarihi" deger={tarihFormatlayici.format(rapor.hacizTarihi)} />
          <Satir etiket="Müvekkil(ler)" deger={muvekkiller} />
          <Satir etiket="Dosya No" deger={rapor.davaDosyasi.dosyaNo ?? "—"} />
        </View>

        <View style={stiller.bolum}>
          <Text style={stiller.bolumBaslik}>İşlem Bilgileri</Text>
          <Satir etiket="İşlem Yapılan Borçlular" deger={rapor.islemYapilanBorclular} />
          <Satir
            etiket="İrtibat Numaraları"
            deger={rapor.irtibatNumaralari.length > 0 ? rapor.irtibatNumaralari.join(", ") : "—"}
          />
        </View>

        <View style={stiller.bolum}>
          <Text style={stiller.bolumBaslik}>Haciz İşlemi Detayları</Text>
          <View style={stiller.tabloBaslikSatiri}>
            <Text style={stiller.tabloHucre} />
            <Text style={stiller.tabloHucre}>Durum</Text>
          </View>
          <View style={stiller.tabloSatiri}>
            <Text style={stiller.tabloHucre}>Muhafaza</Text>
            <Text style={stiller.tabloHucre}>{HACIZ_ISLEMI_DURUMU_ETIKETLERI[rapor.muhafazaDurumu]}</Text>
          </View>
          <View style={stiller.tabloSatiri}>
            <Text style={stiller.tabloHucre}>İstihkak</Text>
            <Text style={stiller.tabloHucre}>{HACIZ_ISLEMI_DURUMU_ETIKETLERI[rapor.istihkakDurumu]}</Text>
          </View>
          <View style={stiller.tabloSatiri}>
            <Text style={stiller.tabloHucre}>Kıymet Takdiri</Text>
            <Text style={stiller.tabloHucre}>{HACIZ_ISLEMI_DURUMU_ETIKETLERI[rapor.kiymetTakdiriDurumu]}</Text>
          </View>
        </View>

        <View style={stiller.bolum}>
          <Text style={stiller.bolumBaslik}>Teminat ve Tahsilat</Text>
          <Satir
            etiket="Teminat İadesine Muvafakat"
            deger={TEMINAT_MUVAFAKAT_ETIKETLERI[rapor.teminatIadesineMuvafakat]}
          />
          <Satir etiket="Tahsilat Miktarı" deger={paraBicimlendir(Number(rapor.tahsilatMiktari))} />
          <Satir etiket="Tahsilat Kanalı" deger={rapor.tahsilatKanali?.etiket ?? "—"} />
          <Satir etiket="Protokol Yapıldı mı" deger={rapor.protokolYapildiMi ? "Evet" : "Protokol Yapılmadı"} />
        </View>

        {rapor.avukatGorusu && (
          <View style={stiller.bolum}>
            <Text style={stiller.bolumBaslik}>Avukat Görüşü</Text>
            <Text>{rapor.avukatGorusu}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function hacizRaporuPdfUret(rapor: HacizRaporuDetay): Promise<Buffer> {
  return renderToBuffer(<HacizRaporuBelgesi rapor={rapor} />);
}
