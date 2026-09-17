// Sol menudeki her ogeyi anlamca destekleyen, TEK bir gorsel dilde (ince
// çizgili/outline, stroke="currentColor") kucuk ikon seti. Dekoratif
// degil - sectiği modulu adindan bagimsiz olarak da tanimlanabilir kilar
// (bkz. ARCHITECTURE.md "Sol Menü Yeniden Tasarımı").
import type { SVGProps } from "react";

function Taban(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function AnaSayfaIkonu(props: SVGProps<SVGSVGElement>) {
  return (
    <Taban {...props}>
      <path d="M3 9.5 10 3l7 6.5" />
      <path d="M5 8.5V16a1 1 0 0 0 1 1h3v-4.5h2V17h3a1 1 0 0 0 1-1V8.5" />
    </Taban>
  );
}

export function MuvekkillerIkonu(props: SVGProps<SVGSVGElement>) {
  return (
    <Taban {...props}>
      <circle cx="7.25" cy="6.75" r="2.25" />
      <path d="M2.75 16c.4-2.6 2.2-4.25 4.5-4.25s4.1 1.65 4.5 4.25" />
      <circle cx="13.75" cy="7.5" r="1.85" />
      <path d="M12.6 11.9c1.7.15 3.1 1.55 3.65 4.1" />
    </Taban>
  );
}

export function DosyalarIkonu(props: SVGProps<SVGSVGElement>) {
  return (
    <Taban {...props}>
      <path d="M2.75 6.25c0-.55.45-1 1-1h3.4l1.3 1.5h7.8c.55 0 1 .45 1 1v6.75c0 .55-.45 1-1 1H3.75c-.55 0-1-.45-1-1z" />
    </Taban>
  );
}

export function HukukDosyalariIkonu(props: SVGProps<SVGSVGElement>) {
  return (
    <Taban {...props}>
      <path d="M10 3v13" />
      <path d="M6.25 4.5h7.5" />
      <path d="M3 6.5 5.5 6.5 4.25 9.75c-.65 1.1-2.15 1.1-2.5 0z" />
      <path d="M14.5 6.5 17 6.5 15.75 9.75c-.65 1.1-2.15 1.1-2.5 0z" />
      <path d="M7 16.5h6" />
    </Taban>
  );
}

export function CezaDosyalariIkonu(props: SVGProps<SVGSVGElement>) {
  return (
    <Taban {...props}>
      <path d="M10 2.75 16 5v4.3c0 4-2.6 6.6-6 7.95-3.4-1.35-6-3.95-6-7.95V5z" />
      <path d="M7.6 10 9.2 11.6 12.6 8.2" />
    </Taban>
  );
}

export function MuvekkilFinansIkonu(props: SVGProps<SVGSVGElement>) {
  return (
    <Taban {...props}>
      <rect x="2.75" y="5.75" width="14.5" height="9.5" rx="1.5" />
      <path d="M2.75 8.75h14.5" />
      <path d="M5.5 12.25h3" />
    </Taban>
  );
}

export function OnerilerIkonu(props: SVGProps<SVGSVGElement>) {
  return (
    <Taban {...props}>
      <path d="M10 2.75a4.75 4.75 0 0 1 2.6 8.73c-.5.34-.85.9-.85 1.52v.5h-3.5v-.5c0-.62-.35-1.18-.85-1.52A4.75 4.75 0 0 1 10 2.75Z" />
      <path d="M8.25 16.75h3.5" />
      <path d="M8.75 13.5h2.5" />
    </Taban>
  );
}

export function AyarlarIkonu(props: SVGProps<SVGSVGElement>) {
  return (
    <Taban {...props}>
      <circle cx="10" cy="10" r="2.35" />
      <path d="M10 3v1.6M10 15.4V17M17 10h-1.6M4.6 10H3M14.9 5.1l-1.15 1.15M6.25 13.65 5.1 14.9M14.9 14.9l-1.15-1.15M6.25 6.25 5.1 5.1" />
    </Taban>
  );
}

export function OkKirilimIkonu(props: SVGProps<SVGSVGElement>) {
  return (
    <Taban {...props} strokeWidth={2}>
      <path d="M7.5 5.5 12 10l-4.5 4.5" />
    </Taban>
  );
}
