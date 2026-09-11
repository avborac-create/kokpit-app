import Link from "next/link";

export default function KokpitAnaSayfa() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-black dark:text-white">Kokpit</h1>
      <p className="mb-6 text-black/60 dark:text-white/60">
        Sol menüden bir modül seçin.
      </p>
      <Link
        href="/kokpit/musteriler"
        className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-black"
      >
        Müvekkil Veritabanına Git
      </Link>
    </div>
  );
}
