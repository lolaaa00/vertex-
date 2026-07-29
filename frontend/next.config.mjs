/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config) => {
    // @coinbase/cdp-sdk (pulled in transitively via wagmi's Coinbase
    // connector -> @base-org/account) optionally imports @x402/* packages
    // that are not installed and not needed for wallet connect/disconnect,
    // balance, or SIWE flows used in this app. Treat them as no-ops so the
    // bundler doesn't fail resolving them.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/evm/upto/client": false,
      "@x402/evm/exact/client": false,
      "@x402/core/client": false,
      "@x402/svm/exact/client": false,
      "@x402/evm": false,
    };
    return config;
  },
};

export default nextConfig;
