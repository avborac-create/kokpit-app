import { Alan, Etiket, Girdi, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { ParaGirdisi } from "@/core/ui/para-girdisi";

const bugun = () => new Date().toISOString().slice(0, 10);
const kutu = "glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4";

export type DosyaSecenegi = { id: string; etiket: string };

// Dosya secimi: dosya ekraninda (sabitDosyaId) gizli alan, muvekkil ekraninda secim kutusu.
function DosyaAlani({
  dosyalar,
  sabitDosyaId,
  bosSecenek,
  id,
}: {
  dosyalar: DosyaSecenegi[];
  sabitDosyaId?: string;
  bosSecenek?: string;
  id: string;
}) {
  if (sabitDosyaId) return <input type="hidden" name="dosyaId" value={sabitDosyaId} />;
  return (
    <Alan>
      <Etiket htmlFor={id}>Dosya</Etiket>
      <Secim id={id} name="dosyaId" required={!bosSecenek} defaultValue="">
        <option value="">{bosSecenek ?? "Seçiniz…"}</option>
        {dosyalar.map((d) => (
          <option key={d.id} value={d.id}>
            {d.etiket}
          </option>
        ))}
      </Secim>
    </Alan>
  );
}

// Para hesabi disindaki bir hesaba BORC (Akdi Vekalet vb.): dosyaya bagli.
export function BorcFormu({
  action,
  hesapId,
  dosyalar,
  sabitDosyaId,
  aciklamaIpucu,
}: {
  action: (formData: FormData) => void;
  hesapId: string;
  dosyalar: DosyaSecenegi[];
  sabitDosyaId?: string;
  aciklamaIpucu?: string;
}) {
  return (
    <form action={action} className={kutu}>
      <input type="hidden" name="hesapId" value={hesapId} />
      <DosyaAlani id="bf-dosya" dosyalar={dosyalar} sabitDosyaId={sabitDosyaId} />
      <Alan>
        <Etiket htmlFor="bf-tarih">Tarih</Etiket>
        <Girdi id="bf-tarih" name="tarih" type="date" required defaultValue={bugun()} />
      </Alan>
      <Alan>
        <Etiket htmlFor="bf-tutar">Borç Tutarı</Etiket>
        <ParaGirdisi id="bf-tutar" name="tutar" required />
      </Alan>
      <Alan>
        <Etiket htmlFor="bf-aciklama">Neye İstinaden</Etiket>
        <Girdi id="bf-aciklama" name="aciklama" placeholder={aciklamaIpucu ?? "ör. dosyanın hizmet bedeli"} />
      </Alan>
      <div className="flex items-end">
        <GonderButonu>Borç Ekle</GonderButonu>
      </div>
    </form>
  );
}

// Virman: Para Trafigi'nden bir dosyanin hesabina (iki tarafta da gorunur).
export function VirmanFormu({
  action,
  hedefler,
  sabitHedefId,
  dosyalar,
  sabitDosyaId,
  mevcutBakiye,
  kaynaklar,
}: {
  action: (formData: FormData) => void;
  hedefler: { id: string; etiket: string }[];
  sabitHedefId?: string;
  dosyalar: DosyaSecenegi[];
  sabitDosyaId?: string;
  mevcutBakiye: number;
  // Paranin nereden alinacagi: havuz / dosya para trafigi / baska bir hesaptaki fazla odeme.
  kaynaklar?: { deger: string; etiket: string }[];
}) {
  const tl = (n: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
  return (
    <form action={action} className={kutu}>
      {sabitHedefId ? (
        <input type="hidden" name="hedefHesapId" value={sabitHedefId} />
      ) : (
        <Alan>
          <Etiket htmlFor="vf-hedef">Hedef Hesap</Etiket>
          <Secim id="vf-hedef" name="hedefHesapId" required defaultValue="">
            <option value="" disabled>
              Seçiniz…
            </option>
            {hedefler.map((h) => (
              <option key={h.id} value={h.id}>
                {h.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      )}
      {kaynaklar && (
        <Alan>
          <Etiket htmlFor="vf-kaynak">Para Nereden</Etiket>
          <Secim id="vf-kaynak" name="kaynak" defaultValue={kaynaklar[0]?.deger}>
            {kaynaklar.map((k) => (
              <option key={k.deger} value={k.deger}>
                {k.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      )}
      <DosyaAlani id="vf-dosya" dosyalar={dosyalar} sabitDosyaId={sabitDosyaId} />
      <Alan>
        <Etiket htmlFor="vf-tarih">Tarih</Etiket>
        <Girdi id="vf-tarih" name="tarih" type="date" required defaultValue={bugun()} />
      </Alan>
      <Alan>
        <Etiket htmlFor="vf-tutar">
          Tutar{" "}
          {!kaynaklar && <span className="text-xs text-white/40">(aktarılabilir: {tl(mevcutBakiye)})</span>}
        </Etiket>
        <ParaGirdisi id="vf-tutar" name="tutar" required />
      </Alan>
      <div className="flex items-end">
        <GonderButonu>Virman Yap</GonderButonu>
      </div>
    </form>
  );
}

// Duzenleme (tarih / tutar / aciklama).
export function HareketDuzenlemeFormu({
  action,
  veri,
  yontemler,
}: {
  action: (formData: FormData) => void;
  veri: { tarih: string; tutar: number; aciklama: string; yontemId?: string };
  // Para Trafigi odemelerinde odeme sekli de degistirilebilir.
  yontemler?: { id: string; etiket: string }[];
}) {
  return (
    <form action={action} className={kutu}>
      <Alan>
        <Etiket htmlFor="hd-tarih">Tarih</Etiket>
        <Girdi id="hd-tarih" name="tarih" type="date" required defaultValue={veri.tarih} />
      </Alan>
      <Alan>
        <Etiket htmlFor="hd-tutar">Tutar</Etiket>
        <ParaGirdisi id="hd-tutar" name="tutar" required defaultValue={veri.tutar} />
      </Alan>
      <Alan>
        <Etiket htmlFor="hd-aciklama">Açıklama</Etiket>
        <Girdi id="hd-aciklama" name="aciklama" defaultValue={veri.aciklama} />
      </Alan>
      {yontemler && (
        <Alan>
          <Etiket htmlFor="hd-yontem">Ödeme Şekli</Etiket>
          <Secim id="hd-yontem" name="yontemId" defaultValue={veri.yontemId ?? ""}>
            <option value="">Belirtilmedi</option>
            {yontemler.map((y) => (
              <option key={y.id} value={y.id}>
                {y.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      )}
      <div className="flex items-end">
        <GonderButonu>Kaydet</GonderButonu>
      </div>
    </form>
  );
}

// Dosyalar arasi virman: bir dosyadaki hesaptan baska bir dosyadaki hesaba (ayni muvekkil).
export function DosyalarArasiVirmanFormu({
  action,
  dosyalar,
  hesaplar,
  sabitKaynakDosyaId,
}: {
  action: (formData: FormData) => void;
  dosyalar: DosyaSecenegi[];
  hesaplar: { id: string; etiket: string }[];
  sabitKaynakDosyaId?: string;
}) {
  return (
    <form action={action} className={kutu}>
      {sabitKaynakDosyaId ? (
        <input type="hidden" name="kaynakDosyaId" value={sabitKaynakDosyaId} />
      ) : (
        <Alan>
          <Etiket htmlFor="dav-kaynak-dosya">Kaynak Dosya (para buradan çıkar)</Etiket>
          <Secim id="dav-kaynak-dosya" name="kaynakDosyaId" required defaultValue="">
            <option value="" disabled>
              Seçiniz…
            </option>
            {dosyalar.map((d) => (
              <option key={d.id} value={d.id}>
                {d.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
      )}
      <Alan>
        <Etiket htmlFor="dav-kaynak-hesap">Kaynak Hesap</Etiket>
        <Secim id="dav-kaynak-hesap" name="kaynakHesapId" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {hesaplar.map((h) => (
            <option key={h.id} value={h.id}>
              {h.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="dav-hedef-dosya">Hedef Dosya (para buraya girer)</Etiket>
        <Secim id="dav-hedef-dosya" name="hedefDosyaId" required defaultValue="">
          <option value="" disabled>
            Seçiniz…
          </option>
          {dosyalar
            .filter((d) => d.id !== sabitKaynakDosyaId)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.etiket}
              </option>
            ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="dav-hedef-hesap">Hedef Hesap</Etiket>
        <Secim id="dav-hedef-hesap" name="hedefHesapId" defaultValue="">
          <option value="">Kaynak hesapla aynı</option>
          {hesaplar.map((h) => (
            <option key={h.id} value={h.id}>
              {h.etiket}
            </option>
          ))}
        </Secim>
      </Alan>
      <Alan>
        <Etiket htmlFor="dav-tutar">Tutar</Etiket>
        <ParaGirdisi id="dav-tutar" name="tutar" required />
      </Alan>
      <Alan>
        <Etiket htmlFor="dav-tarih">Tarih</Etiket>
        <Girdi id="dav-tarih" name="tarih" type="date" required defaultValue={bugun()} />
      </Alan>
      <Alan>
        <Etiket htmlFor="dav-aciklama">Açıklama (isteğe bağlı)</Etiket>
        <Girdi id="dav-aciklama" name="aciklama" placeholder="ör. avans dosyalar arası düzeltme" />
      </Alan>
      <div className="flex items-end">
        <GonderButonu>Dosyalar Arası Aktar</GonderButonu>
      </div>
    </form>
  );
}
