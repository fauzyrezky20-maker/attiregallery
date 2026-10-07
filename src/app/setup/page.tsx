import { redirect } from "next/navigation";
import { hasAnyUser, createLoginUser } from "@/lib/users";
import { db, schema } from "@/db";
import { getSettings } from "@/lib/settings";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

async function setupAction(formData: FormData) {
  "use server";
  if (await hasAnyUser()) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const storeName = String(formData.get("storeName") ?? "").trim() || "AttireGallery";
  const userId = await createLoginUser({
    name,
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: "pemilik",
  });
  const s = await getSettings();
  await db.update(schema.storeSettings).set({ storeName }).where(eq(schema.storeSettings.id, s.id));
  await db.insert(schema.employees).values({ userId, name, position: "Pemilik" });
  redirect("/login");
}

export default async function SetupPage() {
  if (await hasAnyUser()) redirect("/login");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Selamat datang 👋</CardTitle>
          <CardDescription>Buat akun pemilik toko untuk mulai memakai aplikasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setupAction} className="grid gap-4">
            <Field label="Nama toko">
              <Input name="storeName" defaultValue="AttireGallery" required />
            </Field>
            <Field label="Nama pemilik">
              <Input name="name" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Kata sandi" hint="Minimal 6 karakter">
              <Input name="password" type="password" minLength={6} required />
            </Field>
            <Button type="submit" size="lg">Buat akun pemilik</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
