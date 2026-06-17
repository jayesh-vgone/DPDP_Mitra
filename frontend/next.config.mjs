/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-markdown and remark-gfm are ESM-only; transpile them for Next.js bundler
  transpilePackages: ['react-markdown', 'remark-gfm'],
};

export default nextConfig;
