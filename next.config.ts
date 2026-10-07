import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Foto sudah diperkecil di browser sebelum dikirim; batas ini untuk cadangan (PDF bukti bayar, dll.).
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
