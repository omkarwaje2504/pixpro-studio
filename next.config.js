/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";
const nextConfig = {
  reactStrictMode: false,
  output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
    domains: ["pixpro.s3.ap-south-1.amazonaws.com"],
  },
};

export default withSentryConfig(nextConfig, {
  org: "sai-ashirwad-informatia",
  project: "studio-pixpro",
  env: {
    SENTRY_AUTH_TOKEN: "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",
  },
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});