import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      // Match the 25MB per-file upload cap in app/dashboard/actions.ts,
      // with margin for FormData boundary overhead.
      bodySizeLimit: "30mb",
    },
  },
}

export default nextConfig
