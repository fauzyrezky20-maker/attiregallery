"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { safeAction } from "@/lib/action";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { saveUpload } from "@/lib/upload";
import { BizError } from "@/lib/orders";
import { isValidQris } from "@/lib/qris";
import { MENUS, type MenuKey } from "@/lib/permissions";
import { str, toInt } from "@/lib/utils";

type SettingsPatch = Partial<typeof schema.storeSettings.$inferInsert>;

async function save(patch: SettingsPatch) {
  await requireUser("pengaturan");
  const s = await getSettings();
  await db.update(schema.storeSettings).set(patch).where(eq(schema.storeSettings.id, s.id));
  revalidatePath("/", "layout");
}

export const saveProfileAction = safeAction(async (fd) => {
  const logoUrl = await saveUpload(fd.get("logo"), "toko");
  const storeName = str(fd.get("storeName"));
  if (!storeName) throw new BizError("Nama toko wajib diisi.");
  await save({ storeName, address: str(fd.get("address")), phone: str(fd.get("phone")), ...(logoUrl ? { logoUrl } : {}) });
  return { ok: "Profil toko disimpan." };
});

export const saveRulesAction = safeAction(async (fd) => {
  await save({
    defaultRentDays: Math.max(1, toInt(fd.get("defaultRentDays"), 3)),
    finePerDay: Math.max(0, toInt(fd.get("finePerDay"))),
    lowStockThreshold: Math.max(0, toInt(fd.get("lowStockThreshold"), 1)),
  });
  return { ok: "Aturan sewa & denda disimpan." };
});

export const savePaymentAction = safeAction(async (fd) => {
  const qrisPayload = str(fd.get("qrisPayload"))?.replace(/\s+/g, "") ?? null;
  if (qrisPayload && !isValidQris(qrisPayload)) throw new BizError("Kode QRIS tidak valid. Salin teks QRIS lengkap (diawali 000201 dan diakhiri kode CRC 4 karakter).");
  await save({
    cashEnabled: fd.get("cashEnabled") === "on",
    qrisEnabled: fd.get("qrisEnabled") === "on",
    qrisPayload,
    transferEnabled: fd.get("transferEnabled") === "on",
    transferInfo: str(fd.get("transferInfo")),
  });
  return { ok: "Metode pembayaran disimpan." };
});

export const saveNotifAction = safeAction(async (fd) => {
  await save({
    notifyPickup: fd.get("notifyPickup") === "on",
    notifyReturn: fd.get("notifyReturn") === "on",
    notifyPayment: fd.get("notifyPayment") === "on",
    reminderDaysBefore: Math.min(14, Math.max(0, toInt(fd.get("reminderDaysBefore"), 1))),
  });
  return { ok: "Pengaturan notifikasi disimpan." };
});

export const saveTermsAction = safeAction(async (fd) => {
  const s = await getSettings();
  const termsText = str(fd.get("termsText"));
  let termsVersion = str(fd.get("termsVersion")) ?? s.termsVersion;
  // Teks berubah tapi versi tidak dinaikkan → naikkan otomatis agar persetujuan lama tetap tercatat pada versinya.
  if (termsText !== s.termsText && termsVersion === s.termsVersion) {
    const [maj, min = "0"] = s.termsVersion.split(".");
    termsVersion = `${maj}.${Number(min) + 1}`;
  }
  await save({ termsText, termsVersion });
  return { ok: `S&K disimpan (versi ${termsVersion}).` };
});

export const savePermissionsAction = safeAction(async (fd) => {
  const user = await requireUser("pengaturan");
  if (user.role !== "pemilik") throw new BizError("Hanya pemilik yang boleh mengubah hak akses.");
  const keys = MENUS.map((m) => m.key);
  await db.transaction(async (tx) => {
    await tx.delete(schema.rolePermissions).run();
    for (const role of ["kasir", "staf"] as const) {
      const menus = new Set<MenuKey>(["dasbor"]);
      for (const k of keys) if (fd.get(`${role}:${k}`) === "on") menus.add(k);
      for (const menu of menus) await tx.insert(schema.rolePermissions).values({ role, menu }).run();
    }
  });
  revalidatePath("/", "layout");
  return { ok: "Hak akses disimpan." };
});
