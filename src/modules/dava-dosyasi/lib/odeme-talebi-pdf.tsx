import { Document, Page, Text, View, Image, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import { LIBERATION_SANS_REGULAR, LIBERATION_SANS_BOLD } from "@/modules/haciz-raporu/lib/yazi-tipleri/liberation-sans";
import { BURO_LOGOSU } from "@/modules/dava-dosyasi/lib/varliklar/buro-logosu";
import type { MasrafDokumuSatiri, TalepSatiri } from "@/modules/dava-dosyasi/lib/odeme-talebi";

Font.register({
  family: "Liberation Sans",
  fonts: [
    { src: LIBERATION_SANS_REGULAR, fontWeight: "normal" },
    { src: LIBERATION_SANS_BOLD, fontWeight: "bold" },
  ],
});

// Renk paleti: sade, acik gri zemin + tek vurgu rengi (Apple tarzi). Puntolar
// A4 uzerinde rahat okunacak sekilde buyuk tutulur (govde 12 pt).
const R = { yazi: "#1D1D1F", ikincil: "#5F5F65", cizgi: "#D2D2D7", zemin: "#F5F5F7", vurgu: "#0071E3" };

const s = StyleSheet.create({
  sayfa: { paddingTop: 42, paddingBottom: 56, paddingHorizontal: 44, fontSize: 12, fontFamily: "Liberation Sans", color: R.yazi },
  ustSatir: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  logoBaslik: { flexDirection: "row", alignItems: "center" },
  logo: { width: 76, height: 76, marginRight: 16 },
  buro: { fontSize: 11, color: R.ikincil, letterSpacing: 0.8, marginBottom: 4 },
  baslik: { fontSize: 28, fontWeight: 700 },
  tarihKutu: { alignItems: "flex-end" },
  tarihEtiket: { fontSize: 10, color: R.ikincil },
  tarihDeger: { fontSize: 12, marginTop: 2 },
  selam: { fontSize: 13, lineHeight: 1.5, marginBottom: 18 },
  ozetKart: { backgroundColor: R.zemin, borderRadius: 16, padding: 22, marginBottom: 24 },
  ozetEtiket: { fontSize: 12, color: R.ikincil, marginBottom: 6 },
  ozetTutar: { fontSize: 42, fontWeight: 700 },
  sonOdeme: { marginTop: 10, fontSize: 13, color: R.vurgu, fontWeight: 700 },
  bolumBaslik: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  satir: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 11, borderTopWidth: 0.5, borderTopColor: R.cizgi },
  satirSol: { flex: 1, paddingRight: 16 },
  satirBaslik: { fontSize: 14, fontWeight: 700, marginBottom: 3 },
  satirAciklama: { fontSize: 11, color: R.ikincil, lineHeight: 1.4 },
  satirTutar: { fontSize: 14, fontWeight: 700 },
  toplamSatir: { flexDirection: "row", justifyContent: "space-between", paddingTop: 11, borderTopWidth: 1, borderTopColor: R.yazi },
  dokumBaslik: { fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 8 },
  dokumSatir: { flexDirection: "row", paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: R.cizgi, fontSize: 10.5 },
  dokumBaslikSatir: { flexDirection: "row", paddingBottom: 5, fontSize: 10, color: R.ikincil },
  odemeKart: { marginTop: 22, borderWidth: 1, borderColor: R.cizgi, borderRadius: 16, padding: 18 },
  odemeSatir: { flexDirection: "row", marginBottom: 6 },
  odemeEtiket: { width: 130, color: R.ikincil, fontSize: 11 },
  odemeDeger: { flex: 1, fontSize: 12 },
  not: { marginTop: 16, fontSize: 11.5, color: R.ikincil, lineHeight: 1.5 },
  altBilgi: { position: "absolute", bottom: 26, left: 44, right: 44, fontSize: 9.5, color: R.ikincil, textAlign: "center" },
});

const paraBicim = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// "₺" gomulu fontta yok (bkz. haciz-raporu/lib/pdf.tsx); "TL" kullanilir.
const tl = (n: number) => `${paraBicim.format(n)} TL`;
const adBicimle = (ad: string) =>
  ad
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toLocaleUpperCase("tr") + p.slice(1).toLocaleLowerCase("tr"))
    .join(" ");
const tarihYaz = (iso: string) => {
  const [y, a, g] = iso.slice(0, 10).split("-");
  return `${g}.${a}.${y}`;
};

export type OdemeTalebiVerisi = {
  musteriAdi: string;
  hitap: string; // "Bey" | "Hanım" | ""
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

function MuvekkilHesapOzeti({ v }: { v: OdemeTalebiVerisi }) {
  const toplam = v.satirlar.reduce((t, x) => t + x.tutar, 0);
  const odemeBilgisiVar = v.banka || v.iban || v.hesapSahibi;

  return (
    <Document title="Müvekkil Hesap Özeti">
      <Page size="A4" style={s.sayfa}>
        <View style={s.ustSatir}>
          <View style={s.logoBaslik}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={BURO_LOGOSU} style={s.logo} />
            <View>
              <Text style={s.buro}>ECES HUKUK BÜROSU</Text>
              <Text style={s.baslik}>Müvekkil Hesap Özeti</Text>
            </View>
          </View>
          <View style={s.tarihKutu}>
            <Text style={s.tarihEtiket}>Düzenlenme tarihi</Text>
            <Text style={s.tarihDeger}>{tarihYaz(v.olusturmaTarihi)}</Text>
          </View>
        </View>

        <Text style={s.selam}>
          Sayın {adBicimle(v.musteriAdi)}{v.hitap ? ` ${v.hitap}` : ""}, dosyalarınızla ilgili hesabınızın güncel durumu ve ödemenizi rica ettiğimiz tutar aşağıda
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
                <Text style={s.odemeEtiket}>Açıklamaya yazın</Text>
                <Text style={[s.odemeDeger, { fontWeight: 700, color: R.vurgu }]}>{v.aciklamaKodu}</Text>
              </View>
            ) : null}
          </View>
        )}

        {v.not ? <Text style={s.not}>{v.not}</Text> : null}

        {v.masrafDokumu && v.masrafDokumu.length > 0 && (
          <View>
            <Text style={s.dokumBaslik}>Masraf dökümü</Text>
            <View style={s.dokumBaslikSatir}>
              <Text style={{ width: 66 }}>Tarih</Text>
              <Text style={{ width: 128 }}>Dosya</Text>
              <Text style={{ flex: 1 }}>Gider</Text>
              <Text style={{ width: 82, textAlign: "right" }}>Tutar</Text>
            </View>
            {v.masrafDokumu.map((m, i) => (
              <View key={i} style={s.dokumSatir} wrap={false}>
                <Text style={{ width: 66 }}>{tarihYaz(m.tarih)}</Text>
                <Text style={{ width: 128 }}>{m.dosya}</Text>
                <Text style={{ flex: 1 }}>
                  {m.tur}
                  {m.aciklama ? ` — ${m.aciklama}` : ""}
                </Text>
                <Text style={{ width: 82, textAlign: "right" }}>{tl(m.tutar)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.altBilgi} fixed>
          Eces Hukuk Bürosu · Bu belge {tarihYaz(v.olusturmaTarihi)} tarihinde hazırlanmıştır.
        </Text>
      </Page>
    </Document>
  );
}

export async function odemeTalebiPdfUret(veri: OdemeTalebiVerisi): Promise<Buffer> {
  return renderToBuffer(<MuvekkilHesapOzeti v={veri} />);
}
