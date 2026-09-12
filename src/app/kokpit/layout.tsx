import { mevcutKullanici } from "@/core/auth/mevcut-kullanici";
import { cikisYap } from "@/core/auth/actions";
import { Dugme } from "@/core/ui/button";
import { KenarCubugu } from "./kenar-cubugu";

export default async function KokpitLayout({ children }: { children: React.ReactNode }) {
  const kullanici = await mevcutKullanici();

  return (
    <div className="flex flex-1">
      <aside className="glass m-3 mr-0 flex w-60 shrink-0 flex-col rounded-3xl">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-sm font-semibold tracking-tight text-white">KOKPİT</p>
          <p className="text-xs text-white/45">Eces Hukuk Bürosu</p>
        </div>
        <KenarCubugu />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="glass m-3 flex items-center justify-between rounded-2xl px-6 py-3">
          <div className="text-sm text-white/75">
            {kullanici?.adSoyad}
            <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6db8ff]">
              {kullanici?.rol}
            </span>
          </div>
          <form action={cikisYap}>
            <Dugme type="submit" varyant="ikincil">
              Çıkış Yap
            </Dugme>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto px-6 pb-6">{children}</main>
      </div>
    </div>
  );
}
