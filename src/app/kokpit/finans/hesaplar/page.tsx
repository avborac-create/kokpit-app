import Link from "next/link";
import { redirect } from "next/navigation";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { HESAP_TURLERI, kisiselHesapMi } from "@/core/hesap/hesaplar";
import { hesapHareketleri } from "./hesap-veri";
import { HesapYonetimi, MahsupFormu, MahsupIptalDugmesi, YeniHesapFormu } from "./formlar";

const para = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const gun = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" });

export default async function HesaplarSayfasi({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const k = await mevcutKullanici();
  if (!k) redirect("/giris");
  if (!(await modulErisimiVarMi("finans"))) redirect("/kokpit");
  const { h } = await searchParams;
  const ozetler = await hesapHareketleri();
  const secili = ozetler.find((o) => o.hesap.id === h) ?? ozetler.find((o) => o.hesap.aktifMi) ?? ozetler[0];

  return (
    <div className="mx-auto max-w-5xl pt-3">
      <Link href="/kokpit/finans" className="text-sm text-[#6db8ff] hover:underline">
        ‹ Finans / Muhasebe
      </Link>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Para Hesapları</h1>
      <p className="mb-5 mt-1 text-sm text-white/55">
        Her para girişi ve çıkışı bir hesaba bağlanır: büro banka hesabı, nakit kasa ya da sigortalı avukatın kişisel hesabı. Kişisel hesaptan çıkan masraf veya o hesaba gelen para, büro ile hesap sahibi arasında alacak/borç doğurur; mahsupla kapatılır.
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ozetler.map((o) => {
          const kisisel = kisiselHesapMi(o.hesap.tur);
          const aktifSecim = secili?.hesap.id === o.hesap.id;
          return (
            <Link
              key={o.hesap.id}
              href={`/kokpit/finans/hesaplar?h=${o.hesap.id}`}
              className={`glass rounded-2xl p-4 ${aktifSecim ? "ring-2 ring-[var(--accent)]" : ""} ${o.hesap.aktifMi ? "" : "opacity-50"}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {HESAP_TURLERI[o.hesap.tur] ?? o.hesap.tur}
                {o.hesap.varsayilanMi ? " · varsayılan" : ""}
                {o.hesap.aktifMi ? "" : " · pasif"}
              </p>
              <p className="mt-0.5 font-medium text-white">{o.hesap.ad}</p>
              {o.hesap.sahipAdi && <p className="text-xs text-white/50">{o.hesap.sahipAdi}</p>}
              <p className="mt-2 text-xs text-white/60">
                Giriş <b className="tabular-nums text-[#5fd97a]">{para.format(o.giris)}</b> · Çıkış <b className="tabular-nums text-[#ff9b92]">{para.format(o.cikis)}</b>
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">{para.format(o.net)}</p>
              {kisisel && (
                <p className={`mt-1 text-xs font-medium ${o.sahipBorcu === 0 ? "text-white/50" : "text-[#f2b04c]"}`}>
                  {o.sahipBorcu === 0 ? "Büro ile hesap sahibi arasında borç yok" : o.sahipBorcu > 0 ? `Hesap sahibi büroya ${para.format(o.sahipBorcu)} borçlu` : `Büro hesap sahibine ${para.format(-o.sahipBorcu)} borçlu`}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {secili && (
        <section className="glass mb-5 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/60">{secili.hesap.ad} · hareketler</h2>
            <HesapYonetimi id={secili.hesap.id} aktif={secili.hesap.aktifMi} varsayilan={secili.hesap.varsayilanMi} />
          </div>
          {secili.belirsiz > 0 && (
            <p className="mt-1 text-xs text-[#f2b04c]">
              {secili.belirsiz} kayıt hesap belirtilmeden girildiği için bu hesapta varsayılan olarak sayıldı. Kaydın kendi ekranında düzenle / “Hesabı değiştir” ile doğru hesabı seçebilirsiniz.
            </p>
          )}

          {kisiselHesapMi(secili.hesap.tur) && (
            <>
              <div className="mt-3 rounded-xl border border-[#f2b04c]/40 bg-[#f2b04c]/10 p-3 text-sm text-white/80">
                <p>
                  Hesaba gelen: <b>{para.format(secili.giris)}</b> · Hesaptan çıkan masraf: <b>{para.format(secili.cikis)}</b> · Büroya aktarılan: <b>{para.format(secili.buroyaAktarilan)}</b> · Sahibine ödenen: <b>{para.format(secili.sahibeOdenen)}</b>
                </p>
                <p className="mt-1 font-semibold text-[#f2b04c]">
                  {secili.sahipBorcu === 0 ? "Mahsup tamam: borç yok." : secili.sahipBorcu > 0 ? `Hesap sahibi büroya ${para.format(secili.sahipBorcu)} aktarmalı.` : `Büro hesap sahibine ${para.format(-secili.sahipBorcu)} ödemeli.`}
                </p>
              </div>
              <MahsupFormu hesapId={secili.hesap.id} sahip={secili.hesap.sahipAdi || "Hesap sahibi"} />
              {secili.hesap.mahsuplar.length > 0 && (
                <ul className="mt-3 divide-y divide-white/10 text-sm">
                  {secili.hesap.mahsuplar.map((m) => (
                    <li key={m.id} className={`flex flex-wrap items-center justify-between gap-2 py-1.5 ${m.iptalZamani ? "text-white/35 line-through" : "text-white/80"}`}>
                      <span>
                        {gun.format(m.tarih)} · {m.yon === "BUROYA_AKTARILDI" ? "Büroya aktarıldı" : "Hesap sahibine ödendi"} · <b>{para.format(Number(m.tutar))}</b>
                        {m.aciklama ? ` · ${m.aciklama}` : ""}
                        {m.iptalZamani ? " · İPTAL EDİLDİ" : ""}
                      </span>
                      {!m.iptalZamani && <MahsupIptalDugmesi id={m.id} />}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-white/45">
                <tr>
                  <th className="py-1 pr-3">Tarih</th>
                  <th className="py-1 pr-3">Kaynak</th>
                  <th className="py-1 pr-3">Açıklama</th>
                  <th className="py-1 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {secili.hareketler.slice(0, 150).map((x) => (
                  <tr key={x.id}>
                    <td className="whitespace-nowrap py-1 pr-3 text-white/70">{gun.format(x.tarih)}</td>
                    <td className="py-1 pr-3 text-white/70">{x.kaynak}</td>
                    <td className="py-1 pr-3 text-white/60">
                      {x.aciklama}
                      {x.hesapBelirsiz && <span className="ml-1 text-[#f2b04c]">(hesap belirtilmemiş)</span>}
                    </td>
                    <td className={`py-1 text-right tabular-nums ${x.yon === "GIRIS" ? "text-[#5fd97a]" : "text-[#ff9b92]"}`}>
                      {x.yon === "GIRIS" ? "+" : "−"}
                      {para.format(x.tutar)}
                    </td>
                  </tr>
                ))}
                {secili.hareketler.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-white/45">
                      Bu hesapta henüz hareket yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <YeniHesapFormu />
    </div>
  );
}
