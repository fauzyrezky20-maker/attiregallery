/**
 * Isi database dengan data contoh untuk mencoba aplikasi.
 *   npm run db:seed            → hanya bila database masih kosong
 *   npm run db:seed -- --reset → hapus semua data lalu isi ulang
 */
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { db, schema as s } from "../src/db";
import { DEFAULT_PERMISSIONS } from "../src/lib/permissions";

const DEFAULT_TERMS = `1. Penyewa wajib menunjukkan identitas (KTP/SIM) saat mengambil kebaya.
2. Lama sewa dihitung sejak tanggal ambil sampai tanggal kembali yang tertera di nota.
3. Keterlambatan pengembalian dikenakan denda per hari sesuai ketentuan toko.
4. Kerusakan, noda permanen, atau kehilangan menjadi tanggung jawab penyewa dan diganti sesuai penilaian toko.
5. Penyewa dilarang mengubah ukuran (memotong/menjahit) kebaya tanpa izin toko.
6. Uang sewa yang sudah dibayar tidak dapat dikembalikan bila pesanan dibatalkan kurang dari 2 hari sebelum tanggal ambil.`;

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const addDays = (d: string, n: number) => {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const at = (d: string, hh: number, mm = 0) => new Date(`${d}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+07:00`);
const days = (a: string, b: string) => Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 86400000));

async function main() {
  const reset = process.argv.includes("--reset");
  const existing = await db.select({ n: sql<number>`count(*)` }).from(s.users).get();
  if (existing && existing.n > 0 && !reset) {
    console.log("Database sudah berisi data. Jalankan dengan --reset untuk mengisi ulang.");
    return;
  }
  const tables = [s.storeSavings, s.attendances, s.termsConsents, s.depositTransactions, s.customerDeposits, s.fittingSchedules, s.measurements, s.payments,
    s.orderItems, s.orders, s.productPhotos, s.products, s.expenses, s.employees, s.customers, s.rolePermissions, s.sessions, s.accounts,
    s.verifications, s.users, s.storeSettings];
  for (const t of tables) await db.delete(t).run();

  await db.insert(s.storeSettings).values({
    storeName: "AttireGallery", address: "Jl. Melati No. 12, Yogyakarta", phone: "0812-3456-7890",
    defaultRentDays: 3, termsText: DEFAULT_TERMS, termsVersion: "1.0",
    transferInfo: "BCA 1234567890\na.n. AttireGallery",
    // QRIS contoh (bukan rekening asli) — ganti dengan QRIS toko di Pengaturan.
    qrisPayload: "00020101021126570011ID.DANA.WWW011893600915302259148102090225914810303UMI51440014ID.CO.QRIS.WWW0215ID10200176114730303UMI5204594553033605802ID5913AttireGallery6010Yogyakarta61055511163046A20",
  }).run();

  const pw = await hashPassword("attire123");
  const mkUser = async (name: string, email: string, role: "pemilik" | "kasir" | "staf") => {
    const id = crypto.randomUUID();
    await db.insert(s.users).values({ id, name, email, role, emailVerified: true }).run();
    await db.insert(s.accounts).values({ accountId: id, providerId: "credential", userId: id, password: pw }).run();
    return id;
  };
  const owner = await mkUser("Sekar Ayu", "pemilik@attiregallery.id", "pemilik");
  const kasir = await mkUser("Dewi Lestari", "kasir@attiregallery.id", "kasir");
  const staf = await mkUser("Rina Wulandari", "staf@attiregallery.id", "staf");
  for (const [role, menus] of Object.entries(DEFAULT_PERMISSIONS)) for (const menu of menus) await db.insert(s.rolePermissions).values({ role: role as "kasir", menu }).run();

  const empRows = [
    { userId: owner, name: "Sekar Ayu", position: "Pemilik", phone: "081234567890" },
    { userId: kasir, name: "Dewi Lestari", position: "Kasir", phone: "081298765432" },
    { userId: staf, name: "Rina Wulandari", position: "Staf gudang & fitting", phone: "085711112222" },
    { userId: null, name: "Bu Tari", position: "Penjahit", phone: "081355556666" },
  ];
  const emps: (typeof s.employees.$inferSelect)[] = [];
  for (const e of empRows) emps.push(await db.insert(s.employees).values(e).returning().get());

  const prodFns = [
    ["Kebaya Kutubaru Merah Marun", "Kebaya Kutubaru", 85000, 3],
    ["Kebaya Kutubaru Hijau Botol", "Kebaya Kutubaru", 85000, 2],
    ["Kebaya Kartini Putih Gading", "Kebaya Kartini", 120000, 2],
    ["Kebaya Encim Bordir Biru", "Kebaya Encim", 75000, 3],
    ["Kebaya Modern Brokat Sage", "Kebaya Modern", 150000, 2],
    ["Kebaya Modern Payet Rose Gold", "Kebaya Modern", 200000, 1],
    ["Kebaya Wisuda Lilac", "Kebaya Wisuda", 95000, 4],
    ["Kebaya Akad Putih Panjang", "Kebaya Pengantin", 450000, 1],
    ["Kebaya Bali Kuning Kunyit", "Kebaya Bali", 70000, 3],
    ["Kebaya Janggan Hitam Beludru", "Kebaya Janggan", 130000, 1],
  ].map(([name, category, price, stock]) =>
    () => db.insert(s.products).values({ name: name as string, category: category as string, pricePerDay: price as number, stockTotal: stock as number, stockAvailable: stock as number }).returning().get());
  const prods: (typeof s.products.$inferSelect)[] = [];
  for (const f of prodFns) prods.push(await f());

  const custRows = [
    ["Anisa Rahmawati", "081211110001", "Jl. Kaliurang Km 5"],
    ["Putri Maharani", "081211110002", "Jl. Magelang No. 40"],
    ["Laras Kinanti", "081211110003", "Sleman"],
    ["Citra Pratiwi", "081211110004", "Bantul"],
    ["Nadia Safitri", "081211110005", "Jl. Gejayan 21"],
    ["Ayu Puspitasari", "081211110006", "Kotagede"],
    ["Wulan Sari", "081211110007", "Jl. Parangtritis Km 3"],
    ["Fitri Handayani", "081211110008", "Godean"],
  ];
  const custs: (typeof s.customers.$inferSelect)[] = [];
  for (const [name, phone, address] of custRows) custs.push(await db.insert(s.customers).values({ name, phone, address }).returning().get());

  type Plan = { c: number; items: [number, number][]; start: number; len: number; status: "baru" | "disewa" | "selesai" | "dibatalkan"; pay: ("tunai" | "qris" | "transfer")[]; discount?: number; lateBy?: number; pending?: boolean };
  const plans: Plan[] = [
    { c: 0, items: [[0, 1]], start: -13, len: 3, status: "selesai", pay: ["tunai"] },
    { c: 1, items: [[2, 1], [6, 1]], start: -12, len: 2, status: "selesai", pay: ["qris"] },
    { c: 2, items: [[4, 1]], start: -10, len: 3, status: "selesai", pay: ["transfer"], lateBy: 2 },
    { c: 3, items: [[6, 2]], start: -9, len: 2, status: "selesai", pay: ["tunai"], discount: 20000 },
    { c: 4, items: [[7, 1]], start: -8, len: 2, status: "selesai", pay: ["transfer", "tunai"] },
    { c: 5, items: [[8, 2]], start: -6, len: 3, status: "selesai", pay: ["qris"] },
    { c: 6, items: [[3, 1]], start: -5, len: 3, status: "selesai", pay: ["tunai"] },
    { c: 7, items: [[1, 1], [9, 1]], start: -4, len: 3, status: "disewa", pay: ["qris"] },
    { c: 0, items: [[5, 1]], start: -3, len: 2, status: "disewa", pay: ["transfer"] },
    { c: 2, items: [[6, 1]], start: -2, len: 2, status: "disewa", pay: ["tunai"] },
    { c: 1, items: [[0, 2]], start: -1, len: 3, status: "disewa", pay: ["tunai"] },
    { c: 3, items: [[4, 1]], start: 0, len: 3, status: "baru", pay: ["qris"], pending: true },
    { c: 4, items: [[2, 1]], start: 1, len: 2, status: "baru", pay: ["transfer"], pending: true },
    { c: 5, items: [[7, 1]], start: 3, len: 2, status: "baru", pay: [] },
    { c: 6, items: [[3, 2]], start: 5, len: 3, status: "baru", pay: ["tunai"] },
    { c: 7, items: [[8, 1]], start: -7, len: 2, status: "dibatalkan", pay: [] },
  ];

  for (const p of plans) {
    const start = addDays(today, p.start);
    const end = addDays(start, p.len);
    const lines = p.items.map(([pi, q]) => ({ productId: prods[pi].id, quantity: q, price: prods[pi].pricePerDay }));
    const sub = lines.reduce((t, l) => t + l.price * l.quantity * days(start, end), 0);
    const fine = p.lateBy ? p.lateBy * 50000 : 0;
    const discount = p.discount ?? 0;
    const total = sub - discount + fine;
    const created = at(addDays(start, -2) < addDays(today, -14) ? addDays(today, -14) : addDays(start, p.start > 0 ? -p.start : -1), 10);
    const o = await db.insert(s.orders).values({
      customerId: custs[p.c].id, userId: kasir, status: p.status, rentalStart: start, rentalEnd: end, discount, fine, totalAmount: total,
      returnedAt: p.status === "selesai" ? addDays(end, p.lateBy ?? 0) : null, createdAt: created,
    }).returning().get();
    for (const l of lines) await db.insert(s.orderItems).values({ ...l, orderId: o.id }).run();
    await db.insert(s.termsConsents).values({ orderId: o.id, customerId: custs[p.c].id, termsVersion: "1.0", agreedAt: created }).run();
    if (p.status === "disewa") for (const l of lines) await db.update(s.products).set({ stockAvailable: sql`${s.products.stockAvailable} - ${l.quantity}` }).where(sql`${s.products.id} = ${l.productId}`).run();
    for (const [i, method] of p.pay.entries()) {
      const amount = p.pay.length === 1 ? total : i === 0 ? Math.round(total / 2) : total - Math.round(total / 2);
      const paidDay = i === 0 ? (p.start > 0 ? today : start) : end;
      const paidAt = paidDay > today ? at(today, 11) : at(paidDay, 10 + i * 5, 15);
      await db.insert(s.payments).values({
        orderId: o.id, method, amount, status: p.pending ? "pending" : "lunas", paidAt: p.pending ? null : paidAt, createdAt: paidAt,
      }).run();
    }
  }
  for (const p of prods) {
    const r = (await db.select().from(s.products).where(sql`${s.products.id} = ${p.id}`).get())!;
    if (r.stockAvailable <= 0) await db.update(s.products).set({ status: "disewa" }).where(sql`${s.products.id} = ${p.id}`).run();
  }
  await db.update(s.products).set({ status: "perawatan" }).where(sql`${s.products.id} = ${prods[9].id}`).run();

  const expenses: [number, string, number, string][] = [
    [-13, "Laundry & perawatan", 150000, "Dry clean 6 kebaya"], [-10, "Listrik & air", 420000, "Tagihan bulanan"],
    [-7, "Perbaikan/jahit", 85000, "Ganti kancing & resleting"], [-5, "Promosi", 200000, "Iklan Instagram"],
    [-3, "Laundry & perawatan", 120000, "Dry clean 4 kebaya"], [-1, "Lain-lain", 45000, "Plastik & hanger"], [0, "Laundry & perawatan", 60000, "Setrika uap"],
  ];
  for (const [d, category, amount, note] of expenses) await db.insert(s.expenses).values({ date: addDays(today, d), category, amount, note }).run();

  await db.insert(s.measurements).values([
    { customerId: custs[3].id, chest: 86, waist: 68, hip: 92, shoulder: 37, sleeve: 56, length: 62, notes: "Suka potongan agak longgar di pinggang", measuredAt: at(addDays(today, -3), 14) },
    { customerId: custs[4].id, chest: 90, waist: 72, hip: 96, shoulder: 38, sleeve: 57, length: 64, measuredAt: at(addDays(today, -2), 15) },
    { customerId: custs[0].id, chest: 84, waist: 66, hip: 90, shoulder: 36, sleeve: 55, length: 60, measuredAt: at(addDays(today, -20), 13) },
  ]).run();
  await db.insert(s.fittingSchedules).values([
    { customerId: custs[3].id, scheduledAt: at(today, 13, 30), notes: "Fitting kebaya modern brokat sage" },
    { customerId: custs[4].id, scheduledAt: at(today, 16), notes: "Coba kebaya Kartini" },
    { customerId: custs[5].id, scheduledAt: at(addDays(today, 2), 10), notes: "Fitting kebaya akad" },
    { customerId: custs[0].id, scheduledAt: at(addDays(today, -15), 11), status: "selesai" },
  ]).run();

  for (const [ci, setor, pakai] of [[0, 500000, 0], [3, 300000, 100000], [6, 250000, 0]] as const) {
    await db.insert(s.customerDeposits).values({ customerId: custs[ci].id, balance: setor - pakai }).run();
    await db.insert(s.depositTransactions).values({ customerId: custs[ci].id, type: "setor", amount: setor, note: "Setoran tabungan", createdAt: at(addDays(today, -9), 12) }).run();
    if (pakai) await db.insert(s.depositTransactions).values({ customerId: custs[ci].id, type: "pakai", amount: pakai, note: "Tarik tunai", createdAt: at(addDays(today, -4), 12) }).run();
  }

  for (let d = -6; d <= 0; d++) {
    const date = addDays(today, d);
    for (const [i, e] of emps.entries()) {
      if (d === 0 && i > 1) continue;
      const status = i === 2 && d === -3 ? "sakit" : i === 3 && d === -5 ? "izin" : "hadir";
      await db.insert(s.attendances).values({
        employeeId: e.id, date, status,
        checkIn: status === "hadir" ? at(date, 8, 45 + i * 3) : null,
        checkOut: status === "hadir" && d < 0 ? at(date, 17, 5 + i * 4) : null,
      }).run();
    }
  }

  console.log("✅ Data contoh dibuat. Login: pemilik@attiregallery.id / kasir@attiregallery.id / staf@attiregallery.id — sandi: attire123");
}

main();
