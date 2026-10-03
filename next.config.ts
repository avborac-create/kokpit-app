import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Excel ile masraf aktarimi (.xlsx) icin server action govde siniri
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
