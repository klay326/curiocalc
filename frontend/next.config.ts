import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // enables minimal Docker image for prod
};

export default nextConfig;
