import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "olkwweizloegbbqwbkrq.supabase.co",
      },
    ],
  },
};

export default nextConfig;
