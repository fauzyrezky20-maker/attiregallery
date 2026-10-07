import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db, schema } from "@/db";
import type { Role } from "@/db/schema";
import { DEFAULT_PERMISSIONS, MENUS, type MenuKey } from "./permissions";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const getAllowedMenus = cache(async (role: Role): Promise<MenuKey[]> => {
  if (role === "pemilik") return MENUS.map((m) => m.key);
  const rows = await db.select().from(schema.rolePermissions).where(eq(schema.rolePermissions.role, role));
  if (rows.length === 0) return DEFAULT_PERMISSIONS[role];
  return rows.map((r) => r.menu as MenuKey);
});

/** Pastikan pengguna sudah login dan boleh membuka menu tertentu. Dipakai di halaman & server action. */
export async function requireUser(menu?: MenuKey) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = ((session.user as { role?: string }).role ?? "staf") as Role;
  if (menu) {
    const allowed = await getAllowedMenus(role);
    if (!allowed.includes(menu)) redirect("/?ditolak=" + menu);
  }
  return { ...session.user, role };
}
