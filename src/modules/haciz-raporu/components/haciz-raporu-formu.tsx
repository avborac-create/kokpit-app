import { icraDosyalariniListele, tahsilatKanallariniListele } from "@/modules/haciz-raporu/lib/queries";
import { HacizRaporuFormIcerik } from "./haciz-raporu-form-icerik";

export async function HacizRaporuFormu() {
  const [icraDosyalari, tahsilatKanallari] = await Promise.all([
    icraDosyalariniListele(),
    tahsilatKanallariniListele(),
  ]);

  return <HacizRaporuFormIcerik icraDosyalari={icraDosyalari} tahsilatKanallari={tahsilatKanallari} />;
}
