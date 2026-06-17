import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const nextConfig: NextConfig = {
  output: "standalone",
  // A parent C:\dev\package-lock.json must not expand tracing outside this app.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
