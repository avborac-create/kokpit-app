import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { cikisYap } from "@/core/auth/actions";
import { Dugme } from "@/core/ui/button";
import { KenarCubugu } from "./kenar-cubugu";

export default async function KokpitLayout({ children }: { children: React.ReactNode }) {
  const kullanici = await mevcutKullanici();

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <aside className="w-56 shrink-0 border-r border-black/10 dark:border-white/10">
        <div className="border-b border-black/10 px-4 py-4 dark:border-white/10">
          <p className="text-sm font-semibold text-black dark:text-white">KOKPİT</p>
          <p className="text-xs text-black/50 dark:text-white/50">Eces Hukuk Bürosu</p>
        </div>
        <KenarCubugu />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-black/10 bg-white px-6 py-3 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm text-black/70 dark:text-white/70">
            {kullanici?.adSoyad}
            <span className="ml-2 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium uppercase text-black/50 dark:bg-white/10 dark:text-white/50">
              {kullanici?.rol}
            </span>
          </div>
          <form action={cikisYap}>
            <Dugme type="submit" varyant="ikincil">
              Çıkış Yap
            </Dugme>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
