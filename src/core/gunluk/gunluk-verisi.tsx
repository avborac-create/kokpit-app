import { gunlukDurumu } from "./islem-gunlugu";
import { GeriAlDugmeleri, IslemCubugu } from "./islem-dugmeleri";

export async function GunlukBasligi() {
  return <GeriAlDugmeleri durum={await gunlukDurumu()} />;
}

export async function GunlukCubugu() {
  return <IslemCubugu durum={await gunlukDurumu()} />;
}
