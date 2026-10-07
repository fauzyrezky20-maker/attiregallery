import { AppNav } from "@/components/app-nav";
import { getAllowedMenus, requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { ROLE_LABEL } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [allowed, settings] = await Promise.all([getAllowedMenus(user.role), getSettings()]);
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AppNav allowed={allowed} storeName={settings.storeName} userName={user.name} roleLabel={ROLE_LABEL[user.role]} />
      <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
