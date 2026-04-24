import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: [
        'fhgwmkg6-3000.asse.devtunnels.ms', // Masukkan URL tunnel dari error log tadi
        'localhost:3000'
      ],
      bodySizeLimit: '10mb', // Ini untuk mengatasi error ukuran gambar
    },
  },
};

export default nextConfig;