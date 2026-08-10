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

  // Force-include files that pdf-to-img and pdfjs-dist require at runtime
  // via dynamic require() calls that Next.js bundler cannot statically detect.
  // Without this, Vercel deploys will fail with:
  //   "Cannot find module pdfjs-dist/package.json"
  outputFileTracingIncludes: {
    "/api/beta/scan": [
      "./node_modules/pdfjs-dist/package.json",
      "./node_modules/pdfjs-dist/build/**",
      "./node_modules/pdfjs-dist/legacy/**",
      "./node_modules/pdf-to-img/**",
      "./node_modules/@napi-rs/canvas/**",
    ],
  },

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
export default withSentryConfig(nextConfig, {
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,

  errorHandler: (err, invokeErr, compilation) => {
    compilation.warnings.push("Sentry CLI: " + err.message);
  },
});
