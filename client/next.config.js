/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // The project lives inside OneDrive, which syncs/locks files in .next/cache
    // and corrupts webpack's persistent pack files (ENOENT *.pack.gz).
    // Use an in-memory cache in dev to sidestep that entirely.
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
};

module.exports = nextConfig;
