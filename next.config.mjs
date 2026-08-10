import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Keep these packages as native Node modules (do not let Turbopack/webpack bundle them).
  // Required for pdf-to-img (uses pdfjs-dist worker) and native binaries (sharp, tesseract, canvas).
  serverExternalPackages: [
    "pdf-to-img",
    "pdfjs-dist",
    "@napi-rs/canvas",
    "canvas",
    "tesseract.js",
    "sharp",
  ],

  turbopack: {},

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
      "@runtime": path.resolve(__dirname, "src/runtime"),
    };
    return config;
  },
};

// Wrap the Next config with Sentry.
// - silent: true         => do not spam the console on every build
// - hideSourceMaps: true => source maps are uploaded to Sentry but stripped from the client bundle
// - disableLogger: true  => strip Sentry SDK debug logging in production bundles
export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,

  // Do not fail the build if Sentry auth is missing (e.g. local dev without SENTRY_AUTH_TOKEN).
  // Source map upload will simply be skipped.
  errorHandler: (err, invokeErr, compilation) => {
    compilation.warnings.push("Sentry CLI: " + err.message);
  },
});
