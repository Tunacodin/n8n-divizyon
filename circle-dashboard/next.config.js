/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
  env: {
    N8N_API_URL: process.env.N8N_API_URL,
    N8N_API_KEY: process.env.N8N_API_KEY,
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
  }
}

module.exports = nextConfig
