import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// Run `ANALYZE=true npm run build` to inspect bundle composition.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
};

export default withBundleAnalyzer(nextConfig);
