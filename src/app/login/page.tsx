import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/users";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await hasAnyUser())) redirect("/setup");
  if (await getSession()) redirect("/");
  const s = await getSettings();
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logoUrl} alt="" className="mx-auto mb-3 h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {s.storeName.slice(0, 1)}
            </div>
          )}
          <h1 className="text-2xl font-semibold">{s.storeName}</h1>
          <p className="text-sm text-muted-foreground">Masuk untuk mengelola toko</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Pelanggan? <Link href="/katalog" className="font-medium text-primary hover:underline">Lihat katalog kebaya</Link>
        </p>
      </div>
    </main>
  );
}
