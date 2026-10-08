/** Koleksi dari "Katalog Kebaya" AttireGallery. Harga = sewa per paket 3 hari. Foto ada di /public/koleksi. */
export const KOLEKSI_KEBAYA: { name: string; category: string; price: number; photo: string }[] = [
  ...([["Shopia", 200000, "shopia"], ["Celestine Biru", 200000, "celestine-biru"], ["Celestine Putih", 250000, "celestine-putih"], ["Rose Royale", 250000, "rose-royale"]] as const)
    .map(([name, price, slug]) => ({ name, category: "Kebaya Regular", price, photo: `/koleksi/${slug}.jpg` })),
  ...([
    ["Nayara", 380000, "nayara"], ["Amara", 400000, "amara"], ["Serena", 350000, "serena"], ["Isabella", 400000, "isabella"],
    ["Lavelle", 300000, "lavelle"], ["Violette", 300000, "violette"], ["Elora", 350000, "elora"], ["Safara", 350000, "safara"],
    ["Sakura Magenta", 300000, "sakura-magenta"], ["Adeline", 400000, "adeline"], ["Arumi", 300000, "arumi"], ["Asmara", 400000, "asmara"],
    ["Veloura", 350000, "veloura"], ["Angeline", 400000, "angeline"], ["Lunella", 300000, "lunella"], ["Virelle", 350000, "virelle"], ["Amoura", 400000, "amoura"],
  ] as const).map(([name, price, slug]) => ({ name, category: "Kebaya Premium", price, photo: `/koleksi/${slug}.jpg` })),
];

/** Daftar harga lain di katalog ("start from"). */
export const KOLEKSI_LAIN: { name: string; category: string; price: number }[] = [
  { name: "Dress", category: "Dress", price: 80000 },
  { name: "Baju Bodo Regular", category: "Baju Bodo", price: 80000 },
  { name: "Baju Bodo Premium", category: "Baju Bodo", price: 100000 },
  { name: "Jas Tutup", category: "Jas", price: 100000 },
  { name: "Royal Package", category: "Paket", price: 700000 },
  { name: "Luxury Package", category: "Paket", price: 800000 },
  { name: "Heels Pesta / Wisuda", category: "Aksesoris", price: 70000 },
  { name: "Tas Pesta", category: "Aksesoris", price: 50000 },
  { name: "Aksesoris Baju Bodo", category: "Aksesoris", price: 50000 },
  { name: "Softlens", category: "Aksesoris", price: 50000 },
  { name: "Press-On Nails", category: "Aksesoris", price: 75000 },
];
