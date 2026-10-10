import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

/**
 * Catatan tipe data:
 * - ID memakai UUID (teks).
 * - Nominal uang (Desimal di PRD) disimpan sebagai INTEGER rupiah agar perhitungan tidak
 *   terkena pembulatan float. Ukuran badan (cm) disimpan sebagai REAL.
 * - Tanggal (tanpa jam) disimpan sebagai teks "YYYY-MM-DD"; Timestamp sebagai epoch ms.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$defaultFn(() => new Date());
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const ROLES = ["pemilik", "kasir", "staf"] as const;
export type Role = (typeof ROLES)[number];

// ───────────── Akun & autentikasi (dipakai Better Auth) ─────────────

/** users — akun pengguna aplikasi. Kata sandi (password_hash) disimpan Better Auth di tabel accounts. */
export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role").$type<Role>().notNull().default("staf"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = sqliteTable("sessions", {
  id: id(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = sqliteTable("accounts", {
  id: id(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  /** password_hash */
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verifications = sqliteTable("verifications", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Hak akses menu per peran (diatur pemilik di Pengaturan → Peran & Hak Akses). */
export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: id(),
    role: text("role").$type<Role>().notNull(),
    menu: text("menu").notNull(),
  },
  (t) => [uniqueIndex("role_menu_uq").on(t.role, t.menu)],
);

// ───────────── Data toko ─────────────

export const customers = sqliteTable("customers", {
  id: id(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  /** Jenis acara (mis. Wisuda, Pernikahan) */
  eventType: text("event_type"),
  /** Asal kampus (untuk sewa wisuda) */
  campus: text("campus"),
  createdAt: createdAt(),
});

export const PRODUCT_STATUS = ["tersedia", "disewa", "perawatan"] as const;
export const products = sqliteTable("products", {
  id: id(),
  name: text("name").notNull(),
  category: text("category"),
  pricePerDay: integer("price_per_day").notNull().default(0),
  stockTotal: integer("stock_total").notNull().default(1),
  stockAvailable: integer("stock_available").notNull().default(1),
  status: text("status").$type<(typeof PRODUCT_STATUS)[number]>().notNull().default("tersedia"),
  createdAt: createdAt(),
});

export const productPhotos = sqliteTable("product_photos", {
  id: id(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const ORDER_STATUS = ["baru", "disewa", "selesai", "dibatalkan"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];
export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    userId: text("user_id").references(() => users.id),
    status: text("status").$type<OrderStatus>().notNull().default("baru"),
    rentalStart: text("rental_start").notNull(),
    rentalEnd: text("rental_end").notNull(),
    /** Tanggal kebaya benar-benar dikembalikan (untuk hitung denda). */
    returnedAt: text("returned_at"),
    /** Total akhir = subtotal − diskon + denda */
    totalAmount: integer("total_amount").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    fine: integer("fine").notNull().default(0),
    /** Jam pengambilan (HH:MM), dalam rentang jam ambil toko */
    pickupTime: text("pickup_time"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_dates_idx").on(t.rentalStart, t.rentalEnd)],
);

export const orderItems = sqliteTable("order_items", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  /** Harga sewa per paket (lama sewa standar toko) saat transaksi */
  price: integer("price").notNull(),
});

export const PAYMENT_METHODS = ["tunai", "qris", "transfer", "tabungan"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_STATUS = ["pending", "lunas", "gagal"] as const;
export const payments = sqliteTable("payments", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: text("method").$type<PaymentMethod>().notNull(),
  amount: integer("amount").notNull(),
  status: text("status").$type<(typeof PAYMENT_STATUS)[number]>().notNull().default("pending"),
  proofUrl: text("proof_url"),
  note: text("note"),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const expenses = sqliteTable("expenses", {
  id: id(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  note: text("note"),
  date: text("date").notNull(),
  createdAt: createdAt(),
});

/** Pemasukan yang dicatat manual (mis. data lama sebelum aplikasi dipakai), di luar pembayaran pesanan. */
export const incomes = sqliteTable(
  "incomes",
  {
    id: id(),
    date: text("date").notNull(),
    amount: integer("amount").notNull(),
    method: text("method").$type<PaymentMethod>().notNull().default("tunai"),
    category: text("category").notNull().default("Sewa"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("incomes_date_idx").on(t.date)],
);

export const employees = sqliteTable("employees", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  position: text("position"),
  phone: text("phone"),
  status: text("status").$type<"aktif" | "tidak aktif">().notNull().default("aktif"),
  createdAt: createdAt(),
});

export const measurements = sqliteTable("measurements", {
  id: id(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
  chest: real("chest"),
  waist: real("waist"),
  hip: real("hip"),
  shoulder: real("shoulder"),
  sleeve: real("sleeve"),
  length: real("length"),
  thigh: real("thigh"),
  knee: real("knee"),
  notes: text("notes"),
  measuredAt: integer("measured_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const FITTING_STATUS = ["terjadwal", "selesai", "batal"] as const;
export const fittingSchedules = sqliteTable("fitting_schedules", {
  id: id(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
  scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status").$type<(typeof FITTING_STATUS)[number]>().notNull().default("terjadwal"),
  notes: text("notes"),
  /** Foto konsumen saat fitting */
  photoUrl: text("photo_url"),
  createdAt: createdAt(),
});

export const customerDeposits = sqliteTable("customer_deposits", {
  id: id(),
  customerId: text("customer_id")
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  updatedAt: updatedAt(),
});

export const depositTransactions = sqliteTable("deposit_transactions", {
  id: id(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
  type: text("type").$type<"setor" | "pakai">().notNull(),
  amount: integer("amount").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

export const ATTENDANCE_STATUS = ["hadir", "izin", "sakit", "cuti", "tanpa keterangan"] as const;
export const attendances = sqliteTable(
  "attendances",
  {
    id: id(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    checkIn: integer("check_in", { mode: "timestamp_ms" }),
    checkOut: integer("check_out", { mode: "timestamp_ms" }),
    status: text("status").$type<(typeof ATTENDANCE_STATUS)[number]>().notNull().default("hadir"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("attendance_emp_date_uq").on(t.employeeId, t.date)],
);

export const termsConsents = sqliteTable("terms_consents", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  termsVersion: text("terms_version").notNull(),
  agreedAt: integer("agreed_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const storeSettings = sqliteTable("store_settings", {
  id: id(),
  storeName: text("store_name").notNull().default("AttireGallery"),
  address: text("address"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  defaultRentDays: integer("default_rent_days").notNull().default(3),
  finePerDay: integer("fine_per_day").notNull().default(50000),
  qrisEnabled: integer("qris_enabled", { mode: "boolean" }).notNull().default(true),
  /** String QRIS statis dari bank/penyedia; aplikasi menyisipkan nominal agar jadi QRIS dinamis. */
  qrisPayload: text("qris_payload"),
  transferEnabled: integer("transfer_enabled", { mode: "boolean" }).notNull().default(true),
  transferInfo: text("transfer_info"),
  cashEnabled: integer("cash_enabled", { mode: "boolean" }).notNull().default(true),
  /** Notifikasi: pengingat H-n untuk ambil/kembali & tagihan belum lunas */
  notifyPickup: integer("notify_pickup", { mode: "boolean" }).notNull().default(true),
  notifyReturn: integer("notify_return", { mode: "boolean" }).notNull().default(true),
  notifyPayment: integer("notify_payment", { mode: "boolean" }).notNull().default(true),
  reminderDaysBefore: integer("reminder_days_before").notNull().default(1),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(1),
  termsText: text("terms_text"),
  termsVersion: text("terms_version").notNull().default("1.0"),
  /** Tata cara sewa (tampil di Kasir & katalog) */
  rentalGuide: text("rental_guide"),
  /** DP minimal untuk fix booking */
  dpAmount: integer("dp_amount").notNull().default(200000),
  /** Pelunasan paling lambat H-n sebelum tanggal ambil */
  settleDaysBefore: integer("settle_days_before").notNull().default(3),
  /** Jam pengambilan, mis. "16:00"–"20:00" */
  pickupFrom: text("pickup_from").notNull().default("16:00"),
  pickupUntil: text("pickup_until").notNull().default("20:00"),
  instagram: text("instagram"),
  /** Rekening tujuan tabungan toko & tautan aplikasi m-banking */
  savingsAccount: text("savings_account"),
  mbankingUrl: text("mbanking_url"),
  updatedAt: updatedAt(),
});

/** Tabungan toko: setoran bulanan ke rekening bank toko. */
export const storeSavings = sqliteTable(
  "store_savings",
  {
    id: id(),
    date: text("date").notNull(),
    amount: integer("amount").notNull(),
    account: text("account"),
    note: text("note"),
    proofUrl: text("proof_url"),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("store_savings_date_idx").on(t.date)],
);
