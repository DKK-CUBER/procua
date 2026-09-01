/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lucide-react', 'motion', 'motion-dom', 'motion-utils'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion']
  }
};

export default nextConfig;
