import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@darzi/shared"],
  turbopack: {
    root: path.resolve(process.cwd(), "../..")
  }
};

export default nextConfig;
