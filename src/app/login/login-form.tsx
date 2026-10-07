"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      rememberMe: true,
    });
    setLoading(false);
    if (error) {
      setError("Email atau kata sandi salah.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-5 md:pt-5">
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required autoFocus />
          </Field>
          <Field label="Kata sandi">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Memproses…" : "Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
