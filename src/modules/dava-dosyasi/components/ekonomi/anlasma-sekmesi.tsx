import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { OnayliButon } from "@/core/ui/onayli-buton";
import { ParaGirdisi } from "@/core/ui/para-girdisi";
import { SecenekDuzenleyiciPenceresi } from "@/core/secenek/secenek-duzenleyici-penceresi";
import { secenekleriGetir } from "@/core/secenek/secenek-service";
import { anlasmaGetir, dosyaAnlasmalari, etkinAnlasma, kdvliTutar } from "@/modules/dava-dosyasi/lib/anlasma";
import { secenekListesiTumDegerlerle } from "@/modules/dava-dosyasi/lib/cari-sistem";
import { anlasmaAkdiVekaleteYaz, anlasmaKaydet, anlasmaSil } from "@/modules/dava-dosyasi/lib/anlasma-actions";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const tarih = new Intl.DateTimeFormat("tr-TR");
const kdvYazi = (dahil: boolean | null, oran: number) =>
  dahil === true ? "KDV dahil" : dahil === false ? `KDV hariç (+%${oran})` : "KDV belirtilmedi";

// Muvekkil ile buro arasindaki ucret anlasmasi (hizmet bedeli, KDV, odeme plani, masraf yuku).
// Muvekkil ekraninda: muvekkilin GENEL anlasmasi (dosyalar icin varsayilan) + dosyalara ozel olanlar.
// Dosya ekraninda: o dosyaya OZEL anlasma; yoksa muvekkil genel anlasmasi gecerlidir.
export async function AnlasmaSekmesi({
  musteriId,
  dosyaId,
  silmeYetkisiVar,
}: {
  musteriId: string;
  dosyaId?: string;
  silmeYetkisiVar: boolean;
}) {
  const [odemeSekilleri, masrafSorumlulari, odemeListesi, masrafListesi] = await Promise.all([
    secenekleriGetir("anlasma_odeme_sekli"),
    secenekleriGetir("anlasma_masraf_sorumlusu"),
    silmeYetkisiVar ? secenekListesiTumDegerlerle("anlasma_odeme_sekli") : null,
    silmeYetkisiVar ? secenekListesiTumDegerlerle("anlasma_masraf_sorumlusu") : null,
  ]);
  const ozel = await anlasmaGetir(musteriId, dosyaId ?? null);
  const etkin = dosyaId ? await etkinAnlasma(musteriId, dosyaId) : null;
  const genel = dosyaId ? await anlasmaGetir(musteriId, null) : null;
  const dosyalar = !dosyaId ? await dosyaAnlasmalari(musteriId) : [];
  // Form on-degerleri: kendi kaydi, yoksa (dosyada) muvekkil geneli
  const on = ozel ?? genel;
  const kdvToplam = etkin?.anlasma ? kdvliTutar(etkin.anlasma) : null;

  return (
    <div>
      <p className="mb-3 text-sm text-white/55">
        {dosyaId
          ? "Bu dosya için müvekkil ile yapılan anlaşma. Burada anlaşma girmezseniz müvekkilin genel anlaşması geçerli sayılır."
          : "Müvekkilin genel anlaşması: dosyalar için varsayılandır. Bir dosyada farklı bir anlaşma varsa o dosyanın Ekonomi > Anlaşma sekmesinden ayrıca girilir."}
      </p>

      {dosyaId && etkin && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs text-white/45">
            GEÇERLİ ANLAŞMA{" "}
            {etkin.kaynak === "dosya" ? "(bu dosyaya özel)" : etkin.kaynak === "muvekkil" ? "(müvekkil geneli)" : "(girilmemiş)"}
          </p>
          {etkin.anlasma ? (
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
              <Bilgi baslik="Hizmet bedeli">
                {etkin.anlasma.hizmetBedeli !== null ? para.format(etkin.anlasma.hizmetBedeli) : "—"}
                <span className="block text-xs text-white/45">{kdvYazi(etkin.anlasma.kdvDahilMi, etkin.anlasma.kdvOrani)}</span>
              </Bilgi>
              <Bilgi baslik="KDV'li toplam">{kdvToplam !== null ? para.format(kdvToplam) : "—"}</Bilgi>
              <Bilgi baslik="Ödeme şekli">{etkin.anlasma.odemeSekli ?? "—"}</Bilgi>
              <Bilgi baslik="Masrafları üstlenen">{etkin.anlasma.masrafSorumlusu ?? "—"}</Bilgi>
              {etkin.anlasma.basariPrimi && <Bilgi baslik="Başarı primi">{etkin.anlasma.basariPrimi}</Bilgi>}
              {etkin.anlasma.odemePlani && <Bilgi baslik="Ödeme planı">{etkin.anlasma.odemePlani}</Bilgi>}
              {etkin.anlasma.anlasmaTarihi && <Bilgi baslik="Anlaşma tarihi">{tarih.format(etkin.anlasma.anlasmaTarihi)}</Bilgi>}
              {etkin.anlasma.belgeReferansi && <Bilgi baslik="Belge">{etkin.anlasma.belgeReferansi}</Bilgi>}
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/55">Bu dosya ve müvekkil için henüz anlaşma girilmemiş.</p>
          )}
          {kdvToplam !== null && kdvToplam > 0 && (
            <form action={anlasmaAkdiVekaleteYaz.bind(null, musteriId, dosyaId)} className="mt-3">
              <GonderButonu varyant="ikincil" bekleyenMetin="Yazılıyor…">
                {`${para.format(kdvToplam)} tutarını 101 - Akdi Vekalet hesabına borç yaz`}
              </GonderButonu>
              <span className="ml-3 text-xs text-white/40">Bir kez yazılır; defterden silip yeniden yazabilirsiniz.</span>
            </form>
          )}
        </div>
      )}

      <h3 className="mb-2 text-sm font-semibold text-white">
        {dosyaId ? (ozel ? "Bu dosyanın anlaşmasını düzenle" : "Bu dosya için özel anlaşma gir") : "Müvekkil genel anlaşması"}
        {!ozel && dosyaId && genel && <span className="ml-2 text-xs font-normal text-white/40">(alanlar müvekkil genelinden doldu)</span>}
      </h3>
      <form action={anlasmaKaydet.bind(null, musteriId, dosyaId ?? "")} className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2 md:grid-cols-4">
        <Alan>
          <Etiket htmlFor="an-bedel">Hizmet Bedeli</Etiket>
          <ParaGirdisi id="an-bedel" name="hizmetBedeli" defaultValue={on?.hizmetBedeli ?? undefined} />
        </Alan>
        <Alan>
          <Etiket htmlFor="an-kdv">KDV</Etiket>
          <Secim id="an-kdv" name="kdv" defaultValue={on?.kdvDahilMi === true ? "dahil" : on?.kdvDahilMi === false ? "haric" : ""}>
            <option value="">Belirtilmedi</option>
            <option value="dahil">KDV dahil</option>
            <option value="haric">KDV hariç (üstüne eklenir)</option>
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="an-oran">KDV Oranı (%)</Etiket>
          <Girdi id="an-oran" name="kdvOrani" type="number" step="0.01" min="0" defaultValue={on?.kdvOrani ?? 20} />
        </Alan>
        <Alan>
          <div className="flex items-center justify-between gap-2">
            <Etiket htmlFor="an-odeme">Ödeme Şekli</Etiket>
            {odemeListesi && <SecenekDuzenleyiciPenceresi listeId={odemeListesi.id} baslik="Ödeme Şekli" degerler={odemeListesi.degerler} />}
          </div>
          <Secim id="an-odeme" name="odemeSekliId" defaultValue={on?.odemeSekliId ?? ""}>
            <option value="">Belirtilmedi</option>
            {odemeSekilleri.map((o) => (
              <option key={o.id} value={o.id}>
                {o.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <div className="flex items-center justify-between gap-2">
            <Etiket htmlFor="an-masraf">Masrafları Kim Üstlenir</Etiket>
            {masrafListesi && <SecenekDuzenleyiciPenceresi listeId={masrafListesi.id} baslik="Masraf Sorumlusu" degerler={masrafListesi.degerler} />}
          </div>
          <Secim id="an-masraf" name="masrafSorumlusuId" defaultValue={on?.masrafSorumlusuId ?? ""}>
            <option value="">Belirtilmedi</option>
            {masrafSorumlulari.map((o) => (
              <option key={o.id} value={o.id}>
                {o.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan>
          <Etiket htmlFor="an-basari">Başarı Primi / Yüzde</Etiket>
          <Girdi id="an-basari" name="basariPrimi" placeholder="ör. %10 ya da 50.000 TL" defaultValue={on?.basariPrimi ?? ""} />
        </Alan>
        <Alan>
          <Etiket htmlFor="an-tarih">Anlaşma Tarihi</Etiket>
          <Girdi id="an-tarih" name="anlasmaTarihi" type="date" defaultValue={on?.anlasmaTarihi ? on.anlasmaTarihi.toISOString().slice(0, 10) : ""} />
        </Alan>
        <Alan>
          <Etiket htmlFor="an-belge">Belge / Sözleşme Referansı</Etiket>
          <Girdi id="an-belge" name="belgeReferansi" placeholder="ör. vekâlet sözleşmesi no / klasör" defaultValue={on?.belgeReferansi ?? ""} />
        </Alan>
        <div className="col-span-1 sm:col-span-2 md:col-span-4">
          <Alan>
            <Etiket htmlFor="an-plan">Ödeme Planı (taksitler, vadeler)</Etiket>
            <MetinAlani id="an-plan" name="odemePlani" rows={2} placeholder="ör. 3 eşit taksit: 01.11 / 01.12 / 01.01" defaultValue={on?.odemePlani ?? ""} />
          </Alan>
        </div>
        <div className="col-span-1 sm:col-span-2 md:col-span-4">
          <Alan>
            <Etiket htmlFor="an-not">Notlar</Etiket>
            <MetinAlani id="an-not" name="notlar" rows={2} defaultValue={on?.notlar ?? ""} />
          </Alan>
        </div>
        <div className="col-span-1 flex items-center gap-3 sm:col-span-2 md:col-span-4">
          <GonderButonu>Anlaşmayı Kaydet</GonderButonu>
          {ozel && silmeYetkisiVar && (
            <OnayliButon sifreIste eylem={anlasmaSil.bind(null, ozel.id)} mesaj="Bu anlaşma kaydı silinsin mi?">
              Anlaşmayı Sil
            </OnayliButon>
          )}
        </div>
      </form>

      {!dosyaId && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-white">Dosyalara Özel Anlaşmalar</h3>
          {dosyalar.length === 0 ? (
            <p className="text-sm text-white/40">Henüz bir dosyaya özel anlaşma girilmemiş; tüm dosyalarda genel anlaşma geçerli.</p>
          ) : (
            <div className="glass overflow-x-auto rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="text-white/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Dosya</th>
                    <th className="px-4 py-3 text-right font-medium">Hizmet Bedeli</th>
                    <th className="px-4 py-3 font-medium">KDV</th>
                    <th className="px-4 py-3 font-medium">Ödeme Şekli</th>
                    <th className="px-4 py-3 font-medium">Masraflar</th>
                  </tr>
                </thead>
                <tbody>
                  {dosyalar.map((a) => (
                    <tr key={a.id} className="border-t border-white/[0.06]">
                      <td className="whitespace-nowrap px-4 py-3 text-white/85">{a.dosyaEtiketi}</td>
                      <td className="px-4 py-3 text-right text-white/85">{a.hizmetBedeli !== null ? para.format(a.hizmetBedeli) : "—"}</td>
                      <td className="px-4 py-3 text-white/60">{kdvYazi(a.kdvDahilMi, a.kdvOrani)}</td>
                      <td className="px-4 py-3 text-white/60">{a.odemeSekli ?? "—"}</td>
                      <td className="px-4 py-3 text-white/60">{a.masrafSorumlusu ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Bilgi({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-white/45">{baslik}</p>
      <div className="text-white">{children}</div>
    </div>
  );
}
