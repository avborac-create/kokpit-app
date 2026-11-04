import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/core/db/prisma";
import { modulErisimiVarMi } from "@/core/auth/modul-izni";
import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { DosyaSecici } from "@/core/ui/dosya-secici";
import { GonderButonu } from "@/core/ui/gonder-butonu";
import { kayitNoGoster } from "@/modules/dava-dosyasi/lib/kokpit-no";
import { dilekceEkle, dilekceGonderildiIsle, dilekceIsEmriVer, dilekceSil } from "@/modules/avukat/lib/dilekce-actions";
import { dosyaSecenekleriGetir, kullaniciSecenekleriGetir } from "@/modules/avukat/lib/dosya-secenekleri";
import { DILEKCE_TURLERI, GONDERIM_YOLLARI } from "@/modules/avukat/lib/sabitler";

const tarih = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function DilekceYonetimiSayfasi({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  if (!(await modulErisimiVarMi("avukat"))) redirect("/kokpit");
  const { durum } = await searchParams;
  const [kullanici, dosyaSecenekleri, kullanicilar, dilekceler] = await Promise.all([
    mevcutKullanici(),
    dosyaSecenekleriGetir(),
    kullaniciSecenekleriGetir(),
    prisma.dilekce.findMany({
      where: durum === "TASLAK" || durum === "GONDERILDI" ? { durum } : {},
      orderBy: { olusturmaTarihi: "desc" },
      take: 300,
      include: { davaDosyasi: { select: { id: true, kayitNo: true, dosyaNo: true, konu: true } } },
    }),
  ]);
  const isIdleri = dilekceler.map((d) => d.isId).filter((x): x is string => !!x);
  const isler = await prisma.is.findMany({ where: { id: { in: isIdleri } }, select: { id: true, durum: true, sorumluId: true } });
  const isHaritasi = new Map(isler.map((i) => [i.id, i]));
  const adHaritasi = new Map(kullanicilar.map((k) => [k.id, k.adSoyad]));
  const yonetici = kullanici?.rol === "YONETICI";

  const sekme = (anahtar: string | undefined, etiket: string) => (
    <Link
      href={anahtar ? `?durum=${anahtar}` : "?"}
      className={`rounded-full px-3 py-1 text-sm ${durum === anahtar ? "bg-white/[0.14] text-white" : "text-white/55 hover:text-white"}`}
    >
      {etiket}
    </Link>
  );

  return (
    <div className="pt-3">
      <Link href="/kokpit/avukat" className="text-sm text-white/50 hover:text-white">← Avukat</Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold tracking-tight text-white">Dilekçe Yönetimi</h1>
      <p className="mb-4 text-sm text-white/55">
        Dilekçe dosyaya bağlı bir belgedir; burada kayıt altında tutulur. Hazırlatmak veya gönderileni işletmek için iş emri verirsiniz — iş Görevler modülüne düşer, dilekçe &quot;gönderildi&quot; işlenince iş otomatik kapanır.
      </p>

      <details className="glass mb-5 rounded-2xl p-4">
        <summary className="cursor-pointer font-medium text-white">+ Yeni dilekçe / gönderilen dilekçeyi işle</summary>
        <form action={dilekceEkle} className="mt-4 grid grid-cols-1 gap-x-3 sm:grid-cols-2 md:grid-cols-3">
          <Alan>
            <Etiket htmlFor="dosyaId">Dosya</Etiket>
            <DosyaSecici id="dosyaId" name="dosyaId" dosyalar={dosyaSecenekleri} required />
          </Alan>
          <Alan>
            <Etiket htmlFor="tur">Tür</Etiket>
            <Secim id="tur" name="tur" required defaultValue="">
              <option value="" disabled>Seçiniz…</option>
              {DILEKCE_TURLERI.map((t) => <option key={t} value={t}>{t}</option>)}
            </Secim>
          </Alan>
          <Alan><Etiket htmlFor="baslik">Başlık</Etiket><Girdi id="baslik" name="baslik" required placeholder="Örn. Bilirkişi raporuna itiraz" /></Alan>
          <Alan>
            <Etiket htmlFor="durum">Durum</Etiket>
            <Secim id="durum" name="durum" defaultValue="TASLAK">
              <option value="TASLAK">Taslak / hazırlanacak</option>
              <option value="GONDERILDI">Gönderildi</option>
            </Secim>
          </Alan>
          <Alan><Etiket htmlFor="gonderimTarihi">Gönderim tarihi</Etiket><Girdi id="gonderimTarihi" name="gonderimTarihi" type="date" /></Alan>
          <Alan>
            <Etiket htmlFor="gonderimYolu">Gönderim yolu</Etiket>
            <Secim id="gonderimYolu" name="gonderimYolu" defaultValue="">
              <option value="">—</option>
              {GONDERIM_YOLLARI.map((t) => <option key={t} value={t}>{t}</option>)}
            </Secim>
          </Alan>
          <Alan><Etiket htmlFor="uyapEvrakNo">UYAP evrak no</Etiket><Girdi id="uyapEvrakNo" name="uyapEvrakNo" /></Alan>
          <Alan><Etiket htmlFor="sonrakiAdimVade">Sonraki adım / son tarih</Etiket><Girdi id="sonrakiAdimVade" name="sonrakiAdimVade" type="date" /></Alan>
          <Alan>
            <Etiket htmlFor="sorumluId">İş emri ver (isteğe bağlı)</Etiket>
            <Secim id="sorumluId" name="sorumluId" defaultValue="">
              <option value="">İş emri verme</option>
              {kullanicilar.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
            </Secim>
          </Alan>
          <div className="sm:col-span-2 md:col-span-3"><Alan><Etiket htmlFor="notlar">Not</Etiket><MetinAlani id="notlar" name="notlar" rows={2} /></Alan></div>
          <div className="sm:col-span-2 md:col-span-3"><GonderButonu>Kaydet</GonderButonu></div>
        </form>
      </details>

      <div className="mb-3 flex gap-1">{sekme(undefined, "Tümü")}{sekme("TASLAK", "Taslak")}{sekme("GONDERILDI", "Gönderildi")}</div>

      <div className="flex flex-col gap-3">
        {dilekceler.map((d) => {
          const is = d.isId ? isHaritasi.get(d.isId) : undefined;
          return (
            <div key={d.id} className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${d.durum === "GONDERILDI" ? "bg-[#2fb58a]/20 text-[#5fd6ae]" : "bg-[#f5a524]/20 text-[#f5b54c]"}`}>
                  {d.durum === "GONDERILDI" ? "Gönderildi" : "Taslak"}
                </span>
                <span className="font-medium text-white">{d.baslik}</span>
                <span className="text-xs text-white/45">{d.tur}</span>
              </div>
              <p className="mt-1 text-sm text-white/60">
                <Link href={`/kokpit/dava-dosyalari/${d.davaDosyasi.id}`} className="text-[#6db8ff] hover:underline">
                  {kayitNoGoster(d.davaDosyasi.kayitNo)} · {d.davaDosyasi.dosyaNo ?? "Esas no yok"}
                </Link>{" "}
                — {d.davaDosyasi.konu}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {d.gonderimTarihi && <>Gönderim: {tarih.format(d.gonderimTarihi)}{d.gonderimYolu ? ` (${d.gonderimYolu})` : ""}{d.uyapEvrakNo ? ` · Evrak no ${d.uyapEvrakNo}` : ""} · </>}
                {d.sonrakiAdimVade && <>Sonraki adım: {tarih.format(d.sonrakiAdimVade)} · </>}
                Kayıt: {tarih.format(d.olusturmaTarihi)}
              </p>
              {d.notlar && <p className="mt-1 text-xs text-white/55">{d.notlar}</p>}
              {is && (
                <p className="mt-2 text-xs text-white/60">
                  İş emri:{" "}
                  <Link href={`/kokpit/isler/${is.id}`} className="text-[#6db8ff] hover:underline">
                    {is.sorumluId ? adHaritasi.get(is.sorumluId) ?? "—" : "—"} · {is.durum === "TAMAMLANDI" ? "tamamlandı" : "açık"}
                  </Link>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-4">
                {d.durum === "TASLAK" && (
                  <details>
                    <summary className="cursor-pointer text-sm text-white/70 hover:text-white">Gönderildi olarak işle</summary>
                    <form action={dilekceGonderildiIsle.bind(null, d.id)} className="mt-2 grid grid-cols-1 gap-x-3 sm:grid-cols-3">
                      <Alan><Etiket>Tarih</Etiket><Girdi name="gonderimTarihi" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Alan>
                      <Alan>
                        <Etiket>Yol</Etiket>
                        <Secim name="gonderimYolu" defaultValue="UYAP">{GONDERIM_YOLLARI.map((t) => <option key={t} value={t}>{t}</option>)}</Secim>
                      </Alan>
                      <Alan><Etiket>UYAP evrak no</Etiket><Girdi name="uyapEvrakNo" /></Alan>
                      <div className="sm:col-span-3"><GonderButonu>İşle{is ? " ve iş emrini kapat" : ""}</GonderButonu></div>
                    </form>
                  </details>
                )}
                {!is && (
                  <details>
                    <summary className="cursor-pointer text-sm text-white/70 hover:text-white">İş emri ver</summary>
                    <form action={dilekceIsEmriVer.bind(null, d.id)} className="mt-2 grid grid-cols-1 gap-x-3 sm:grid-cols-2">
                      <Alan>
                        <Etiket>Sorumlu</Etiket>
                        <Secim name="sorumluId" required defaultValue="">
                          <option value="" disabled>Seçiniz…</option>
                          {kullanicilar.map((k) => <option key={k.id} value={k.id}>{k.adSoyad}</option>)}
                        </Secim>
                      </Alan>
                      <Alan><Etiket>Not</Etiket><Girdi name="not" /></Alan>
                      <div className="sm:col-span-2"><GonderButonu>İş emri ver</GonderButonu></div>
                    </form>
                  </details>
                )}
                {yonetici && (
                  <form action={dilekceSil.bind(null, d.id)}>
                    <button type="submit" className="text-sm text-[#ff7a70] hover:underline">Sil</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {dilekceler.length === 0 && <p className="glass rounded-2xl p-6 text-center text-white/40">Kayıt bulunamadı.</p>}
      </div>
    </div>
  );
}
