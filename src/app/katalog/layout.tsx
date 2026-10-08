import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { waLink } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const s = await getSettings();
  return { title: `Katalog Kebaya — ${s.storeName}`, description: `Lihat koleksi kebaya sewa ${s.storeName}, harga, dan ketersediaannya.` };
}

export default async function KatalogLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const wa = waLink(s.phone, `Halo ${s.storeName}, saya ingin bertanya tentang sewa kebaya.`);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/katalog" className="flex min-w-0 items-center gap-3">
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                {s.storeName.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{s.storeName}</p>
              <p className="text-xs text-muted-foreground">Katalog sewa kebaya</p>
            </div>
          </Link>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              WhatsApp
            </a>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-1 px-4 py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{s.storeName}</p>
          {s.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{s.address}</p>}
          {s.phone && <p className="flex items-center gap-2"><Phone className="size-4 shrink-0" />{s.phone}</p>}
        </div>
      </footer>
    </div>
  );
}
