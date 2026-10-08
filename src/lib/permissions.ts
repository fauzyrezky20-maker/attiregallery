import type { Role } from "@/db/schema";

export const MENUS = [
  { key: "dasbor", label: "Dasbor", href: "/" },
  { key: "pesanan", label: "Pesanan", href: "/pesanan" },
  { key: "kasir", label: "Kasir", href: "/kasir" },
  { key: "pelanggan", label: "Pelanggan", href: "/pelanggan" },
  { key: "fitting", label: "Jadwal Fitting", href: "/fitting" },
  { key: "produk", label: "Produk & Foto", href: "/produk" },
  { key: "pembayaran", label: "Pembayaran", href: "/pembayaran" },
  { key: "tabungan", label: "Tabungan Toko", href: "/tabungan" },
  { key: "laporan", label: "Laporan Keuangan", href: "/laporan" },
  { key: "karyawan", label: "Karyawan", href: "/karyawan" },
  { key: "absensi", label: "Absensi", href: "/absensi" },
  { key: "pengaturan", label: "Pengaturan Toko", href: "/pengaturan" },
] as const;

export type MenuKey = (typeof MENUS)[number]["key"];

export const DEFAULT_PERMISSIONS: Record<Exclude<Role, "pemilik">, MenuKey[]> = {
  kasir: ["dasbor", "pesanan", "kasir", "pelanggan", "fitting", "produk", "pembayaran", "absensi"],
  staf: ["dasbor", "pesanan", "pelanggan", "fitting", "produk", "absensi"],
};

export const ROLE_LABEL: Record<Role, string> = { pemilik: "Pemilik", kasir: "Kasir", staf: "Staf" };
