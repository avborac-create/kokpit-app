import Image from "next/image";
import { LOGOLAR } from "@/core/gorunum/sabitler";

// Secili logo <html data-logo> niteligine gore CSS ile secilir (globals.css
// .marka-logo kurallari); boylece cookie ilk boyamadan once uygulandigindan
// sayfa acilirken varsayilan logo yanip sonmez.
export function MarkaLogosu({ boyut, className = "" }: { boyut: number; className?: string }) {
  return (
    <>
      {LOGOLAR.map((logo) => (
        <Image
          key={logo}
          src={`/icons/logo-${logo}.png`}
          alt=""
          width={boyut}
          height={boyut}
          className={`marka-logo marka-logo-${logo} ${className}`}
        />
      ))}
    </>
  );
}
