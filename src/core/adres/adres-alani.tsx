"use client";

import { useState } from "react";
import { Alan, Etiket, Girdi, MetinAlani, Secim } from "@/core/ui/form";
import { IL_ILCE, ILLER } from "./il-ilce";

const LISTEDE_YOK = "__yok__";

// Il ve ilce listeden secilir (ilce, secilen ile gore daralir). Listede yoksa "Listede yok" secilip
// elle yazilir; kayit acilir ve listeye eklenmesi icin yoneticiye gorev duser (sunucu tarafi).
// Formdan giden alanlar: il, ilce, ilListeDisi / ilceListeDisi ("1"), adres (acik adres).
export function AdresAlani({ il: ilBas, ilce: ilceBas, adres }: { il: string; ilce: string; adres: string }) {
  const ilListede = ilBas !== "" && ILLER.includes(ilBas);
  const [ilSecim, setIlSecim] = useState<string>(ilBas === "" ? "" : ilListede ? ilBas : LISTEDE_YOK);
  const [ilYazi, setIlYazi] = useState(ilListede ? "" : ilBas);
  const ilceListesi = ilSecim !== "" && ilSecim !== LISTEDE_YOK ? IL_ILCE[ilSecim] ?? [] : [];
  const ilceListede = ilceBas !== "" && ilceListesi.includes(ilceBas);
  const [ilceSecim, setIlceSecim] = useState<string>(ilceBas === "" ? "" : ilceListede || (ilSecim !== LISTEDE_YOK && IL_ILCE[ilSecim]?.includes(ilceBas)) ? ilceBas : LISTEDE_YOK);
  const [ilceYazi, setIlceYazi] = useState(ilceBas !== "" && ilceSecim === LISTEDE_YOK ? ilceBas : "");

  const ilListeDisi = ilSecim === LISTEDE_YOK;
  // Il listede yoksa ilce de listede olamaz.
  const ilceListeDisi = ilListeDisi || ilceSecim === LISTEDE_YOK;
  const ilDeger = ilListeDisi ? ilYazi.trim() : ilSecim;
  const ilceDeger = ilceListeDisi ? ilceYazi.trim() : ilceSecim;

  return (
    <>
      <input type="hidden" name="il" value={ilDeger} />
      <input type="hidden" name="ilce" value={ilceDeger} />
      {ilListeDisi && <input type="hidden" name="ilListeDisi" value="1" />}
      {ilceListeDisi && <input type="hidden" name="ilceListeDisi" value="1" />}
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Alan>
          <Etiket htmlFor="adres-il">İl</Etiket>
          <Secim
            id="adres-il"
            value={ilSecim}
            onChange={(e) => {
              setIlSecim(e.target.value);
              setIlceSecim("");
              setIlceYazi("");
            }}
          >
            <option value="">Seçiniz…</option>
            {ILLER.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
            <option value={LISTEDE_YOK}>Listede yok</option>
          </Secim>
          {ilListeDisi && <Girdi className="mt-2" placeholder="İl adını yazın" value={ilYazi} onChange={(e) => setIlYazi(e.target.value)} />}
        </Alan>
        <Alan>
          <Etiket htmlFor="adres-ilce">İlçe</Etiket>
          <Secim
            id="adres-ilce"
            value={ilListeDisi ? LISTEDE_YOK : ilceSecim}
            disabled={ilSecim === "" || ilListeDisi}
            onChange={(e) => setIlceSecim(e.target.value)}
          >
            <option value="">{ilSecim === "" ? "Önce il seçin" : "Seçiniz…"}</option>
            {ilceListesi.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
            {ilSecim !== "" && <option value={LISTEDE_YOK}>Listede yok</option>}
          </Secim>
          {ilceListeDisi && ilSecim !== "" && <Girdi className="mt-2" placeholder="İlçe adını yazın" value={ilceYazi} onChange={(e) => setIlceYazi(e.target.value)} />}
        </Alan>
      </div>
      {(ilListeDisi || ilceSecim === LISTEDE_YOK) && (
        <p className="-mt-2 mb-4 text-xs text-white/50">Yazdığınız ad kaydedilir; listeye eklenmesi için yöneticiye görev gider.</p>
      )}
      <Alan>
        <Etiket htmlFor="adres">Açık adres (mahalle, sokak, no)</Etiket>
        <MetinAlani id="adres" name="adres" rows={2} defaultValue={adres} />
      </Alan>
    </>
  );
}
