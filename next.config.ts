import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
