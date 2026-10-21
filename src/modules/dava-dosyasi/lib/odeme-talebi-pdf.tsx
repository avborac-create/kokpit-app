import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import { LIBERATION_SANS_REGULAR, LIBERATION_SANS_BOLD } from "@/modules/haciz-raporu/lib/yazi-tipleri/liberation-sans";
import type { MasrafDokumuSatiri, TalepSatiri } from "@/modules/dava-dosyasi/lib/odeme-talebi";

Font.register({
  family: "Liberation Sans",
  fonts: [
    { src: LIBERATION_SANS_REGULAR, fontWeight: "normal" },
    { src: LIBERATION_SANS_BOLD, fontWeight: "bold" },
  ],
});

// Renk paleti: sade, acik gri zemin + tek vurgu rengi (Apple tarzi).
const R = { yazi: "#1D1D1F", ikincil: "#6E6E73", cizgi: "#D2D2D7", zemin: "#F5F5F7", vurgu: "#0071E3" };

const s = StyleSheet.create({
  sayfa: { padding: 48, fontSize: 10, fontFamily: "Liberation Sans", color: R.yazi },
  ustSatir: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  buro: { fontSize: 9, color: R.ikincil, letterSpacing: 0.6, marginBottom: 6 },
  baslik: { fontSize: 24, fontWeight: 700 },
  tarihKutu: { alignItems: "flex-end" },
  tarihEtiket: { fontSize: 8, color: R.ikincil },
  tarihDeger: { fontSize: 10, marginBottom: 6 },
  selam: { fontSize: 11, lineHeight: 1.5, marginBottom: 18 },
  ozetKart: { backgroundColor: R.zemin, borderRadius: 16, padding: 22, marginBottom: 26 },
  ozetEtiket: { fontSize: 10, color: R.ikincil, marginBottom: 6 },
  ozetTutar: { fontSize: 36, fontWeight: 700 },
  sonOdeme: { marginTop: 10, fontSize: 10, color: R.vurgu, fontWeight: 700 },
  bolumBaslik: { fontSize: 13, fontWeight: 700, marginBottom: 8 },
  satir: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: R.cizgi },
  satirSol: { flex: 1, paddingRight: 16 },
  satirBaslik: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  satirAciklama: { fontSize: 9, color: R.ikincil, lineHeight: 1.4 },
  satirTutar: { fontSize: 11, fontWeight: 700 },
  toplamSatir: { flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: R.yazi },
  dokumBaslik: { fontSize: 11, fontWeight: 700, marginTop: 24, marginBottom: 6 },
  dokumSatir: { flexDirection: "row", paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: R.cizgi, fontSize: 9 },
  dokumBaslikSatir: { flexDirection: "row", paddingBottom: 4, fontSize: 8, color: R.ikincil },
  odemeKart: { marginTop: 22, borderWidth: 1, borderColor: R.cizgi, borderRadius: 16, padding: 18 },
  odemeSatir: { flexDirection: "row", marginBottom: 5 },
  odemeEtiket: { width: 110, color: R.ikincil, fontSize: 9 },
  odemeDeger: { flex: 1, fontSize: 10 },
  not: { marginTop: 16, fontSize: 9, color: R.ikincil, lineHeight: 1.5 },
  altBilgi: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 8, color: R.ikincil, textAlign: "center" },
});

const paraBicim = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// "₺" gomulu fontta yok (bkz. haciz-raporu/lib/pdf.tsx); "TL" kullanilir.
const tl = (n: number) => `${paraBicim.format(n)} TL`;
const tarihYaz = (iso: string) => {
  const [y, a, g] = iso.slice(0, 10).split("-");
  return `${g}.${a}.${y}`;
};

export type OdemeTalebiVerisi = {
  musteriAdi: string;
  olusturmaTarihi: string; // ISO
  sonOdemeTarihi: string | null; // ISO
  satirlar: TalepSatiri[];
  masrafDokumu: MasrafDokumuSatiri[] | null;
  banka: string;
  iban: string;
  hesapSahibi: string;
  aciklamaKodu: string;
  not: string;
};

function OdemeTalebiBelgesi({ v }: { v: OdemeTalebiVerisi }) {
  const toplam = v.satirlar.reduce((t, x) => t + x.tutar, 0);
  const odemeBilgisiVar = v.banka || v.iban || v.hesapSahibi;

  return (
    <Document title="Hesap Özeti ve Ödeme Talebi">
      <Page size="A4" style={s.sayfa}>
        <View style={s.ustSatir}>
          <View>
            <Text style={s.buro}>ECES HUKUK BÜROSU</Text>
            <Text style={s.baslik}>Hesap Özeti ve{"\n"}Ödeme Talebi</Text>
          </View>
          <View style={s.tarihKutu}>
            <Text style={s.tarihEtiket}>Düzenlenme tarihi</Text>
            <Text style={s.tarihDeger}>{tarihYaz(v.olusturmaTarihi)}</Text>
          </View>
        </View>

        <Text style={s.selam}>
          Sayın {v.musteriAdi}, dosyalarınızla ilgili hesabınızın güncel durumu ve ödemenizi rica ettiğimiz tutar aşağıda
          özetlenmiştir.
        </Text>

        <View style={s.ozetKart}>
          <Text style={s.ozetEtiket}>Ödemeniz gereken toplam tutar</Text>
          <Text style={s.ozetTutar}>{tl(toplam)}</Text>
          {v.sonOdemeTarihi && <Text style={s.sonOdeme}>Son ödeme tarihi: {tarihYaz(v.sonOdemeTarihi)}</Text>}
        </View>

        <Text style={s.bolumBaslik}>Bu tutar ne için isteniyor?</Text>
        {v.satirlar.map((x, i) => (
          <View key={i} style={s.satir} wrap={false}>
            <View style={s.satirSol}>
              <Text style={s.satirBaslik}>{x.baslik}</Text>
              {x.aciklama ? <Text style={s.satirAciklama}>{x.aciklama}</Text> : null}
            </View>
            <Text style={s.satirTutar}>{tl(x.tutar)}</Text>
          </View>
        ))}
        <View style={s.toplamSatir}>
          <Text style={s.satirBaslik}>Toplam</Text>
          <Text style={s.satirBaslik}>{tl(toplam)}</Text>
        </View>

        {odemeBilgisiVar && (
          <View style={s.odemeKart} wrap={false}>
            <Text style={[s.bolumBaslik, { marginBottom: 10 }]}>Nasıl ödeyebilirsiniz?</Text>
            {v.hesapSahibi ? (
              <View style={s.odemeSatir}>
                <Text style={s.odemeEtiket}>Hesap sahibi</Text>
                <Text style={s.odemeDeger}>{v.hesapSahibi}</Text>
              </View>
            ) : null}
            {v.banka ? (
              <View style={s.odemeSatir}>
                <Text style={s.odemeEtiket}>Banka</Text>
                <Text style={s.odemeDeger}>{v.banka}</Text>
              </View>
            ) : null}
            {v.iban ? (
              <View style={s.odemeSatir}>
                <Text style={s.odemeEtiket}>IBAN</Text>
                <Text style={[s.odemeDeger, { fontWeight: 700 }]}>{v.iban}</Text>
              </View>
            ) : null}
            {v.aciklamaKodu ? (
              <View style={s.odemeSatir}>
                <Text style={s.odemeEtiket}>Açıklama kısmına yazın</Text>
                <Text style={[s.odemeDeger, { fontWeight: 700, color: R.vurgu }]}>{v.aciklamaKodu}</Text>
              </View>
            ) : null}
          </View>
        )}


        {v.masrafDokumu && v.masrafDokumu.length > 0 && (
          <View>
            <Text style={s.dokumBaslik}>Masraf dökümü</Text>
            <View style={s.dokumBaslikSatir}>
              <Text style={{ width: 62 }}>Tarih</Text>
              <Text style={{ width: 120 }}>Dosya</Text>
              <Text style={{ flex: 1 }}>Gider</Text>
              <Text style={{ width: 70, textAlign: "right" }}>Tutar</Text>
            </View>
            {v.masrafDokumu.map((m, i) => (
              <View key={i} style={s.dokumSatir} wrap={false}>
                <Text style={{ width: 62 }}>{tarihYaz(m.tarih)}</Text>
                <Text style={{ width: 120 }}>{m.dosya}</Text>
                <Text style={{ flex: 1 }}>
                  {m.tur}
                  {m.aciklama ? ` — ${m.aciklama}` : ""}
                </Text>
                <Text style={{ width: 70, textAlign: "right" }}>{tl(m.tutar)}</Text>
              </View>
            ))}
          </View>
        )}
        {v.not ? <Text style={s.not}>{v.not}</Text> : null}

        <Text style={s.altBilgi} fixed>
          Eces Hukuk Bürosu · Bu belge {tarihYaz(v.olusturmaTarihi)} tarihinde hazırlanmıştır.
        </Text>
      </Page>
    </Document>
  );
}

export async function odemeTalebiPdfUret(veri: OdemeTalebiVerisi): Promise<Buffer> {
  return renderToBuffer(<OdemeTalebiBelgesi v={veri} />);
}
