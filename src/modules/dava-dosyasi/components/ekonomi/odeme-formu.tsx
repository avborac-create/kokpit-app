"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { DosyaSecici } from "@/core/ui/dosya-secici";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { SecenekDuzenleyiciPenceresi } from "@/core/secenek/secenek-duzenleyici-penceresi";
import type { DosyaSecenegi } from "@/modules/dava-dosyasi/components/ekonomi/formlar";

type Yontem = { id: string; etiket: string };
type Satir = { anahtar: number; yontemId: string };
type VirmanSatiri = { anahtar: number; hedef: string; tutar: string };

const PARCALI = "__parcali__";
const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

// Para geldi: Para Trafigi'ne ALACAK.
//  - "Odeme sekli": Nakit / Banka / (admin'in ekledigi diger yontemler) ya da
//  - "Parcali odeme": istenen sayida satir (yontem + tutar) - her satir ayri kayit olur.
// Muvekkil ekraninda dosya bos birakilabilir (muvekkil havuzu).
export function OdemeFormu({
  action,
  dosyalar,
  sabitDosyaId,
  yontemler,
  yontemListesi,
  hedefler = [],
}: {
  action: (formData: FormData) => void;
  dosyalar: DosyaSecenegi[];
  sabitDosyaId?: string;
  yontemler: Yontem[];
  // Aynı anda virman için hedef hesaplar (Para Trafiği dışındakiler).
  hedefler?: { id: string; etiket: string }[];
  // Sadece yonetici: yontem listesini yerinde duzenleme penceresi
  yontemListesi?: {
    id: string;
    degerler: { id: string; kod: string; etiket: string; aktifMi: boolean; maktuTutar: number | null }[];
  };
}) {
  const [sekil, setSekil] = useState<string>(yontemler[0]?.id ?? PARCALI);
  const [satirlar, setSatirlar] = useState<Satir[]>([
    { anahtar: 1, yontemId: yontemler[0]?.id ?? "" },
    { anahtar: 2, yontemId: yontemler[1]?.id ?? yontemler[0]?.id ?? "" },
  ]);
  const [tutarlar, setTutarlar] = useState<Record<number, number>>({});
  const [virman, setVirman] = useState(false);
  const varsayilanHedef = hedefler.find((h) => /akdi vekalet/i.test(h.etiket))?.id ?? hedefler[0]?.id ?? "";
  const parcaliMi = sekil === PARCALI;
  const [tekTutar, setTekTutar] = useState(0);
  const toplam = parcaliMi ? satirlar.reduce((t, s) => t + (tutarlar[s.anahtar] ?? 0), 0) : tekTutar;
  const [virmanlar, setVirmanlar] = useState<VirmanSatiri[]>([{ anahtar: 1, hedef: varsayilanHedef, tutar: "" }]);
  const ayrilan = virmanlar.reduce((t, v) => t + (Number(v.tutar) || 0), 0);
  const kalan = Math.round((toplam - ayrilan) * 100) / 100;
  const harcamaHedefi = hedefler.find((h) => /harcama/i.test(h.etiket))?.id ?? varsayilanHedef;
  const kalaniEkle = () =>
    setVirmanlar((o) => {
      const kalanKayit = Math.round((toplam - o.reduce((t, v) => t + (Number(v.tutar) || 0), 0)) * 100) / 100;
      const kullanilan = new Set(o.map((v) => v.hedef));
      const hedef = [harcamaHedefi, ...hedefler.map((h) => h.id)].find((id) => !kullanilan.has(id)) ?? harcamaHedefi;
      return [...o, { anahtar: Math.max(...o.map((x) => x.anahtar)) + 1, hedef, tutar: kalanKayit > 0 ? String(kalanKayit) : "" }];
    });
  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
      {sabitDosyaId ? (
        <input type="hidden" name="dosyaId" value={sabitDosyaId} />
      ) : (
        <Alan>
          <Etiket htmlFor="od-dosya">Dosya</Etiket>
          <DosyaSecici id="od-dosya" name="dosyaId" dosyalar={dosyalar} bosSecenek="Dosyasız (müvekkil havuzu)" />
        </Alan>
      )}
      <Alan>
        <Etiket htmlFor="od-tarih">Tarih</Etiket>
        <Girdi id="od-tarih" name="tarih" type="date" required defaultValue={bugun} />
      </Alan>
      <Alan>
        <div className="flex items-center justify-between gap-2">
          <Etiket htmlFor="od-sekil">Ödeme Şekli</Etiket>
          {yontemListesi && (
            <SecenekDuzenleyiciPenceresi listeId={yontemListesi.id} baslik="Ödeme Yöntemi" degerler={yontemListesi.degerler} />
          )}
        </div>
        <Secim id="od-sekil" value={sekil} onChange={(e) => setSekil(e.target.value)}>
          {yontemler.map((y) => (
            <option key={y.id} value={y.id}>
              {y.etiket}
            </option>
          ))}
          <option value={PARCALI}>Parçalı ödeme (birden fazla yöntem)</option>
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="od-kaynak">Para Kimden Geldi</Etiket>
        <Secim id="od-kaynak" name="paraKaynagi" defaultValue="muvekkil">
          <option value="muvekkil">Müvekkilden</option>
          <option value="borclu">Karşı taraftan (tahsilat)</option>
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="od-aciklama">Açıklama</Etiket>
        <Girdi id="od-aciklama" name="aciklama" defaultValue="GELEN ÖDEME" />
      </Alan>

      {parcaliMi ? (
        <div className="col-span-1 sm:col-span-2 md:col-span-4">
          <p className="mb-2 text-sm text-white/60">
            Her satıra ödeme yöntemini ve o yöntemle alınan tutarı girin (ör. bir kısmı nakit, bir kısmı banka).
          </p>
          <div className="space-y-2">
            {satirlar.map((s, i) => (
              <div key={s.anahtar} className="flex flex-wrap items-end gap-2">
                <div className="w-48">
                  {i === 0 && <Etiket>Yöntem</Etiket>}
                  <Secim
                    name="yontemId"
                    value={s.yontemId}
                    onChange={(e) =>
                      setSatirlar((onceki) => onceki.map((x) => (x.anahtar === s.anahtar ? { ...x, yontemId: e.target.value } : x)))
                    }
                  >
                    {yontemler.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.etiket}
                      </option>
                    ))}
                  </Secim>
                </div>
                <div className="w-48">
                  {i === 0 && <Etiket>Tutar</Etiket>}
                  <ParaGirdisi
                    name="tutar"
                    required
                    onDegerDegisti={(v) => setTutarlar((onceki) => ({ ...onceki, [s.anahtar]: Number(v) || 0 }))}
                  />
                </div>
                {satirlar.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setSatirlar((onceki) => onceki.filter((x) => x.anahtar !== s.anahtar))}
                    className="mb-1 rounded-full px-2 text-lg text-[#ff7a70] hover:bg-white/10"
                    title="Satırı kaldır"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() =>
                setSatirlar((onceki) => [
                  ...onceki,
                  { anahtar: Math.max(...onceki.map((x) => x.anahtar)) + 1, yontemId: yontemler[0]?.id ?? "" },
                ])
              }
              className="text-xs text-[#6db8ff] hover:underline"
            >
              + Yöntem satırı ekle
            </button>
            <span className="text-sm text-white/70">
              Toplam: <b className="text-white">{para.format(toplam)}</b>
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Tek yontem: secilen yontem gizli alanla gonderilir */}
          <input type="hidden" name="yontemId" value={sekil} />
          <Alan>
            <Etiket htmlFor="od-tutar">Tutar</Etiket>
            <ParaGirdisi key="tek" id="od-tutar" name="tutar" required onDegerDegisti={(v) => setTekTutar(Number(v) || 0)} />
          </Alan>
        </>
      )}

      {hedefler.length > 0 && (
        <div className="col-span-1 border-t border-white/10 pt-3 sm:col-span-2 md:col-span-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-white">
            <input type="checkbox" name="virman" value="1" checked={virman} onChange={(e) => setVirman(e.target.checked)} className="onay-kutusu" />
            Anında virman yap
          </label>
          {virman && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-white/50">
                Gelen parayı kuruşu kuruşuna birden fazla hesaba bölebilirsiniz (ör. bir kısmı Akdi Vekalet, bir kısmı Harcama). Virman, ödemeyle aynı tarihte yapılır; dosya seçili olmalıdır. Para önce Para Trafiği’ne girer, sonra seçilen hesaplara geçer.
              </p>
              {virmanlar.map((v, i) => (
                <div key={v.anahtar} className="rounded-xl border border-white/10 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-white/60">
                    <span>{virmanlar.length > 1 ? `${i + 1}. virman` : "Virman"}</span>
                    {virmanlar.length > 1 && (
                      <button type="button" onClick={() => setVirmanlar((o) => o.filter((x) => x.anahtar !== v.anahtar))} className="rounded-full px-2 text-lg text-[#ff7a70] hover:bg-white/10" title="Satırı kaldır">
                        ×
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Alan>
                      <Etiket>Hedef Hesap</Etiket>
                      <Secim name="virmanHedefId" value={v.hedef} onChange={(e) => setVirmanlar((o) => o.map((x) => (x.anahtar === v.anahtar ? { ...x, hedef: e.target.value } : x)))} required>
                        {hedefler.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.etiket}
                          </option>
                        ))}
                      </Secim>
                    </Alan>
                    <Alan>
                      <Etiket>Virman Tutarı</Etiket>
                      <ParaGirdisi
                        name="virmanTutari"
                        defaultValue={v.tutar}
                        onDegerDegisti={(d) => setVirmanlar((o) => o.map((x) => (x.anahtar === v.anahtar ? { ...x, tutar: d } : x)))}
                      />
                      {virmanlar.length === 1 && <span className="mt-1 block text-xs text-white/45">Boş bırakırsanız ödemenin tamamı aktarılır.</span>}
                    </Alan>
                    <Alan>
                      <Etiket>Hedef hesabı da borçlandır</Etiket>
                      <ParaGirdisi name="virmanBorcu" />
                      <span className="mt-1 block text-xs text-white/45">İsteğe bağlı; ayrı bir borç kaydı olarak yazılır.</span>
                    </Alan>
                  </div>
                </div>
              ))}

              {toplam > 0 && !(virmanlar.length === 1 && !virmanlar[0].tutar) && (
                <div
                  className={`rounded-xl border p-3 text-sm ${
                    kalan < -0.005 ? "border-red-400/50 bg-red-400/10 text-red-200" : kalan > 0.005 ? "border-amber-400/40 bg-amber-400/10 text-amber-100" : "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                  }`}
                >
                  <p>
                    Gelen ödeme <b>{para.format(toplam)}</b> · virmana ayrılan <b>{para.format(ayrilan)}</b>
                  </p>
                  {kalan > 0.005 && (
                    <p className="mt-1">
                      Virman yapabileceğiniz <b>{para.format(kalan)}</b> kaldı. Ayırmazsanız bu tutar Para Trafiği’nde durur.
                      <button type="button" onClick={kalaniEkle} className="ml-2 font-medium underline">
                        Kalanı başka hesaba ayır
                      </button>
                    </p>
                  )}
                  {kalan < -0.005 && <p className="mt-1">Virman toplamı gelen ödemeden {para.format(-kalan)} fazla; kaydedilemez.</p>}
                  {Math.abs(kalan) <= 0.005 && <p className="mt-1">Ödemenin tamamı dağıtıldı.</p>}
                </div>
              )}
              {toplam > 0 && virmanlar.length === 1 && !virmanlar[0].tutar && (
                <p className="text-xs text-white/50">Tutar boş: ödemenin tamamı ({para.format(toplam)}) bu hesaba aktarılacak. Bölmek için tutar yazın.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-end">
        <GonderButonu>{virman ? "Ödemeyi Ekle ve Virman Yap" : "Ödemeyi Ekle"}</GonderButonu>
      </div>
    </form>
  );
}
