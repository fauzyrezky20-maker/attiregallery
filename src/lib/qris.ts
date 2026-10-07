/**
 * Utilitas QRIS (standar EMVCo MPM).
 * Pemilik menyimpan string QRIS statis dari bank/penyedia; aplikasi membuat QRIS dinamis
 * dengan nominal tagihan agar pelanggan tidak perlu mengetik jumlah.
 */

type TLV = { tag: string; value: string };

export function parseTLV(payload: string): TLV[] {
  const out: TLV[] = [];
  let i = 0;
  while (i < payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isFinite(len)) throw new Error("Format QRIS tidak valid");
    const value = payload.slice(i + 4, i + 4 + len);
    if (value.length !== len) throw new Error("Format QRIS tidak valid");
    out.push({ tag, value });
    i += 4 + len;
  }
  return out;
}

const enc = ({ tag, value }: TLV) => tag + String(value.length).padStart(2, "0") + value;

export function crc16(str: string) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function isValidQris(payload: string) {
  try {
    const p = payload.trim();
    const body = p.slice(0, -4);
    return parseTLV(p).some((t) => t.tag === "63") && crc16(body) === p.slice(-4).toUpperCase();
  } catch {
    return false;
  }
}

/** Buat QRIS dinamis bernominal dari QRIS statis. */
export function makeDynamicQris(staticPayload: string, amount: number) {
  const tlvs = parseTLV(staticPayload.trim()).filter((t) => t.tag !== "63" && t.tag !== "54");
  const poi = tlvs.find((t) => t.tag === "01");
  if (poi) poi.value = "12";
  const amountTlv: TLV = { tag: "54", value: String(Math.round(amount)) };
  const idx = tlvs.findIndex((t) => Number(t.tag) > 54);
  if (idx === -1) tlvs.push(amountTlv);
  else tlvs.splice(idx, 0, amountTlv);
  const body = tlvs.map(enc).join("") + "6304";
  return body + crc16(body);
}
