import { Fragment } from "react";
import Link from "next/link";
import { OnayliButon } from "@/core/ui/onayli-buton";
import { DefterGorunumSecici } from "@/modules/dava-dosyasi/components/ekonomi/defter-gorunum-secici";
import { TopluSecim } from "@/modules/dava-dosyasi/components/ekonomi/toplu-secim";
import { YerindeDuzenle } from "@/modules/dava-dosyasi/components/ekonomi/yerinde-duzenle";
import type { DefterSatiri } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { hareketSil, virmanSil } from "@/modules/dava-dosyasi/lib/cari-sistem-actions";
import { dosyaMasrafiSil, avansAktarimiSil } from "@/modules/dava-dosyasi/lib/actions";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarihBicimi = new Intl.DateTimeFormat("tr-TR");

function SilButonu({ satir }: { satir: DefterSatiri }) {
  const silme = satir.silme;
  if (!silme) return null;
  switch (silme.tip) {
    case "hareket":
      return (
        <OnayliButon sifreIste eylem={hareketSil.bind(null, silme.id)} mesaj="Bu kayıt silinsin mi?">
          Sil
        </OnayliButon>
      );
    case "virman":
      return (
        <OnayliButon sifreIste eylem={virmanSil.bind(null, silme.id)} mesaj="Bu virman (iki taraftaki kaydıyla birlikte) silinsin mi?">
          Sil
        </OnayliButon>
      );
    case "masraf":
      return (
        <OnayliButon
          sifreIste
          eylem={dosyaMasrafiSil.bind(null, silme.id, satir.dosyaId ?? "")}
          mesaj="Bu masraf kaydı silinsin mi?"
        >
          Sil
        </OnayliButon>
      );
    case "avansAktarimi":
      return (
        <OnayliButon
          sifreIste
          eylem={avansAktarimiSil.bind(null, silme.id, satir.dosyaId ?? "")}
          mesaj="Bu aktarım silinsin mi? Bakiyeler eski haline döner."
        >
          Sil
        </OnayliButon>
      );
  }
}

// Bakiye KAYITLARDAN hesaplanir: birikimli (running) ve toplam satiri her
// zaman satirlarin toplamidir - elle formul / satir siniri yoktur.
export function Defter({
  satirlar,
  paraHesabiMi,
  tutulanHesapMi = false,
  dosyaSutunu,
  silmeYetkisiVar,
  bosMesaj,
  yontemler,
  kompakt = false,
}: {
  // Ozet icinde alt veri gorunumu: kutusuz, kucuk punto, dar satir
  kompakt?: boolean;
  yontemler?: { id: string; etiket: string }[];
  satirlar: DefterSatiri[];
  paraHesabiMi: boolean;
  // Adliyede vb. tutulan para: bakiye = Alacak - Borc (orada duran tutar)
  tutulanHesapMi?: boolean;
  dosyaSutunu: boolean;
  silmeYetkisiVar: boolean;
  bosMesaj: string;
}) {
  if (satirlar.length === 0) return <p className="text-sm text-white/40">{bosMesaj}</p>;

  const tersBakiye = paraHesabiMi || tutulanHesapMi;
  const isaret = tersBakiye ? -1 : 1;
  const hesaplanan = satirlar.map((s, i) => ({
    ...s,
    bakiye: isaret * satirlar.slice(0, i + 1).reduce((t, x) => t + x.borc - x.alacak, 0) || 0,
    sira: i + 1,
  }));
  const birikim = hesaplanan[hesaplanan.length - 1].bakiye;
  const toplamBorc = satirlar.reduce((t, s) => t + s.borc, 0);
  const toplamAlacak = satirlar.reduce((t, s) => t + s.alacak, 0);
  const renk = (b: number) =>
    tersBakiye ? (b > 0 ? "text-[#6db8ff]" : "text-white/60") : b > 0 ? "text-[#ff7a70]" : b < 0 ? "text-[#32d74b]" : "text-white/60";

  const Sarmal = silmeYetkisiVar ? TopluSecim : Fragment;
  type Satir = (typeof hesaplanan)[number];
  const ay = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
  const gunAy = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  // Tek "tutar": hesabin kendi bakiye yonunde artis +, azalis -.
  const tutarOf = (s: { borc: number; alacak: number }) => (tersBakiye ? s.alacak - s.borc : s.borc - s.alacak);
  // Giren/odenen yesil, cikan/borclanan kirmizi.
  const iyiMi = (t: number) => (tersBakiye ? t > 0 : t < 0);
  const tutarRenk = (t: number) => (t === 0 ? "text-white/60" : iyiMi(t) ? "text-[#32d74b]" : "text-[#ff7a70]");
  const tutarYaz = (t: number) => `${t > 0 ? "+" : t < 0 ? "−" : ""}${para.format(Math.abs(t))}`;
  const virmanMi = (s: Satir) => s.aciklama.startsWith("VİRMAN");
  const simge = (s: Satir) =>
    virmanMi(s) || s.turetilmis
      ? { m: "⇄", c: "bg-violet-500/25" }
      : iyiMi(tutarOf(s))
        ? { m: "↓", c: "bg-[#32d74b]/20" }
        : { m: "↑", c: "bg-[#ff7a70]/20" };

  const islemler = (s: Satir) => {
    const duzenleBolumu =
      s.duzenle && (s.duzenle.tip === "hareket" || silmeYetkisiVar) ? (
        <YerindeDuzenle duzenle={s.duzenle} yontemler={paraHesabiMi ? yontemler : undefined} />
      ) : (
        s.duzenleHref && (
          <Link href={s.duzenleHref} className="text-xs text-[#6db8ff] hover:underline">
            Düzenle
          </Link>
        )
      );
    const silBolumu = silmeYetkisiVar && s.silme ? <SilButonu satir={s} /> : null;
    if (!duzenleBolumu && !silBolumu) return null;
    // Düzenle / Sil her zaman görünür (gizli menü yok); dar ekranda alt satıra sarar.
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 [&_button]:rounded-md [&_button]:border [&_button]:border-white/20 [&_button]:px-2.5 [&_button]:py-1 [&_button]:text-xs [&_a]:rounded-md [&_a]:border [&_a]:border-white/20 [&_a]:px-2.5 [&_a]:py-1">
        {duzenleBolumu}
        {silBolumu}
      </div>
    );
  };
  const kutu = (s: Satir) =>
    silmeYetkisiVar && s.duzenle ? (
      <input
        type="checkbox"
        data-toplu={`${s.duzenle.tip}:${s.duzenle.id}`}
        aria-label="Kaydı seç"
        className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)] opacity-30 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      />
    ) : null;
  const etiketler = (s: Satir) => (
    <>
      {s.borcludan && <span className="ml-2 whitespace-nowrap rounded-full bg-[#ffb340]/15 px-2 py-0.5 text-[11px] text-[#ffb340]">Karşı taraftan</span>}
      {s.odemeYontemi && <span className="ml-2 whitespace-nowrap rounded-full bg-[#6db8ff]/15 px-2 py-0.5 text-[11px] text-[#6db8ff]">{s.odemeYontemi}</span>}
    </>
  );
  const altBilgi = (s: Satir) => `${gunAy.format(s.tarih)}${dosyaSutunu ? ` · ${s.dosyaEtiketi ?? "havuz"}` : ""}`;
  const kalanSatiri = (
    <div className="mx-1 mt-3 flex items-center justify-between text-sm">
      <span className="text-white/55">{tutulanHesapMi ? "Şu an duran tutar" : paraHesabiMi ? "Kalan (dağıtılmamış para)" : "Kalan"}</span>
      <span className={`font-semibold tabular-nums ${renk(birikim)}`}>{para.format(birikim)}</span>
    </div>
  );

  // Gorunumler bir siralamayla uretilir: varsayilan eskiden yeniye (yeni kayit altta), istege bagli tersi.
  const goster = (liste: Satir[]) => {
  // A) Akis: ay basliklari altinda yuvarlak simgeli satirlar
  const aylar: { baslik: string; satirlar: Satir[] }[] = [];
  for (const s of liste) {
    const b = ay.format(s.tarih);
    const son = aylar[aylar.length - 1];
    if (son && son.baslik === b) son.satirlar.push(s);
    else aylar.push({ baslik: b, satirlar: [s] });
  }
  const akis = (
    <div className={kompakt ? "" : "glass rounded-2xl p-3"}>
      {aylar.map((a) => (
        <div key={a.baslik} className="mb-2">
          <p className="mx-1 mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">{a.baslik}</p>
          <div className="rounded-2xl bg-white/[0.05] px-2.5">
            {a.satirlar.map((s) => {
              const t = tutarOf(s);
              const ik = simge(s);
              return (
                <div key={s.id} className={`group flex flex-col gap-1.5 border-t border-white/[0.07] py-2.5 first:border-t-0 sm:flex-row sm:items-center sm:gap-2.5 ${s.turetilmis ? "italic opacity-70" : ""}`}>
                  {/* Telefonda iki satir: ustte simge + aciklama, altta tutar + islemler; genis ekranda tek satir */}
                  <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
                    {kutu(s)}
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${ik.c}`} aria-hidden>
                      {ik.m}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block whitespace-pre-line break-words text-[13px] leading-snug text-white/90">
                        {s.aciklama}
                        {etiketler(s)}
                      </span>
                      <span className="block text-[11px] text-white/45">{altBilgi(s)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pl-[2.75rem] sm:contents sm:pl-0">
                    <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${tutarRenk(t)}`}>{tutarYaz(t)}</span>
                    {islemler(s)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {kalanSatiri}
    </div>
  );

  // E) Gosterge: uc kadran + kenari renkli satirlar
  const yuzde = (pay: number, bolen: number) => (bolen > 0 ? Math.max(0, Math.min(100, (pay / bolen) * 100)) : 0);
  const kisalt = (n: number) => (Math.abs(n) >= 1000 ? `${(Math.abs(n) / 1000).toFixed(1).replace(".0", "")}B` : String(Math.round(Math.abs(n))));
  const kadranlar = tersBakiye
    ? [
        { e: tutulanHesapMi ? "Giren" : "Gelen", v: toplamAlacak, p: 100, c: "#32d74b" },
        { e: tutulanHesapMi ? "İade" : "Dağıtılan", v: toplamBorc, p: yuzde(toplamBorc, toplamAlacak), c: "#ff7a70" },
        { e: "Kalan", v: birikim, p: yuzde(birikim, toplamAlacak), c: "#1c69d4" },
      ]
    : [
        { e: "Borçlandırılan", v: toplamBorc, p: 100, c: "#ff7a70" },
        { e: "Ödenen", v: toplamAlacak, p: yuzde(toplamAlacak, toplamBorc), c: "#32d74b" },
        { e: "Kalan", v: birikim, p: yuzde(birikim, toplamBorc), c: "#1c69d4" },
      ];
  const gosterge = (
    <div className={kompakt ? "" : "glass rounded-2xl p-3"}>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {kadranlar.map((k) => (
          <div key={k.e} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2.5 text-center">
            <div className="mx-auto mb-1.5 grid h-11 w-11 place-items-center rounded-full" style={{ background: `conic-gradient(${k.c} 0 ${k.p}%, rgb(255 255 255 / 0.12) 0)` }}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--background-2)] text-[10px] font-bold">{kisalt(k.v)}</span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--link)]">{k.e}</p>
            <p className="text-xs font-semibold tabular-nums">{para.format(k.v)}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {liste.map((s) => {
          const t = tutarOf(s);
          const kenar = virmanMi(s) || s.turetilmis ? "#8b5cf6" : iyiMi(t) ? "#32d74b" : "#ff7a70";
          return (
            <div key={s.id} className={`group flex flex-col gap-1.5 rounded-md border-l-[3px] bg-white/[0.05] px-2.5 py-2 sm:flex-row sm:items-center sm:gap-2.5 ${s.turetilmis ? "italic opacity-70" : ""}`} style={{ borderLeftColor: kenar }}>
              <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
                {kutu(s)}
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--link)]">{altBilgi(s)}</span>
                  <span className="block whitespace-pre-line break-words text-[13px] leading-snug text-white/90">
                    {s.aciklama}
                    {etiketler(s)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:contents">
                <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${tutarRenk(t)}`}>{tutarYaz(t)}</span>
                {islemler(s)}
              </div>
            </div>
          );
        })}
      </div>
      {kalanSatiri}
    </div>
  );

  const tablo = (
      <div className={kompakt ? "overflow-x-auto" : "glass overflow-x-auto rounded-2xl"}>
        <table className={kompakt ? "w-full text-left text-[13px] [&_td:not(.dar)]:!px-2 [&_td]:!py-1.5 [&_th:not(.dar)]:!px-2 [&_th]:!py-1.5 md:[&_td:not(.dar)]:!px-3 md:[&_th:not(.dar)]:!px-3" : "w-full text-left text-sm"}>
          <thead className="text-white/50">
            <tr>
              {silmeYetkisiVar && <th className={`dar py-3 ${kompakt ? "w-5 px-1" : "w-8 px-3"}`} />}
              <th className={`dar py-3 text-right font-medium text-white/50 ${kompakt ? "w-5 px-1 text-[11px]" : "w-10 px-2"}`}>{kompakt ? "#" : "Sıra"}</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              {dosyaSutunu && <th className="px-4 py-3 font-medium">Dosya</th>}
              <th className="px-4 py-3 font-medium">Açıklama</th>
              <th className="px-4 py-3 text-right font-medium text-[#ff7a70]/85">Borç</th>
              <th className="px-4 py-3 text-right font-medium text-[#32d74b]/85">Alacak</th>
              <th className="px-4 py-3 text-right font-medium">Bakiye</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {liste.map((s) => (
              <tr key={s.id} className={`border-t border-white/[0.06] ${s.turetilmis ? "italic opacity-70" : ""}`}>
                {silmeYetkisiVar && (
                  <td className={`dar py-3 ${kompakt ? "w-5 px-1" : "w-8 px-3"}`}>
                    {s.duzenle && (
                      <input
                        type="checkbox"
                        data-toplu={`${s.duzenle.tip}:${s.duzenle.id}`}
                        aria-label="Kaydı seç"
                        className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
                      />
                    )}
                  </td>
                )}
                <td className={`dar py-3 text-right text-xs tabular-nums text-white/45 ${kompakt ? "w-5 px-1" : "w-10 px-2"}`}>{s.sira}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white/60">{tarihBicimi.format(s.tarih)}</td>
                {dosyaSutunu && (
                  <td className="px-4 py-3">
                    {s.dosyaEtiketi ? (
                      <span className="whitespace-nowrap rounded-full bg-white/[0.07] px-2.5 py-0.5 text-xs text-white/75">
                        {s.dosyaEtiketi}
                      </span>
                    ) : (
                      <span className="text-xs text-white/35">havuz</span>
                    )}
                  </td>
                )}
                <td className={`px-4 py-3 text-white/85 ${kompakt ? "min-w-[12rem]" : ""}`}>
                  <span className="whitespace-pre-line">{s.aciklama}</span>
                  {s.borcludan && (
                    <span className="ml-2 whitespace-nowrap rounded-full bg-[#ffb340]/15 px-2 py-0.5 text-[11px] text-[#ffb340]">
                      Karşı taraftan
                    </span>
                  )}
                  {s.odemeYontemi && (
                    <span className="ml-2 whitespace-nowrap rounded-full bg-[#6db8ff]/15 px-2 py-0.5 text-[11px] text-[#6db8ff]">
                      {s.odemeYontemi}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-white/85">{s.borc > 0 ? para.format(s.borc) : "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-white/85">{s.alacak > 0 ? para.format(s.alacak) : "—"}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${renk(s.bakiye)}`}>{para.format(s.bakiye)}</td>
                <td className="px-4 py-3">
                  <div className={`flex items-center justify-end gap-2 ${kompakt ? "[&_button]:!px-2 [&_button]:!py-0.5 [&_button]:!text-[11px]" : ""}`}>
                    {s.duzenle && (s.duzenle.tip === "hareket" || silmeYetkisiVar) ? (
                      <YerindeDuzenle duzenle={s.duzenle} yontemler={paraHesabiMi ? yontemler : undefined} />
                    ) : (
                      s.duzenleHref && (
                        <Link href={s.duzenleHref} className="text-xs text-[#6db8ff] hover:underline">
                          Düzenle
                        </Link>
                      )
                    )}
                    {silmeYetkisiVar && <SilButonu satir={s} />}
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t border-white/10 font-medium">
              <td className="px-4 py-3 text-white" colSpan={(dosyaSutunu ? 4 : 3) + (silmeYetkisiVar ? 1 : 0)}>
                Toplam
              </td>
              <td className="px-4 py-3 text-right text-white">{para.format(toplamBorc)}</td>
              <td className="px-4 py-3 text-right text-white">{para.format(toplamAlacak)}</td>
              <td className={`px-4 py-3 text-right ${renk(birikim)}`}>{para.format(birikim)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
  );
  return { akis, gosterge, tablo };
  };
  const eski = goster(hesaplanan);
  const ters = kompakt ? eski : goster([...hesaplanan].reverse());
  return (
    <div>
      <Sarmal>
        {kompakt ? (
          eski.tablo
        ) : (
          <DefterGorunumSecici akis={eski.akis} gosterge={eski.gosterge} tablo={eski.tablo} tersAkis={ters.akis} tersGosterge={ters.gosterge} tersTablo={ters.tablo} />
        )}
      </Sarmal>
      <p className="mt-2 text-xs text-white/35">
        {tutulanHesapMi
          ? "Bakiye = Alacak − Borç (bu hesapta/adliyede şu an duran tutar; iade edilince Borç olarak düşer)."
          : paraHesabiMi
          ? "Bakiye = Alacak − Borç (müvekkilin henüz dağıtılmamış parası)."
          : "Bakiye = Borç − Alacak (müvekkilin bu hesaptaki kalan borcu; eksi ise fazla ödeme)."}
      </p>
    </div>
  );
}
