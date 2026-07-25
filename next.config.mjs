/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // If you are deploying to https://vikasyadavnsit.github.io/ , you don't need basePath.
  // If it was vikasyadavnsit.github.io/repo-name, you would need it.
  turbopack: {},
  // Allow the Next.js dev server to be accessed through cloudflared quick tunnels,
  // whose hostname is random each run.
  allowedDevOrigins: ['*.trycloudflare.com'],
};

export default nextConfig;
