// Turkce uyumlu arama: Postgres'in buyuk/kucuk eslemesi I/ı ve İ/i'yi bilmez.
// Aranan metin yazildigi, tr-buyuk ve tr-kucuk haliyle denenir (OR icinde).
export function turkceVaryantlar(arama: string): string[] {
  return [...new Set([arama, arama.toLocaleUpperCase("tr-TR"), arama.toLocaleLowerCase("tr-TR")])];
}

export function varyantlarla<T>(arama: string, kosul: (v: string) => T): T[] {
  return turkceVaryantlar(arama).map(kosul);
}
