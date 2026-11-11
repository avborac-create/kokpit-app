"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  CARI_GORUNUM_SECENEKLERI as SECENEK,
  GENISLIK_MAX,
  GENISLIK_MIN,
  type CariGorunum,
  type CariGorunumAlani,
} from "@/modules/dava-dosyasi/lib/cari-gorunum";
import { cariGorunumBuroVarsayilaniYap, cariGorunumKaydet, cariGorunumSifirla } from "@/modules/dava-dosyasi/lib/cari-gorunum-actions";
import s from "./cari-hesap-gezgini.module.css";

export type GezginHesap = {
  anahtar: string;
  no: number;
  ad: string;
  href: string;
  borc: number;
  alacak: number;
  // Rozette gosterilen (mutlak) bakiye; renk: kirmizi = bize odenmesi gereken, yesil = bizde duran para / fazla odeme.
  bakiye: number;
  renk?: "kirmizi" | "yesil";
  bos: boolean;
};
export type GezginGrup = {
  kod: "m" | "k" | "a";
  no: number;
  ad: string;
  ozetAnahtar: string;
  ozetAd: string;
  ozetHref: string;
  hesaplar: GezginHesap[];
};

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");
const GRUP_SINIFI = { m: s.gm, k: s.gk, a: s.ga } as const;

const YERLESIM_IPUCU: Record<CariGorunum["yerlesim"], string> = {
  kutular: "Solda grup adı, sağda hesaplar; bütün kutular aynı genişlikte ve alt alta hizalı. Her satıra sığdığı kadar kutu dizilir.",
  sutun: "Üç grup yan yana, eşit genişlikte; hesaplar alt alta, tutarlar sağda.",
  izgara: "Her grup tam genişlikte bir bant; hesaplar eşit kutular hâlinde dizilir.",
  sekme: "Üstte üç eşit düğme; altında yalnız seçili grubun hesapları. En az yer kaplayan düzen.",
  tablo: "Klasik hesap planı: No, hesap adı, borç, alacak, bakiye sütunları.",
  klasik: "Önceki düzen: kutular yazı uzunluğuna göre farklı genişlikte.",
};
const GENISLIK_IPUCU: Record<CariGorunum["genislik"], string> = {
  oto2: "Genişliği sistem belirler: en uzun hesap adı en çok iki satıra sığacak kadar. Yeni, daha uzun adlı hesap eklenirse kutular birlikte genişler.",
  oto1: "Genişliği sistem belirler: en uzun hesap adı tek satıra sığacak kadar.",
  elle: "Genişlik sabit kalır; sığmayan uzun adlar alt satıra iner.",
};
const BASLIK_IPUCU: Record<CariGorunum["baslik"], string> = {
  yazi: "Grup adı, numarası, net tutar ve “Özet ›” düz yazı olarak durur.",
  kutu: "Başlık grup renginde bir kutudur; tıklanabilir olduğu açıkça belli olur.",
  kart: "Küçük bir kart: üstte grup adı, altında büyük puntoyla net tutar.",
  serit: "Başlık hesapların üstüne boydan boya çıkar; soldaki sütun kalkar.",
  sade: "Yalnız grup adı görünür; ada tıklayınca özet açılır.",
};

export function CariHesapGezgini({
  gruplar,
  aktif,
  tercih: ilkTercih,
  kisiselMi: ilkKisiselMi,
  buroTercihi: ilkBuroTercihi,
  yoneticiMi,
}: {
  gruplar: GezginGrup[];
  aktif: string;
  tercih: CariGorunum;
  kisiselMi: boolean;
  buroTercihi: CariGorunum;
  yoneticiMi: boolean;
}) {
  const router = useRouter();
  const [t, setT] = useState(ilkTercih);
  const [kisiselMi, setKisiselMi] = useState(ilkKisiselMi);
  const [buroTercihi, setBuroTercihi] = useState(ilkBuroTercihi);
  const [panelAcik, setPanelAcik] = useState(false);
  const [buroOnayi, setBuroOnayi] = useState(false);
  const [acilanGruplar, setAcilanGruplar] = useState<string[]>([]);
  const [olculenGenislik, setOlculenGenislik] = useState<number | null>(null);
  const [bekliyor, gecis] = useTransition();
  const olcerRef = useRef<HTMLDivElement>(null);

  const aktifGrup = gruplar.find((g) => g.ozetAnahtar === aktif || g.hesaplar.some((h) => h.anahtar === aktif)) ?? gruplar[0];
  const [sekmeGrubu, setSekmeGrubu] = useState<string | null>(null);
  const gorunenGrup = gruplar.find((g) => g.kod === sekmeGrubu) ?? aktifGrup;

  const kutulu = t.yerlesim === "kutular" || t.yerlesim === "izgara" || t.yerlesim === "sekme";
  const baslikBicimiGecerli = t.ozet === "baslik" && t.yerlesim !== "tablo" && t.yerlesim !== "sekme";

  const kaydet = (yeni: CariGorunum) => gecis(() => cariGorunumKaydet(yeni));
  const degistir = <A extends CariGorunumAlani>(alan: A, deger: CariGorunum[A]) => {
    const yeni = { ...t, [alan]: deger };
    setT(yeni);
    setKisiselMi(true);
    setBuroOnayi(false);
    kaydet(yeni);
  };

  const gorunenHesaplar = (g: GezginGrup) => {
    if (t.bos !== "gizle" || acilanGruplar.includes(g.kod)) return { liste: g.hesaplar, gizli: 0 };
    const liste = g.hesaplar.filter((h) => !h.bos || h.anahtar === aktif);
    return { liste, gizli: g.hesaplar.length - liste.length };
  };
  // Grup neti: kirmizi (bize odenmesi gereken) eksi yesil (bizde duran / fazla odeme).
  const grupNeti = (g: GezginGrup) => Math.round(g.hesaplar.reduce((n, h) => n + (h.renk === "kirmizi" ? h.bakiye : h.renk === "yesil" ? -h.bakiye : 0), 0) * 100) / 100;

  // Otomatik kutu genisligi: en uzun hesap adina gore olculur.
  const olcumAnahtari = `${t.genislik}|${t.ad}|${t.bakiye}|${t.yogunluk}|${t.ozet}|${t.bos}|${kutulu}|${gruplar.map((g) => g.hesaplar.map((h) => h.ad + h.bakiye).join("~")).join("#")}`;
  useLayoutEffect(() => {
    if (!kutulu || t.genislik === "elle") return;
    const olc = () => {
      const kok = olcerRef.current;
      if (!kok) return;
      let enGenis = 0;
      kok.querySelectorAll<HTMLElement>("[data-it]").forEach((it) => {
        const w1 = it.getBoundingClientRect().width;
        const n = it.querySelector<HTMLElement>("[data-nm]")?.getBoundingClientRect().width ?? 0;
        const mw = (it.nextElementSibling as HTMLElement | null)?.getBoundingClientRect().width ?? 0;
        enGenis = Math.max(enGenis, t.genislik === "oto1" ? w1 : w1 - n + Math.max(n * 0.58 + 6, mw));
      });
      if (enGenis > 0) setOlculenGenislik(Math.ceil(enGenis) + 1);
    };
    olc();
    let iptal = false;
    document.fonts?.ready.then(() => !iptal && olc());
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [olcumAnahtari]);

  const adParcasi = (no: number, ad: string): ReactNode =>
    t.ad === "ad" ? (
      <span className={s.nm} data-nm>{ad}</span>
    ) : t.ad === "tire" ? (
      <span className={s.nm} data-nm>{no} - {ad}</span>
    ) : (
      <>
        <span className={s.no}>{no}</span>
        <span className={s.nm} data-nm>{ad}</span>
      </>
    );
  const adMetni = (no: number, ad: string) => (t.ad === "tire" ? `${no} - ${ad}` : ad);
  const rozet = (tutar: number, renk?: "kirmizi" | "yesil"): ReactNode =>
    t.bakiye === "yok" ? null : tutar === 0 || !renk ? (
      t.bakiye === "hepsi" ? <span className={cx(s.bl, s.sifir)}>{para.format(0)}</span> : null
    ) : (
      <span className={cx(s.bl, renk === "kirmizi" ? s.kirmizi : s.yesil)}>{para.format(tutar)}</span>
    );
  const netRozeti = (g: GezginGrup): ReactNode => {
    const n = grupNeti(g);
    return rozet(Math.abs(n), n > 0 ? "kirmizi" : n < 0 ? "yesil" : undefined);
  };
  const netYazisi = (g: GezginGrup): ReactNode => {
    if (t.bakiye === "yok") return null;
    const n = grupNeti(g);
    return <span className={cx(s.gt, n === 0 && s.sifir)} style={n ? { color: `var(--${n > 0 ? "kirmizi" : "yesil"})` } : undefined}>{para.format(Math.abs(n))}</span>;
  };

  const hesapOgesi = (h: GezginHesap) => (
    <Link key={h.anahtar} href={h.href} scroll={false} className={cx(s.it, h.anahtar === aktif && s.on, h.bos && t.bos !== "goster" && s.dim)} aria-current={h.anahtar === aktif ? "page" : undefined}>
      {adParcasi(h.no, h.ad)}
      {rozet(h.bakiye, h.renk)}
    </Link>
  );
  const ozetOgesi = (g: GezginGrup, altMi: boolean) => (
    <Link key={g.ozetAnahtar} href={g.ozetHref} scroll={false} className={cx(s.it, s.oz, altMi && s.ozAlt, g.ozetAnahtar === aktif && s.on)} aria-current={g.ozetAnahtar === aktif ? "page" : undefined}>
      {adParcasi(g.no, g.ozetAd)}
      {netRozeti(g)}
    </Link>
  );
  const ogeler = (g: GezginGrup) => {
    const { liste, gizli } = gorunenHesaplar(g);
    return (
      <div className={s.rows}>
        {t.ozet === "ilk" && ozetOgesi(g, false)}
        {liste.map(hesapOgesi)}
        {gizli > 0 && (
          <button type="button" className={s.more} onClick={() => setAcilanGruplar((a) => [...a, g.kod])}>
            + {gizli} hareketsiz hesap
          </button>
        )}
        {t.ozet === "alt" && ozetOgesi(g, true)}
      </div>
    );
  };
  const grupBasligi = (g: GezginGrup) => {
    const ic = (
      <>
        <span className={s.gn}>{g.ad}</span>
        <span className={s.gkod}>{g.no}</span>
      </>
    );
    if (t.ozet !== "baslik") return <div className={s.gh}>{ic}</div>;
    const bicim = { yazi: undefined, kutu: s.bKutu, kart: s.bKart, serit: s.bSerit, sade: undefined }[t.baslik];
    return (
      <Link href={g.ozetHref} scroll={false} className={cx(s.gh, bicim, g.ozetAnahtar === aktif && s.on)} aria-current={g.ozetAnahtar === aktif ? "page" : undefined} title={`${g.no} - ${g.ozetAd}`}>
        {t.baslik === "sade" ? (
          ic
        ) : t.baslik === "kart" ? (
          <>
            <span className={s.g1}>{ic}</span>
            {netYazisi(g)}
            <span className={s.go}>Özeti aç ›</span>
          </>
        ) : (
          <>
            {ic}
            {netYazisi(g)}
            <span className={s.go}>Özet ›</span>
          </>
        )}
      </Link>
    );
  };

  const tutarHucresi = (n: number) => (n ? para.format(n) : <span className={s.yok}>—</span>);
  const tablo = () => (
    <div className={s.tw}>
      <table className={s.hp}>
        <thead>
          <tr>
            <th>No</th>
            <th>Hesap</th>
            <th className={s.r}>Borç</th>
            <th className={s.r}>Alacak</th>
            <th className={s.r}>Bakiye</th>
          </tr>
        </thead>
        <tbody>
          {gruplar.map((g) => {
            const { liste, gizli } = gorunenHesaplar(g);
            const tb = g.hesaplar.reduce((x, h) => x + h.borc, 0);
            const ta = g.hesaplar.reduce((x, h) => x + h.alacak, 0);
            const net = grupNeti(g);
            const netSinifi = net > 0 ? s.tKirmizi : net < 0 ? s.tYesil : undefined;
            const ozetSatiri = (
              <tr key={g.ozetAnahtar} className={cx(s.tik, s.ozSatir, g.ozetAnahtar === aktif && s.secili)} onClick={() => router.push(g.ozetHref, { scroll: false })}>
                <td className={s.c0}>{g.no}</td>
                <td>
                  <Link href={g.ozetHref} scroll={false} onClick={(e) => e.stopPropagation()}>
                    {t.ozet === "alt" ? "Toplam — " : ""}
                    {g.ozetAd}
                  </Link>
                </td>
                <td className={s.r}>{tutarHucresi(tb)}</td>
                <td className={s.r}>{tutarHucresi(ta)}</td>
                <td className={cx(s.r, netSinifi)}>{tutarHucresi(Math.abs(net))}</td>
              </tr>
            );
            return [
              t.ozet === "baslik" ? (
                <tr key={`g${g.kod}`} className={cx(s.gs, s.grp, GRUP_SINIFI[g.kod], s.tik, g.ozetAnahtar === aktif && s.secili)} onClick={() => router.push(g.ozetHref, { scroll: false })}>
                  <th colSpan={2}>
                    <Link href={g.ozetHref} scroll={false} onClick={(e) => e.stopPropagation()}>
                      {g.no} · {g.ad} <span>— özet ›</span>
                    </Link>
                  </th>
                  <th className={s.r}>{tutarHucresi(tb)}</th>
                  <th className={s.r}>{tutarHucresi(ta)}</th>
                  <th className={cx(s.r, netSinifi)}>{tutarHucresi(Math.abs(net))}</th>
                </tr>
              ) : (
                <tr key={`g${g.kod}`} className={cx(s.gs, s.grp, GRUP_SINIFI[g.kod])}>
                  <th colSpan={5}>
                    {g.no} · {g.ad}
                  </th>
                </tr>
              ),
              t.ozet === "ilk" ? ozetSatiri : null,
              ...liste.map((h) => (
                <tr key={h.anahtar} className={cx(s.tik, h.bos && t.bos !== "goster" && s.dimSatir, h.anahtar === aktif && s.secili)} onClick={() => router.push(h.href, { scroll: false })}>
                  <td className={s.c0}>{h.no}</td>
                  <td>
                    <Link href={h.href} scroll={false} onClick={(e) => e.stopPropagation()}>
                      {h.ad}
                    </Link>
                  </td>
                  <td className={s.r}>{tutarHucresi(h.borc)}</td>
                  <td className={s.r}>{tutarHucresi(h.alacak)}</td>
                  <td className={cx(s.r, h.renk === "kirmizi" ? s.tKirmizi : h.renk === "yesil" ? s.tYesil : undefined)}>{tutarHucresi(h.bakiye)}</td>
                </tr>
              )),
              gizli > 0 ? (
                <tr key={`m${g.kod}`} className={cx(s.tik, s.dimSatir)} onClick={() => setAcilanGruplar((a) => [...a, g.kod])}>
                  <td className={s.c0} />
                  <td colSpan={4}>+ {gizli} hareketsiz hesap</td>
                </tr>
              ) : null,
              t.ozet === "alt" ? ozetSatiri : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );

  const yerlesimSinifi = { kutular: s.layKutular, sutun: s.laySutun, izgara: s.layIzgara, sekme: s.laySekme, tablo: "", klasik: s.layKlasik }[t.yerlesim];
  const govde =
    t.yerlesim === "tablo" ? (
      tablo()
    ) : t.yerlesim === "sekme" ? (
      <>
        <div className={s.seg}>
          {gruplar.map((g) => {
            const ic = (
              <>
                <span className={s.gn}>
                  {g.ad} · {g.no}
                </span>
                {netYazisi(g)}
              </>
            );
            const sinif = cx(s.sg, s.grp, GRUP_SINIFI[g.kod], g.kod === gorunenGrup.kod && s.on);
            return t.ozet === "baslik" ? (
              <Link key={g.kod} href={g.ozetHref} scroll={false} className={sinif} onClick={() => setSekmeGrubu(null)}>
                {ic}
              </Link>
            ) : (
              <button key={g.kod} type="button" className={sinif} onClick={() => setSekmeGrubu(g.kod)}>
                {ic}
              </button>
            );
          })}
        </div>
        <div className={cx(s.laySekme, s.grp, GRUP_SINIFI[gorunenGrup.kod])}>{ogeler(gorunenGrup)}</div>
      </>
    ) : (
      <div className={cx(yerlesimSinifi, baslikBicimiGecerli && t.baslik === "serit" && s.bbSerit)}>
        {gruplar.map((g) => (
          <section key={g.kod} className={cx(s.grp, GRUP_SINIFI[g.kod])}>
            {grupBasligi(g)}
            {ogeler(g)}
          </section>
        ))}
      </div>
    );

  const secenekGrubu = <A extends CariGorunumAlani>(alan: A, baslik: string, ipucu?: string, ek?: ReactNode) => (
    <fieldset className={s.fs}>
      <legend>{baslik}</legend>
      <div className={s.opts}>
        {(SECENEK[alan] as readonly (readonly [string, string])[]).map(([deger, etiket]) => (
          <button key={deger} type="button" className={s.opt} aria-pressed={t[alan] === deger} onClick={() => degistir(alan, deger as CariGorunum[A])}>
            {etiket}
          </button>
        ))}
      </div>
      {ek}
      {ipucu && <p className={s.hint}>{ipucu}</p>}
    </fieldset>
  );

  return (
    <div className={s.chg} data-yog={t.yogunluk} data-renk={t.renk} style={{ ["--w" as string]: `${t.genislik === "elle" ? t.genislikPx : (olculenGenislik ?? t.genislikPx)}px` }}>
      <div className={s.ust}>
        <button type="button" className={s.gorunumDugme} aria-expanded={panelAcik} onClick={() => setPanelAcik((a) => !a)}>
          <span aria-hidden>⚙</span> Görünüm
        </button>
      </div>

      {panelAcik && (
        <div className={s.panel}>
          <div className={s.panelIzgara}>
            {secenekGrubu("yerlesim", "Yerleşim", YERLESIM_IPUCU[t.yerlesim])}
            {kutulu &&
              secenekGrubu(
                "genislik",
                "Kutu genişliği",
                GENISLIK_IPUCU[t.genislik],
                t.genislik === "elle" ? (
                  <div className={s.rng}>
                    <input
                      type="range"
                      min={GENISLIK_MIN}
                      max={GENISLIK_MAX}
                      step={5}
                      value={t.genislikPx}
                      aria-label="Kutu genişliği"
                      onChange={(e) => {
                        setT({ ...t, genislikPx: Number(e.target.value) });
                        setKisiselMi(true);
                      }}
                      onPointerUp={() => kaydet(t)}
                      onKeyUp={() => kaydet(t)}
                    />
                    <output>{t.genislikPx} px</output>
                  </div>
                ) : undefined,
              )}
            {secenekGrubu("ozet", "Özet hesabı (100 / 200 / 300) nerede dursun")}
            {t.ozet === "baslik" && secenekGrubu("baslik", "Grup başlığı biçimi", baslikBicimiGecerli ? BASLIK_IPUCU[t.baslik] : "Bu yerleşimde grup başlığı sekme ya da tablo satırıdır; bu ayar onu etkilemez.")}
            {secenekGrubu("bakiye", "Bakiye gösterimi")}
            {secenekGrubu("ad", "Hesap adı biçimi", t.yerlesim === "tablo" ? "Tabloda numara ayrı sütundadır; bu ayar tabloyu etkilemez." : undefined)}
            {secenekGrubu("bos", "Hareketsiz hesaplar")}
            {secenekGrubu("yogunluk", "Yoğunluk")}
            {secenekGrubu("renk", "Grup renkleri")}
          </div>
          <div className={s.panelAlt}>
            <span className={s.bos}>
              {kisiselMi ? "Kendi görünümünüzü kullanıyorsunuz; yalnız sizin ekranınızı etkiler." : "Büro varsayılanını görüyorsunuz. Bir ayarı değiştirirseniz yalnız sizin ekranınız değişir."}
            </span>
            {kisiselMi && (
              <button
                type="button"
                className={s.dugme}
                disabled={bekliyor}
                onClick={() => {
                  setT(buroTercihi);
                  setKisiselMi(false);
                  setBuroOnayi(false);
                  gecis(() => cariGorunumSifirla());
                }}
              >
                Büro varsayılanına dön
              </button>
            )}
            {yoneticiMi &&
              (buroOnayi ? (
                <>
                  <span>Kendi ayarını değiştirmemiş herkesin ekranı bu görünüme geçer.</span>
                  <button
                    type="button"
                    className={cx(s.dugme, s.dugmeAna)}
                    disabled={bekliyor}
                    onClick={() => {
                      setBuroTercihi(t);
                      setKisiselMi(false);
                      setBuroOnayi(false);
                      gecis(() => cariGorunumBuroVarsayilaniYap(t));
                    }}
                  >
                    Onayla
                  </button>
                  <button type="button" className={s.dugme} onClick={() => setBuroOnayi(false)}>
                    Vazgeç
                  </button>
                </>
              ) : (
                <button type="button" className={s.dugme} disabled={bekliyor} onClick={() => setBuroOnayi(true)}>
                  Bu görünümü büro varsayılanı yap
                </button>
              ))}
            <button type="button" className={s.dugme} onClick={() => setPanelAcik(false)}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {govde}

      {kutulu && t.genislik !== "elle" && (
        <div ref={olcerRef} className={s.olcer} aria-hidden>
          {gruplar.flatMap((g) => [
            ...(t.ozet === "baslik" ? [] : [{ k: g.ozetAnahtar, no: g.no, ad: g.ozetAd, r: netRozeti(g) }]),
            ...g.hesaplar.map((h) => ({ k: h.anahtar, no: h.no, ad: h.ad, r: rozet(h.bakiye, h.renk) })),
          ]).map((o) => [
            <span key={o.k} data-it className={s.it}>
              {adParcasi(o.no, o.ad)}
              {o.r}
            </span>,
            <span key={`${o.k}-mc`} className={s.olcMc}>
              {adMetni(o.no, o.ad)}
            </span>,
          ])}
        </div>
      )}
    </div>
  );
}
