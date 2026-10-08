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
  const instagram = str(fd.get("instagram"))?.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") ?? null;
  await save({ storeName, address: str(fd.get("address")), phone: str(fd.get("phone")), instagram, ...(logoUrl ? { logoUrl } : {}) });
  return { ok: "Profil toko disimpan." };
});

export const saveRulesAction = safeAction(async (fd) => {
  await save({
    defaultRentDays: Math.max(1, toInt(fd.get("defaultRentDays"), 3)),
    dpAmount: Math.max(0, toInt(fd.get("dpAmount"), 200000)),
    settleDaysBefore: Math.min(30, Math.max(0, toInt(fd.get("settleDaysBefore"), 3))),
    pickupFrom: time(fd.get("pickupFrom"), "16:00"),
    pickupUntil: time(fd.get("pickupUntil"), "20:00"),
    lowStockThreshold: Math.max(0, toInt(fd.get("lowStockThreshold"), 1)),
  });
  return { ok: "Aturan sewa & denda disimpan." };
});

const time = (v: FormDataEntryValue | null, fallback: string) => {
  const s = typeof v === "string" ? v.trim().slice(0, 5) : "";
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : fallback;
};

export const saveGuideAction = safeAction(async (fd) => {
  await save({ rentalGuide: str(fd.get("rentalGuide")) });
  return { ok: "Tata cara sewa disimpan." };
});

export const saveSavingsAction = safeAction(async (fd) => {
  const mbankingUrl = str(fd.get("mbankingUrl"));
  if (mbankingUrl && !/^https?:\/\//.test(mbankingUrl)) throw new BizError("Link m-banking harus diawali https://");
  await save({ savingsAccount: str(fd.get("savingsAccount")), mbankingUrl });
  return { ok: "Info tabungan disimpan." };
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
