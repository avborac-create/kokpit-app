"use client";

import { useState, useTransition } from "react";
import { Dugme } from "@/core/ui/button";
import { Alan, Etiket, Girdi, MetinAlani } from "@/core/ui/form";
import { dilekceHazirla } from "@/modules/avukat/lib/dilekce-hazirla-actions";
import { evrakiPaylas } from "@/modules/cmk-dosyalari/lib/paylas";

const SABLONLAR: { ad: string; konu: string; aciklama: string; sonuc: string }[] = [
  { ad: "Boş dilekçe", konu: "", aciklama: "", sonuc: "" },
  {
    ad: "Duruşma erteleme / mazeret talebi",
    konu: "Duruşmanın ertelenmesi talebi",
    aciklama: "Dosyanın duruşması yakın bir tarihte yapılacaktır. Ancak aşağıda belirtilen mazeret nedeniyle duruşmaya katılmamız mümkün olmayacaktır.\n(Mazeret açıklaması)",
    sonuc: "Yukarıda arz edilen nedenlerle, duruşmanın mazeretimiz giderildikten sonraki bir tarihe ertelenmesini saygılarımla arz ve talep ederim.",
  },
  {
    ad: "Süre talebi",
    konu: "Ek süre verilmesi talebi",
    aciklama: "Mahkemenizce verilen süre içinde yapılması gereken işlemler tamamlanamamıştır. İşlemlerin tamamlanabilmesi için ek süreye ihtiyaç duyulmaktadır.",
    sonuc: "Yukarıda arz edilen nedenlerle, eksikliklerin giderilmesi için tarafımıza ek süre verilmesini saygılarımla arz ve talep ederim.",
  },
  {
    ad: "Delil sunma / beyan",
    konu: "Delillerin sunulması ve beyanlarımız",
    aciklama: "Dosyaya sunduğumuz delillere ek olarak, ekte yer alan belgeleri Mahkemenizin takdirine sunuyoruz.\n(Beyanlar)",
    sonuc: "Yukarıda arz edilen nedenlerle, ekte sunulan delillerin dosyaya alınmasını ve dikkate alınmasını saygılarımla arz ve talep ederim.",
  },
];

// Duruşma dosyası için UDF dilekçe hazırlar; üretilen dosya WhatsApp'tan UYAP'a gönderecek kişiye iletilir.
export function DilekceHazirla({ hedef, dosyaId, mahkeme, dosyaNo, muvekkil, vekil }: { hedef: "cmk" | "dava"; dosyaId: string; mahkeme: string; dosyaNo: string; muvekkil: string; vekil: string }) {
  const [form, setForm] = useState({ konu: "", aciklama: "", sonuc: "", taraflar: `MÜŞTEKİ/MÜVEKKİL : ${muvekkil}\nVEKİLİ : Av. ${vekil}\nSANIK/KARŞI TARAF : ` });
  const [sonuc, setSonuc] = useState<{ evrakId: string; ad: string } | null>(null);
  const [hata, setHata] = useState("");
  const [bilgi, setBilgi] = useState("");
  const [bekliyor, basla] = useTransition();
  const mesaj = `ACİL: ${mahkeme} ${dosyaNo} sayılı dosya için ekteki dilekçeyi (UDF) UYAP üzerinden mahkemeye göndermenizi rica ederim.`;

  function sablonSec(i: number) {
    const s = SABLONLAR[i];
    setForm((f) => ({ ...f, konu: s.konu, aciklama: s.aciklama, sonuc: s.sonuc }));
  }

  return (
    <form
      className="glass mb-4 space-y-3 rounded-2xl p-4"
      action={(fd) => {
        setHata("");
        setBilgi("");
        setSonuc(null);
        basla(async () => {
          try {
            setSonuc(await dilekceHazirla(hedef, dosyaId, fd));
          } catch (e) {
            setHata(e instanceof Error ? e.message : "Hazırlanamadı.");
          }
        });
      }}
    >
      <Alan>
        <Etiket>Şablon</Etiket>
        <select defaultValue="0" onChange={(e) => sablonSec(Number(e.target.value))} className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white">
          {SABLONLAR.map((s, i) => (
            <option key={s.ad} value={i} className="text-black">
              {s.ad}
            </option>
          ))}
        </select>
      </Alan>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Alan>
          <Etiket>Mahkeme</Etiket>
          <Girdi name="mahkeme" defaultValue={mahkeme} required />
        </Alan>
        <Alan>
          <Etiket>Dosya no</Etiket>
          <Girdi name="dosyaNo" defaultValue={dosyaNo} />
        </Alan>
      </div>
      <Alan>
        <Etiket>Taraflar (her satır ayrı yazılır)</Etiket>
        <MetinAlani name="taraflar" rows={4} value={form.taraflar} onChange={(e) => setForm({ ...form, taraflar: e.target.value })} />
      </Alan>
      <Alan>
        <Etiket>Konu</Etiket>
        <Girdi name="konu" required value={form.konu} onChange={(e) => setForm({ ...form, konu: e.target.value })} placeholder="Örn. Duruşmanın ertelenmesi talebi" />
      </Alan>
      <Alan>
        <Etiket>Açıklamalar (her satır ayrı paragraf)</Etiket>
        <MetinAlani name="aciklama" rows={7} required value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
      </Alan>
      <Alan>
        <Etiket>Sonuç ve istem</Etiket>
        <MetinAlani name="sonuc" rows={3} value={form.sonuc} onChange={(e) => setForm({ ...form, sonuc: e.target.value })} />
      </Alan>
      <Alan>
        <Etiket>İmzalayan avukat</Etiket>
        <Girdi name="vekil" defaultValue={vekil} />
      </Alan>
      {hata && <p className="text-sm text-[#ff7a70]">{hata}</p>}
      <Dugme type="submit" disabled={bekliyor}>
        {bekliyor ? "Hazırlanıyor…" : "UDF dilekçeyi hazırla"}
      </Dugme>

      {sonuc && (
        <div className="space-y-2 rounded-xl border border-white/15 p-3">
          <p className="text-sm text-white">✓ Hazırlandı: {sonuc.ad}</p>
          <p className="text-xs text-white/50">Dosyanın evraklarında &quot;Hazırlanan Dilekçeler&quot; klasörüne de kaydedildi.</p>
          <div className="flex flex-wrap gap-2">
            <Dugme
              type="button"
              disabled={bekliyor}
              onClick={() =>
                basla(async () => {
                  try {
                    const s = await evrakiPaylas(sonuc.evrakId, `${sonuc.ad.replace(/[\\/:*?"<>|]/g, "")}.udf`, mesaj);
                    setBilgi(s === "indirildi" ? "Dosya indirildi; WhatsApp açıldı — mesaja indirilen dosyayı ekleyin." : "");
                  } catch (e) {
                    setHata(e instanceof Error ? e.message : "Paylaşılamadı.");
                  }
                })
              }
            >
              WhatsApp ile gönder
            </Dugme>
            <a href={`/api/cmk-evrak/${sonuc.evrakId}?tur=orijinal`}>
              <Dugme type="button" varyant="ikincil">
                UDF indir
              </Dugme>
            </a>
          </div>
          {bilgi && <p className="text-xs text-[#6db8ff]">{bilgi}</p>}
        </div>
      )}
    </form>
  );
}
