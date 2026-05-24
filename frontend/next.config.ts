import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["curiocalc.org", "www.curiocalc.org"],
};

export default nextConfig;
