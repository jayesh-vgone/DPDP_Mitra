/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-markdown and remark-gfm are ESM-only; transpile them for Next.js bundler
  transpilePackages: ['react-markdown', 'remark-gfm'],
  experimental: {
    // Rewrites barrel imports into per-icon deep imports at compile time,
    // avoiding full-package resolution on every HMR invalidation.
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
