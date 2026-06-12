/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      '@libp2p/webrtc': './lib/empty-module.js',
      '@ipshipyard/node-datachannel': './lib/empty-module.js',
    },
  },
};

export default nextConfig;
