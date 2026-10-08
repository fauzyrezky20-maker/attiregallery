/** Ubah nomor telepon toko (08…/+62…/62…) menjadi format wa.me (62…). */
export function waNumber(phone: string | null | undefined) {
  let d = (phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d.length >= 9 ? d : null;
}

/** Tautan WhatsApp ke toko dengan pesan yang sudah terisi; null bila nomor toko belum diisi. */
export function waLink(phone: string | null | undefined, text: string) {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
