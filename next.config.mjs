/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["tesseract.js", "tesseract.js-core", "sharp", "pdf-parse"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
