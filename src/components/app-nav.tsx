"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, ShoppingCart, Users, CalendarClock, Shirt, QrCode, PiggyBank,
  LineChart, UserCog, Fingerprint, Settings, LogOut, Menu, X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { MENUS, type MenuKey } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ICONS: Record<MenuKey, React.ComponentType<{ className?: string }>> = {
  dasbor: LayoutDashboard, pesanan: ClipboardList, kasir: ShoppingCart, pelanggan: Users, fitting: CalendarClock,
  produk: Shirt, pembayaran: QrCode, tabungan: PiggyBank, laporan: LineChart, karyawan: UserCog,
  absensi: Fingerprint, pengaturan: Settings,
};

type Props = { allowed: MenuKey[]; storeName: string; userName: string; roleLabel: string };

function NavLinks({ allowed, onNavigate }: { allowed: MenuKey[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5">
      {MENUS.filter((m) => allowed.includes(m.key)).map((m) => {
        const Icon = ICONS[m.key];
        const active = m.href === "/" ? pathname === "/" : pathname.startsWith(m.href);
        return (
          <Link
            key={m.key}
            href={m.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent",
            )}
          >
            <Icon className="size-4" />
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBox({ userName, roleLabel }: { userName: string; roleLabel: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between gap-2 border-t pt-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="text-xs text-muted-foreground">{roleLabel}</p>
      </div>
      <button
        type="button"
        title="Keluar"
        className="rounded-md p-2 hover:bg-accent"
        onClick={async () => {
          await authClient.signOut();
          router.replace("/login");
          router.refresh();
        }}
      >
        <LogOut className="size-4" />
        <span className="sr-only">Keluar</span>
      </button>
    </div>
  );
}

export function AppNav({ allowed, storeName, userName, roleLabel }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop */}
      <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 border-r bg-card p-3 lg:flex">
        <Link href="/" className="px-3 pt-2 text-lg font-semibold text-primary">{storeName}</Link>
        <div className="flex-1 overflow-y-auto"><NavLinks allowed={allowed} /></div>
        <UserBox userName={userName} roleLabel={roleLabel} />
      </aside>

      {/* Ponsel */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
        <Link href="/" className="font-semibold text-primary">{storeName}</Link>
        <button type="button" onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-accent" aria-label="Buka menu">
          <Menu className="size-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-4 bg-card p-3 shadow-xl">
            <div className="flex items-center justify-between px-3 pt-2">
              <span className="font-semibold text-primary">{storeName}</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-accent" aria-label="Tutup menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto"><NavLinks allowed={allowed} onNavigate={() => setOpen(false)} /></div>
            <UserBox userName={userName} roleLabel={roleLabel} />
          </div>
        </div>
      )}
    </>
  );
}
