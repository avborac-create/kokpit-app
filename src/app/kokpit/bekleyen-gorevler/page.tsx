import { redirect } from "next/navigation";

// Bekleyen Gorevler artik "Gorevler" (Isler) panelinin icinde (Parca gorev).
export default function BekleyenGorevlerSayfasi() {
  redirect("/kokpit/isler");
}
