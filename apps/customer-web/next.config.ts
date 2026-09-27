import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@darzi/shared"],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"]
    };
    return config;
  },
  turbopack: {
    root: path.resolve(process.cwd(), "../..")
  }
};

export default nextConfig;
