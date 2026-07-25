/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Google Identity Services opens a popup and posts the credential back to this
  // window. The browser's default COOP blocks that postMessage, so opt into the
  // one value GSI needs — strict enough to isolate us from unrelated origins,
  // loose enough to keep the opener reference for popups we open ourselves.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
      },
    ];
  },
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
